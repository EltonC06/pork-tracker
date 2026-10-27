-- Cobre a chave estrangeira composta para verificações de propriedade.
create index transactions_expense_category_owner_idx
  on public.transactions (category_id, user_id);
