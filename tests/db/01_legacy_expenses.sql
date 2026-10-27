insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');

insert into public.transactions(id, user_id, amount, type, category, date, description)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 120.50, 'expense', ' Alimentação ', '2026-10-05', 'Mercado'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 40.00, 'expense', 'Pets', '2026-10-06', 'Ração'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 10.00, 'expense', null, '2026-10-07', 'Sem classificação'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', 1000.00, 'income', 'Salário', '2026-10-08', 'Pagamento');
