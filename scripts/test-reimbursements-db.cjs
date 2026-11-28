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
  const payment = '00000000-0000-4000-8000-000000000004'
  const income = '00000000-0000-4000-8000-000000000005'
  const otherBank = '00000000-0000-4000-8000-000000000006'
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
      type text not null, amount numeric(15,2) not null, category text, description text,
      date date not null default '2026-10-10', created_at timestamptz default now());
    insert into public.transactions(id,user_id,type,amount,category,description) values
      ('${bank}','${owner}','expense',20,'Transporte','Compra banco'),
      ('${payment}','${owner}','expense',180,'Lazer','Pagamento Fatura - TITULAR'),
      ('${income}','${owner}','income',50,null,'Receita'),
      ('${otherBank}','${other}','expense',70,null,'Compra de outro usuário');
    alter table public.transactions enable row level security;
    create policy owner on public.transactions to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
    grant select,insert,update,delete on public.transactions to authenticated;
  `)
  const migrations = path.join(__dirname, '../supabase/migrations')
  for (const name of fs.readdirSync(migrations).sort()) await db.exec(fs.readFileSync(path.join(migrations, name), 'utf8'))
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`)
  const q = async (sql, args = []) => (await db.query(sql, args)).rows
  assert.equal((await q('select category from public.transactions where id=$1', [payment]))[0].category, 'Pagamento de fatura')
  assert.equal((await q('select amount::text from public.transactions where id=$1', [payment]))[0].amount, '180.00')
  const invoice = (await q('select public.import_card_invoice($1::jsonb,$2::jsonb) as result', [JSON.stringify({ card_label: 'Teste', card_last_four: '1234', due_date: '2026-11-12', statement_month: '2026-10-01', total_cents: 9000, content_hash: 'a'.repeat(64) }), JSON.stringify([10000, -1000].map(amount_cents => ({ date: '2026-10-15', description: 'Compra cartão', card_last_four: '1234', amount_cents, category_id: null, installment: null, installments: null })))]))[0].result
  const items = await q('select id,amount_cents from public.card_invoice_items order by amount_cents desc')
  async function create(source, expenseId, user = owner, status = 'to_claim') {
    return (await q(`insert into public.reimbursements(user_id,source,transaction_id,invoice_item_id,description,due_date,status)
      values ($1,$2,$3,$4,'Motivo teste','2026-11-30',$5) returning *`, [user, source, source === 'bank' ? expenseId : null, source === 'card' ? expenseId : null, status]))[0]
  }
  const first = await create('bank', bank)
  assert.equal(Number(first.amount_cents), 2000)
  assert.equal(first.expense_description, 'Compra banco')
  assert.equal(first.reimbursed_at, null)
  await assert.rejects(create('bank', bank), /duplicate key/)
  await assert.rejects(create('bank', payment), /compra original/)
  await assert.rejects(create('bank', income), /despesa/)
  await assert.rejects(create('bank', otherBank), /despesa/)
  await assert.rejects(create('bank', bank, other), /despesa|row-level security/)
  await assert.rejects(create('card', items[1].id), /compra da sua fatura/)
  const card = await create('card', items[0].id)
  assert.equal(Number(card.amount_cents), 10000)
  await assert.rejects(create('card', items[0].id), /duplicate key/)
  for (const sql of ['amount_cents=1', `user_id='${other}'`, `source='card'`, 'transaction_id=null']) {
    await assert.rejects(db.query(`update public.reimbursements set ${sql} where id=$1`, [first.id]), /permission denied/)
  }
  await assert.rejects(db.query("update public.reimbursements set status='unknown' where id=$1", [first.id]), /check constraint/)
  await assert.rejects(db.query("update public.reimbursements set due_date='2026-02-31' where id=$1", [first.id]), /out of range/)
  await db.query("update public.reimbursements set status='claimed' where id=$1", [first.id])
  assert.equal((await q('select reimbursed_at from public.reimbursements where id=$1', [first.id]))[0].reimbursed_at, null)
  await db.query("update public.reimbursements set status='not_reimbursed' where id=$1", [first.id])
  await db.query("update public.reimbursements set status='reimbursed' where id=$1", [first.id])
  assert.ok((await q('select reimbursed_at from public.reimbursements where id=$1', [first.id]))[0].reimbursed_at)
  assert.equal((await q("select count(*)::int as n from public.reimbursements where status='reimbursed'"))[0].n, 1)
  await db.query("update public.reimbursements set status='to_claim' where id=$1", [first.id])
  assert.equal((await q('select reimbursed_at from public.reimbursements where id=$1', [first.id]))[0].reimbursed_at, null)
  // Deleting an expense preserves the reimbursement snapshot and clears its association.
  await db.query('delete from public.transactions where id=$1', [bank])
  const retained = (await q('select transaction_id,amount_cents from public.reimbursements where id=$1', [first.id]))[0]
  assert.equal(retained.transaction_id, null)
  assert.equal(Number(retained.amount_cents), 2000)
  await db.query('delete from public.card_invoices where id=$1', [invoice.id])
  assert.equal((await q('select invoice_item_id from public.reimbursements where id=$1', [card.id]))[0].invoice_item_id, null)
  await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`)
  assert.equal((await q('select count(*)::int as n from public.reimbursements'))[0].n, 0)
  assert.equal((await q('update public.reimbursements set description=$1 where id=$2 returning id', ['Tamper', first.id])).length, 0)
  assert.equal((await q('delete from public.reimbursements where id=$1 returning id', [first.id])).length, 0)
  await db.exec('reset role; set role anon')
  await assert.rejects(q('select * from public.reimbursements'), /permission denied/)
  await assert.rejects(q("select public.is_card_invoice_payment('Fatura',null)"), /permission denied/)
  await db.close()
  console.log('PostgreSQL: pagamentos históricos, reembolsos banco/cartão, estados, arquivo, duplicatas, snapshots, exclusões, privilégios e RLS passaram.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
