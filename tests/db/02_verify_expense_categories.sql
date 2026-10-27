do $$
declare
  first_user uuid := '11111111-1111-4111-8111-111111111111';
  second_user uuid := '22222222-2222-4222-8222-222222222222';
  other_category uuid;
begin
  if (select count(*) from public.expense_categories where user_id = first_user) <> 11 then
    raise exception 'Legacy categories or defaults were not created';
  end if;
  if (select count(*) from public.expense_categories where user_id = second_user) <> 10 then
    raise exception 'Defaults for second user were not created';
  end if;
  if (select count(*) from public.transactions where type = 'expense' and category is not null and category_id is not null) <> 2 then
    raise exception 'Legacy expenses were not linked';
  end if;
  if (select category_id from public.transactions where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4') is not null then
    raise exception 'Income was incorrectly linked to an expense category';
  end if;

  select id into other_category from public.expense_categories
  where user_id = second_user limit 1;
  begin
    update public.transactions
    set category_id = other_category
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
    raise exception 'Cross-user category reference unexpectedly succeeded';
  exception when foreign_key_violation then
    null;
  end;
  begin
    update public.transactions
    set category_id = (select id from public.expense_categories where user_id = first_user limit 1)
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4';
    raise exception 'Income accepted an expense category';
  exception when check_violation then
    null;
  end;
end;
$$;

insert into auth.users(id) values ('33333333-3333-4333-8333-333333333333');
do $$
begin
  if (select count(*) from public.expense_categories where user_id = '33333333-3333-4333-8333-333333333333') <> 10 then
    raise exception 'New user did not receive base categories';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
do $$
begin
  if (select count(*) from public.expense_categories) <> 11 then
    raise exception 'RLS did not isolate the category catalog';
  end if;
  begin
    insert into public.expense_categories(user_id, name)
    values ('22222222-2222-4222-8222-222222222222', 'Categoria indevida');
    raise exception 'Cross-user insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  begin
    update public.expense_categories set name = 'Nome indevido' where user_id = '11111111-1111-4111-8111-111111111111';
    raise exception 'Category name update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;
do $$
begin
  if has_table_privilege('anon', 'public.expense_categories', 'SELECT')
    or has_table_privilege('authenticated', 'public.expense_categories', 'DELETE')
    or has_table_privilege('authenticated', 'public.expense_categories', 'TRUNCATE')
    or has_column_privilege('authenticated', 'public.expense_categories', 'name', 'UPDATE') then
    raise exception 'New table retained broad default privileges';
  end if;
end;
$$;
select 'expense_categories local verification passed' as result;
