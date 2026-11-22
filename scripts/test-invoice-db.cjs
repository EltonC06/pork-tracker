/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node harness loads the optional temporary PostgreSQL runtime passed by path. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const { PGlite } = require(path.resolve(process.argv[2], 'node_modules/@electric-sql/pglite'))
  const db = new PGlite()
  const owner = '00000000-0000-4000-8000-000000000001'
  const other = '00000000-0000-4000-8000-000000000002'
  const bank = '00000000-0000-4000-8000-000000000003'
  const bank2 = '00000000-0000-4000-8000-000000000004'
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${owner}'), ('${other}');
    create table public.transactions(
      id uuid primary key, user_id uuid not null references auth.users(id),
      type text not null, amount numeric(15,2) not null
    );
    insert into public.transactions values ('${bank}', '${owner}', 'expense', 180), ('${bank2}', '${owner}', 'expense', 50);
    alter table public.transactions enable row level security;
    create policy owner on public.transactions to authenticated
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
    grant select, insert, update, delete on public.transactions to authenticated;
  `)
  const migration = fs.readdirSync(path.join(__dirname, '../supabase/migrations')).find(name => name.endsWith('_card_invoice_reconciliation.sql'))
  await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', migration), 'utf8'))
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`)
  const invoice = { card_label: 'Inter teste', card_last_four: '1234', due_date: '2027-01-12', total_cents: 18000, content_hash: 'a'.repeat(64) }
  const items = [10000, 4000, 4000].map(amount_cents => ({ date: '2026-12-20', description: 'Compra sintética', card_last_four: '5678', amount_cents, category: 'Outros', installment: null, installments: null }))
  async function importBill(header = invoice, rows = items) {
    return (await db.query('select public.import_card_invoice($1::jsonb, $2::jsonb) as result', [JSON.stringify(header), JSON.stringify(rows)])).rows[0].result
  }
  const first = await importBill()
  assert.equal(first.duplicate, false)
  assert.equal((await importBill()).duplicate, true)
  assert.equal((await db.query('select count(*)::int as count from public.card_invoice_items')).rows[0].count, 3)
  await assert.rejects(importBill({ ...invoice, content_hash: 'b'.repeat(64) }), /fatura diferente/)
  await assert.rejects(importBill({ ...invoice, due_date: '2027-02-12', total_cents: 1 }), /não confere/)
  assert.equal((await db.query('select count(*)::int as count from public.card_invoices')).rows[0].count, 1)

  async function allocate(transactionId, amount, invoiceId = first.id, userId = owner) {
    return db.query('insert into public.card_invoice_payments(user_id, invoice_id, transaction_id, amount_cents) values ($1,$2,$3,$4) returning id', [userId, invoiceId, transactionId, amount])
  }
  const payment = await allocate(bank, 13000)
  await allocate(bank2, 5000)
  await assert.rejects(allocate(bank, 1), /saldo da fatura|duplicate key/)
  await assert.rejects(db.query("update public.transactions set amount = 1 where id = $1", [bank]), /Desvincule/)
  await assert.rejects(db.query("update public.transactions set type = 'income' where id = $1", [bank]), /Desvincule/)
  await assert.rejects(db.query('delete from public.transactions where id = $1', [bank]), /foreign key/)
  const second = await importBill({ ...invoice, due_date: '2027-02-12' })
  await assert.rejects(allocate(bank, 6000, second.id), /pagamento bancário/)
  await db.query('update public.card_invoice_items set category = $1 where invoice_id = $2', ['Transporte', first.id])
  await importBill()
  assert.equal((await db.query('select category from public.card_invoice_items where invoice_id = $1 limit 1', [first.id])).rows[0].category, 'Transporte')

  await db.exec(`select set_config('request.jwt.claim.sub', '${other}', false);`)
  assert.equal((await db.query('select count(*)::int as count from public.card_invoices')).rows[0].count, 0)
  assert.equal((await db.query('select count(*)::int as count from public.card_invoice_items')).rows[0].count, 0)
  assert.equal((await db.query('select count(*)::int as count from public.card_invoice_payments')).rows[0].count, 0)
  await assert.rejects(allocate(bank, 1, first.id, owner), /row-level security|sua conta/)
  const otherInvoice = await importBill()
  await assert.rejects(allocate(bank, 1, otherInvoice.id, other), /sua conta/)
  await db.exec(`select set_config('request.jwt.claim.sub', '${owner}', false);`)
  await assert.rejects(db.query('insert into public.card_invoice_items(user_id, invoice_id, position, date, description, card_last_four, amount_cents, category) values ($1,$2,4,\'2026-12-21\',\'Outra compra\',\'1234\',1,\'Outros\')', [owner, first.id]), /não confere/)
  await db.query('delete from public.card_invoice_payments where id = $1', [payment.rows[0].id])
  await db.query('delete from public.transactions where id = $1', [bank])
  await db.query('delete from public.card_invoices where id = $1', [first.id])
  assert.equal((await db.query('select count(*)::int as count from public.card_invoice_payments')).rows[0].count, 0)
  assert.equal((await db.query('select count(*)::int as count from public.transactions')).rows[0].count, 1)
  await db.exec('reset role; set role anon;')
  await assert.rejects(db.query('select * from public.card_invoices'), /permission denied/)
  await assert.rejects(importBill(), /permission denied/)
  await db.close()
  console.log('PostgreSQL local: migração, importação atômica, repetição, divergência, parcelas iguais, alocação parcial, limites, edição, exclusão e RLS passaram.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
