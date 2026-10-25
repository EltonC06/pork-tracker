-- Migração aditiva: categorias de despesas pessoais e vínculo às transações.
-- Execute antes de publicar a aplicação. Não altera valores ou datas de lançamentos.

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) >= 1),
  normalized_name text generated always as (lower(btrim(name))) stored,
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint expense_categories_id_user_unique unique (id, user_id),
  constraint expense_categories_user_name_unique unique (user_id, normalized_name)
);

-- A referência composta impede usar a categoria de outra pessoa.
alter table public.transactions add column category_id uuid;
alter table public.transactions
  add constraint transactions_category_owner_fk
  foreign key (category_id, user_id)
  references public.expense_categories(id, user_id)
  on delete restrict;
alter table public.transactions
  add constraint transactions_expense_category_only
  check (type = 'expense' or category_id is null);

create index expense_categories_user_active_idx
  on public.expense_categories(user_id, active, name);
create index transactions_expense_category_date_idx
  on public.transactions(user_id, date desc, category_id)
  where type = 'expense';

-- Criar os defaults de todas as contas já existentes.
insert into public.expense_categories (user_id, name, is_default)
select users.id, defaults.name, true
from auth.users as users
cross join (values
  ('Alimentação'), ('Moradia'), ('Transporte'), ('Saúde'),
  ('Educação'), ('Lazer'), ('Compras'), ('Assinaturas'), ('Trabalho'), ('Outros')
) as defaults(name)
on conflict (user_id, normalized_name) do nothing;

-- Preservar os nomes das categorias livres do histórico, inclusive os nomes
-- que não fazem parte do conjunto inicial.
insert into public.expense_categories (user_id, name)
select distinct on (t.user_id, lower(btrim(t.category)))
  t.user_id, btrim(t.category)
from public.transactions as t
where t.type = 'expense'
  and t.category is not null
  and btrim(t.category) <> ''
order by t.user_id, lower(btrim(t.category)), t.created_at
on conflict (user_id, normalized_name) do nothing;

update public.transactions as t
set category_id = c.id
from public.expense_categories as c
where t.user_id = c.user_id
  and t.type = 'expense'
  and t.category is not null
  and lower(btrim(t.category)) = c.normalized_name;

-- Categorias para novas contas. A função só é chamada pelo trigger de auth.users,
-- fica fora do schema exposto e usa nomes fixos.
create schema if not exists private;
create function private.seed_expense_categories()
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
    ('Educação'), ('Lazer'), ('Compras'), ('Assinaturas'), ('Trabalho'), ('Outros')
  ) as defaults(name)
  on conflict (user_id, normalized_name) do nothing;
  return new;
end;
$$;
revoke all on function private.seed_expense_categories() from public, anon, authenticated;
create trigger on_auth_user_created_seed_expense_categories
  after insert on auth.users
  for each row execute function private.seed_expense_categories();

alter table public.expense_categories enable row level security;
revoke all on public.expense_categories from anon;
grant select on public.expense_categories to authenticated;
grant insert (user_id, name) on public.expense_categories to authenticated;
grant update (active) on public.expense_categories to authenticated;
grant select, insert, update, delete on public.expense_categories to service_role;

create policy "Read own expense categories"
on public.expense_categories for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Create own expense categories"
on public.expense_categories for insert to authenticated
with check ((select auth.uid()) = user_id and is_default = false);

create policy "Update own expense categories"
on public.expense_categories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
