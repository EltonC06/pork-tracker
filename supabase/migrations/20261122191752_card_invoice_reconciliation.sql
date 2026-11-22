-- Additive: preserves all bank transactions and manual balance snapshots.
begin;

alter table public.transactions add constraint transactions_id_owner_unique unique (id, user_id);

create table public.card_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_label text not null check (length(trim(card_label)) between 1 and 80),
  card_last_four text not null check (card_last_four ~ '^[0-9]{4}$'),
  due_date date not null,
  total_cents bigint not null check (total_cents >= 0 and total_cents <= 99999999999),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, card_last_four, due_date)
);

create table public.card_invoice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null,
  position integer not null check (position > 0),
  date date not null,
  description text not null check (length(trim(description)) between 1 and 500),
  card_last_four text not null check (card_last_four ~ '^[0-9]{4}$'),
  amount_cents bigint not null check (amount_cents <> 0 and abs(amount_cents) <= 99999999999),
  category text not null check (length(category) <= 100),
  installment integer,
  installments integer,
  foreign key (invoice_id, user_id) references public.card_invoices(id, user_id) on delete cascade,
  unique (invoice_id, position),
  check ((installment is null and installments is null) or
    (installment is not null and installments is not null and installment between 1 and installments and installments <= 999))
);

create table public.card_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null,
  transaction_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  foreign key (invoice_id, user_id) references public.card_invoices(id, user_id) on delete cascade,
  foreign key (transaction_id, user_id) references public.transactions(id, user_id) on delete restrict,
  unique (invoice_id, transaction_id)
);

create index card_invoice_items_owner_date on public.card_invoice_items(user_id, date);
create index card_invoice_items_invoice_owner on public.card_invoice_items(invoice_id, user_id);
create index card_invoice_payments_invoice_owner on public.card_invoice_payments(invoice_id, user_id);
create index card_invoice_payments_transaction_owner on public.card_invoice_payments(transaction_id, user_id);
create index card_invoice_payments_owner on public.card_invoice_payments(user_id);

alter table public.card_invoices enable row level security;
alter table public.card_invoice_items enable row level security;
alter table public.card_invoice_payments enable row level security;

create policy invoices_owner on public.card_invoices to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy invoice_items_owner on public.card_invoice_items to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy invoice_payments_owner on public.card_invoice_payments to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.card_invoices, public.card_invoice_items, public.card_invoice_payments from public, anon, authenticated;
grant select, insert, delete on public.card_invoices to authenticated;
grant select, insert on public.card_invoice_items to authenticated;
grant update (category) on public.card_invoice_items to authenticated;
grant select, insert, delete on public.card_invoice_payments to authenticated;

-- Deferred checks also protect direct Data API inserts, not only the import RPC.
create function public.check_card_invoice_total() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  invoice_key uuid;
  declared bigint;
  actual bigint;
  item_count bigint;
begin
  if tg_table_name = 'card_invoices' then invoice_key := new.id;
  else invoice_key := new.invoice_id; end if;
  select total_cents into declared from public.card_invoices where id = invoice_key;
  if not found then return null; end if;
  select coalesce(sum(amount_cents), 0), count(*) into actual, item_count
    from public.card_invoice_items where invoice_id = invoice_key;
  if actual <> declared or item_count = 0 then
    raise exception 'A composição da fatura não confere com o total declarado.';
  end if;
  return null;
end;
$$;
create constraint trigger invoice_header_total after insert on public.card_invoices
  deferrable initially deferred for each row execute function public.check_card_invoice_total();
create constraint trigger invoice_items_total after insert on public.card_invoice_items
  deferrable initially deferred for each row execute function public.check_card_invoice_total();
revoke all on function public.check_card_invoice_total() from public, anon, authenticated;

create function public.import_card_invoice(p_invoice jsonb, p_items jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  invoice_key uuid;
  existing_hash text;
  input_hash text := p_invoice->>'content_hash';
begin
  if owner_id is null then raise exception 'Não autenticado.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 5000 then
    raise exception 'Quantidade de itens inválida.';
  end if;
  -- Unique constraint serializes retries/concurrent imports. Never silently replace a bill.
  insert into public.card_invoices(user_id, card_label, card_last_four, due_date, total_cents, content_hash)
    values (owner_id, p_invoice->>'card_label', p_invoice->>'card_last_four',
      (p_invoice->>'due_date')::date, (p_invoice->>'total_cents')::bigint, input_hash)
    on conflict (user_id, card_last_four, due_date) do nothing returning id into invoice_key;
  if invoice_key is null then
    select id, content_hash into invoice_key, existing_hash from public.card_invoices
      where user_id = owner_id and card_last_four = p_invoice->>'card_last_four'
      and due_date = (p_invoice->>'due_date')::date;
    if existing_hash is distinct from input_hash then
      raise exception 'Já existe uma fatura diferente para este cartão e vencimento. Confira a existente antes de substituir.';
    end if;
    return jsonb_build_object('id', invoice_key, 'duplicate', true);
  end if;
  insert into public.card_invoice_items(user_id, invoice_id, position, date, description,
    card_last_four, amount_cents, category, installment, installments)
  select owner_id, invoice_key, ordinality::integer, (item->>'date')::date,
    item->>'description', item->>'card_last_four', (item->>'amount_cents')::bigint,
    coalesce(item->>'category', ''), (item->>'installment')::integer, (item->>'installments')::integer
    from jsonb_array_elements(p_items) with ordinality as rows(item, ordinality);
  return jsonb_build_object('id', invoice_key, 'duplicate', false);
end;
$$;
revoke all on function public.import_card_invoice(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.import_card_invoice(jsonb, jsonb) to authenticated;

create function public.check_card_invoice_payment() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  bank_amount numeric;
  bank_type text;
  bill_amount bigint;
  allocated bigint;
begin
  -- Lock bank entry first, then serialize allocations to the immutable bill header.
  select amount, type into bank_amount, bank_type from public.transactions
    where id = new.transaction_id and user_id = new.user_id for update;
  if not found or bank_type <> 'expense' then raise exception 'Selecione uma despesa da sua conta.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.invoice_id::text, 0));
  select total_cents into bill_amount from public.card_invoices
    where id = new.invoice_id and user_id = new.user_id;
  if not found then raise exception 'Fatura não encontrada.'; end if;
  select coalesce(sum(amount_cents), 0) into allocated from public.card_invoice_payments
    where transaction_id = new.transaction_id;
  if allocated + new.amount_cents > round(bank_amount * 100) then
    raise exception 'Valor vinculado excede o pagamento bancário.';
  end if;
  select coalesce(sum(amount_cents), 0) into allocated from public.card_invoice_payments
    where invoice_id = new.invoice_id;
  if allocated + new.amount_cents > bill_amount then
    raise exception 'Valor vinculado excede o saldo da fatura.';
  end if;
  return new;
end;
$$;
create trigger invoice_payment_capacity before insert on public.card_invoice_payments
  for each row execute function public.check_card_invoice_payment();
revoke all on function public.check_card_invoice_payment() from public, anon, authenticated;

create function public.protect_card_payment_transaction() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare allocated bigint;
begin
  select coalesce(sum(amount_cents), 0) into allocated from public.card_invoice_payments where transaction_id = old.id;
  if allocated > 0 and (new.type <> 'expense' or round(new.amount * 100) < allocated or new.user_id <> old.user_id) then
    raise exception 'Desvincule o pagamento da fatura antes de alterar tipo, proprietário ou reduzir este valor.';
  end if;
  return new;
end;
$$;
create trigger protect_card_payment before update on public.transactions
  for each row execute function public.protect_card_payment_transaction();
revoke all on function public.protect_card_payment_transaction() from public, anon, authenticated;

commit;
