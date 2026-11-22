/* eslint-disable @typescript-eslint/no-require-imports -- Optional isolated PostgreSQL runtime. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const { PGlite } = require(path.resolve(process.argv[2], 'node_modules/@electric-sql/pglite'))
  const db = new PGlite()
  const owner = '00000000-0000-4000-8000-000000000001'
  const other = '00000000-0000-4000-8000-000000000002'
  const bank = '00000000-0000-4000-8000-000000000003'
  await db.exec(`
    create role authenticated; create role anon; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${owner}'), ('${other}');
    create table public.transactions(id uuid primary key, user_id uuid not null references auth.users(id),
      type text not null, amount numeric(15,2) not null, category text, date date default current_date,
      created_at timestamptz default now());
    insert into public.transactions(id,user_id,type,amount) values ('${bank}','${owner}','expense',180);
    alter table public.transactions enable row level security;
    create policy owner on public.transactions to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    grant select, insert, update, delete on public.transactions to authenticated;
  `)
  const migrations = path.join(__dirname, '../supabase/migrations')
  for (const name of fs.readdirSync(migrations).sort().filter(name => !name.endsWith('_separate_bank_card_statements.sql'))) {
    await db.exec(fs.readFileSync(path.join(migrations, name), 'utf8'))
  }
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`)
  const header = { card_label: 'Inter teste', card_last_four: '1234', due_date: '2027-01-12', total_cents: 18000, content_hash: 'a'.repeat(64) }
  const items = [10000, 9000, -1000].map((amount_cents, i) => ({ date: i === 0 ? '2026-11-01' : '2026-12-20', description: 'Compra teste', card_last_four: '5678', amount_cents, category: 'Transporte', installment: null, installments: null }))
  async function importBill(invoice = header, rows = items) {
    return (await db.query('select public.import_card_invoice($1::jsonb,$2::jsonb) as result', [JSON.stringify(invoice), JSON.stringify(rows)])).rows[0].result
  }
  const first = await importBill()
  await db.query('insert into public.card_invoice_payments(user_id,invoice_id,transaction_id,amount_cents) values ($1,$2,$3,10000)', [owner, first.id, bank])
  await db.exec('reset role')
  const migration = fs.readdirSync(migrations).find(name => name.endsWith('_separate_bank_card_statements.sql'))
  await db.exec(fs.readFileSync(path.join(migrations, migration), 'utf8'))
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`)
  const q = async (sql, args = []) => (await db.query(sql, args)).rows
  assert.equal((await q('select statement_month::text as month from public.card_invoices'))[0].month, '2026-12-01')
  assert.equal((await q('select category from public.transactions'))[0].category, 'Pagamento de fatura')
  assert.equal((await q('select count(*)::int as n from public.card_invoice_payments'))[0].n, 1)
  assert.equal((await q('select count(*)::int as n from public.card_invoice_items where category_id is not null'))[0].n, 3)
  const category = (await q("select id from public.expense_categories where name='Transporte'"))[0].id
  const paymentCategory = (await q("select id from public.expense_categories where name='Pagamento de fatura'"))[0].id
  await db.query('update public.card_invoices set statement_month=$1 where id=$2', ['2026-10-01', first.id])
  await assert.rejects(db.query('update public.card_invoices set statement_month=$1 where id=$2', ['2026-10-02', first.id]), /invoice_month_start/)
  const nextHeader = { ...header, due_date: '2027-02-12', statement_month: '2027-01-01' }
  const nextItems = items.map(item => ({ ...item, category_id: category, category: 'Untrusted label' }))
  const second = await importBill(nextHeader, nextItems)
  assert.equal((await importBill({ ...nextHeader, statement_month: '2027-03-01' }, nextItems)).duplicate, true)
  assert.equal((await q('select category from public.card_invoice_items where invoice_id=$1 limit 1', [second.id]))[0].category, 'Transporte')
  await assert.rejects(importBill({ ...nextHeader, due_date: '2027-03-12' }, nextItems.map(item => ({ ...item, category_id: paymentCategory }))), /categorias ativas/)
  await assert.rejects(importBill({ ...nextHeader, due_date: '2027-03-12', total_cents: 1 }, nextItems), /não confere/)
  await assert.rejects(db.query('insert into public.card_invoice_payments(user_id,invoice_id,transaction_id,amount_cents) values ($1,$2,$3,1)', [owner, second.id, bank]), /permission denied/)
  // Historical links must no longer prevent reducing or deleting a bank entry.
  await db.query('update public.transactions set amount=1 where id=$1', [bank])
  await db.query('delete from public.transactions where id=$1', [bank])
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`)
  assert.equal((await q('select count(*)::int as n from public.card_invoices'))[0].n, 0)
  await assert.rejects(importBill(nextHeader, nextItems), /categorias ativas/)
  const otherCategory = (await q("select id from public.expense_categories where name='Transporte'"))[0].id
  await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`)
  await assert.rejects(db.query('update public.card_invoice_items set category_id=$1 where invoice_id=$2', [otherCategory, second.id]), /foreign key/)
  await db.exec('reset role; set role anon')
  await assert.rejects(importBill(nextHeader, nextItems), /permission denied/)
  await db.exec(`reset role; insert into auth.users values ('00000000-0000-4000-8000-000000000009')`)
  assert.equal((await q("select count(*)::int as n from public.expense_categories where user_id='00000000-0000-4000-8000-000000000009' and name='Pagamento de fatura'"))[0].n, 1)
  await db.close()
  console.log('PostgreSQL: transição sem vínculos, categorias por proprietário, mês de referência, rollback, repetição e RLS passaram.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
