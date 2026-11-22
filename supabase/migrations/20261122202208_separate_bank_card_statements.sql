-- Bank cash flow and card spending are independent. Links remain read-only history.
begin;
alter table public.card_invoices add column statement_month date;
update public.card_invoices i set statement_month = coalesce((
  select date_trunc('month', item.date)::date from public.card_invoice_items item
  where item.invoice_id = i.id group by date_trunc('month', item.date)
  order by count(*) desc, date_trunc('month', item.date) desc limit 1
), date_trunc('month', i.due_date)::date);
alter table public.card_invoices alter column statement_month set not null;
alter table public.card_invoices add constraint invoice_month_start check (extract(day from statement_month) = 1);
create index card_invoices_owner_month on public.card_invoices(user_id, statement_month);
grant update (statement_month) on public.card_invoices to authenticated;
insert into public.expense_categories(user_id, name, is_default)
select id, 'Pagamento de fatura', true from auth.users
on conflict (user_id, normalized_name) do update set active = true;
insert into public.expense_categories(user_id, name)
select distinct on (user_id, lower(btrim(category))) user_id, btrim(category)
from public.card_invoice_items where btrim(category) <> ''
order by user_id, lower(btrim(category))
on conflict (user_id, normalized_name) do nothing;
alter table public.card_invoice_items add column category_id uuid;
alter table public.card_invoice_items add constraint invoice_items_category_owner_fk
  foreign key (category_id, user_id) references public.expense_categories(id, user_id) on delete restrict;
create index invoice_items_category_owner on public.card_invoice_items(category_id, user_id);
alter table public.card_invoice_items drop constraint card_invoice_items_category_check;
alter table public.card_invoice_items add constraint card_invoice_items_category_check check (length(category) <= 120);
update public.card_invoice_items item set category_id = c.id from public.expense_categories c
where item.user_id = c.user_id and lower(btrim(item.category)) = c.normalized_name;
grant update (category_id) on public.card_invoice_items to authenticated;
-- Preserve prior classification without maintaining live payment links.
update public.transactions t set category_id = c.id, category = c.name
from public.expense_categories c where c.user_id = t.user_id and c.normalized_name = 'pagamento de fatura'
and t.type = 'expense' and exists(select 1 from public.card_invoice_payments p where p.transaction_id = t.id and p.user_id = t.user_id);
drop trigger protect_card_payment on public.transactions;
alter table public.card_invoice_payments drop constraint card_invoice_payments_transaction_id_user_id_fkey;
revoke insert, delete on public.card_invoice_payments from authenticated;
create or replace function private.seed_expense_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.expense_categories (user_id, name, is_default)
  select new.id, defaults.name, true
  from (values
    ('Alimentação'), ('Moradia'), ('Transporte'), ('Saúde'),
    ('Educação'), ('Lazer'), ('Compras'), ('Assinaturas'), ('Trabalho'), ('Outros'), ('Pagamento de fatura')
  ) as defaults(name)
  on conflict (user_id, normalized_name) do nothing;
  return new;
end;
$$;
revoke all on function private.seed_expense_categories() from public, anon, authenticated;

create or replace function public.import_card_invoice(p_invoice jsonb, p_items jsonb) returns jsonb
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
  if exists (select 1 from jsonb_array_elements(p_items) item
    where nullif(item->>'category_id', '') is not null and not exists (
      select 1 from public.expense_categories c where c.id = (item->>'category_id')::uuid
      and c.user_id = owner_id and c.active and c.normalized_name <> 'pagamento de fatura')) then
    raise exception 'Selecione categorias ativas para as compras do cartão.';
  end if;
  -- Unique constraint serializes retries/concurrent imports. Never silently replace a bill.
  insert into public.card_invoices(user_id, card_label, card_last_four, due_date, total_cents, content_hash, statement_month)
    values (owner_id, p_invoice->>'card_label', p_invoice->>'card_last_four',
      (p_invoice->>'due_date')::date, (p_invoice->>'total_cents')::bigint, input_hash, (p_invoice->>'statement_month')::date)
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
    card_last_four, amount_cents, category, category_id, installment, installments)
  select owner_id, invoice_key, ordinality::integer, (item->>'date')::date,
    item->>'description', item->>'card_last_four', (item->>'amount_cents')::bigint,
    coalesce(category.name, ''), category.id, (item->>'installment')::integer, (item->>'installments')::integer
    from jsonb_array_elements(p_items) with ordinality as rows(item, ordinality)
    left join public.expense_categories category on category.id = nullif(item->>'category_id', '')::uuid and category.user_id = owner_id;
  return jsonb_build_object('id', invoice_key, 'duplicate', false);
end;
$$;
revoke all on function public.import_card_invoice(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.import_card_invoice(jsonb, jsonb) to authenticated;


commit;
