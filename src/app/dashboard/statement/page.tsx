import { loadReimbursements } from '@/lib/reimbursementData'
import { createClient } from '@/lib/supabase/server'
import { loadInvoiceData } from '@/lib/invoiceData'
import { loadCashTransactions } from '@/lib/cashTransactions'
import StatementClient from './StatementClient'

export const metadata = { title: 'Extrato geral | Pork Tracker' }

export default async function StatementPage() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const [reimbursements, data, transactions, categories] = await Promise.all([
    loadReimbursements(), loadInvoiceData(), loadCashTransactions(), db.from('expense_categories').select('id, name, active').eq('user_id', user.id).order('name'),
  ])
  if (categories.error) throw new Error('Não foi possível consultar as categorias.')
  return <StatementClient reimbursements={reimbursements.records} data={data} transactions={transactions} categories={categories.data} />
}
