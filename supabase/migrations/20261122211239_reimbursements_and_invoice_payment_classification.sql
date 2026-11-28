begin;

-- Deterministic payment recognition. Never infer a payment from matching amounts.
create or replace function public.is_card_invoice_payment(category text, description text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  with normalized as (
    select btrim(regexp_replace(translate(lower(coalesce(category,'')), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc'), '[^a-z0-9]+', ' ', 'g')) c,
      btrim(regexp_replace(translate(lower(coalesce(description,'')), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc'), '[^a-z0-9]+', ' ', 'g')) d
  )
  select c in ('fatura','pagamento de fatura')
    or d ~ '(^| )(pagamento|pagto|pgto|pag)( de| da| do)? (fatura|cartao)( |$)'
    or d ~ '(^| )fatura ([a-z0-9]+ )*(cartao|inter)( |$)' from normalized;
$$;
revoke all on function public.is_card_invoice_payment(text,text) from public, anon, authenticated;
grant execute on function public.is_card_invoice_payment(text,text) to authenticated;

-- Normalize explicit historical bill payments while preserving amounts, dates and accounts.
update public.transactions t set category_id = payment.id, category = payment.name
from public.expense_categories payment
where payment.user_id = t.user_id and payment.normalized_name = 'pagamento de fatura' and t.type = 'expense'
  and public.is_card_invoice_payment(coalesce((select c.name from public.expense_categories c where c.id=t.category_id and c.user_id=t.user_id),t.category),t.description)
  and t.category_id is distinct from payment.id;

alter table public.card_invoice_items add constraint card_invoice_items_id_owner_unique unique (id,user_id);
create table public.reimbursements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('bank','card')),
  transaction_id uuid,
  invoice_item_id uuid,
  description text not null check (length(btrim(description)) between 1 and 500),
  due_date date not null,
  status text not null default 'to_claim' check (status in ('to_claim','claimed','not_reimbursed','reimbursed')),
  expense_description text not null default '',
  expense_date date not null default current_date,
  amount_cents bigint not null default 1 check (amount_cents between 1 and 99999999999),
  reimbursed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (transaction_id,user_id) references public.transactions(id,user_id) on delete set null (transaction_id),
  foreign key (invoice_item_id,user_id) references public.card_invoice_items(id,user_id) on delete set null (invoice_item_id),
  check ((source='bank' and invoice_item_id is null) or (source='card' and transaction_id is null)),
  check ((status='reimbursed') = (reimbursed_at is not null))
);
create unique index reimbursements_bank_unique on public.reimbursements(transaction_id) where transaction_id is not null;
create unique index reimbursements_card_unique on public.reimbursements(invoice_item_id) where invoice_item_id is not null;
create index reimbursements_owner_status_due on public.reimbursements(user_id,status,due_date,id);
create index reimbursements_bank_owner on public.reimbursements(transaction_id,user_id) where transaction_id is not null;
create index reimbursements_card_owner on public.reimbursements(invoice_item_id,user_id) where invoice_item_id is not null;
alter table public.reimbursements enable row level security;
revoke all on public.reimbursements from public, anon, authenticated;
grant select, delete on public.reimbursements to authenticated;
grant insert(user_id,source,transaction_id,invoice_item_id,description,due_date,status) on public.reimbursements to authenticated;
grant update(description,due_date,status) on public.reimbursements to authenticated;
create policy reimbursements_owner on public.reimbursements to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create function public.prepare_reimbursement() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare bank_entry public.transactions%rowtype; card_entry public.card_invoice_items%rowtype; category_name text;
begin
  if tg_op='INSERT' then
    if new.source='bank' then
      select * into bank_entry from public.transactions where id=new.transaction_id and user_id=new.user_id for share;
      if not found or bank_entry.type <> 'expense' then raise exception 'Selecione uma despesa da sua conta.'; end if;
      select name into category_name from public.expense_categories where id=bank_entry.category_id and user_id=new.user_id;
      if public.is_card_invoice_payment(coalesce(category_name,bank_entry.category),bank_entry.description) then
        raise exception 'Selecione a compra original, não o pagamento da fatura.';
      end if;
      new.expense_description := coalesce(bank_entry.description,'Sem descrição');
      new.expense_date := bank_entry.date;
      new.amount_cents := round(bank_entry.amount*100);
    elsif new.source='card' then
      select * into card_entry from public.card_invoice_items where id=new.invoice_item_id and user_id=new.user_id for share;
      if not found or card_entry.amount_cents <= 0 then raise exception 'Selecione uma compra da sua fatura.'; end if;
      new.expense_description := card_entry.description;
      new.expense_date := card_entry.date;
      new.amount_cents := card_entry.amount_cents;
    end if;
  end if;
  if new.status='reimbursed' then
    if tg_op='INSERT' then new.reimbursed_at := now();
    elsif old.status <> 'reimbursed' then new.reimbursed_at := now(); end if;
  else new.reimbursed_at := null; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.prepare_reimbursement() from public, anon, authenticated;
create trigger prepare_reimbursement before insert or update on public.reimbursements
for each row execute function public.prepare_reimbursement();
commit;
