import { createClient } from '@/lib/supabase/server'
import { loadInvoiceData } from '@/lib/invoiceData'
import { loadCashTransactions } from '@/lib/cashTransactions'
import InvoicesClient from './InvoicesClient'

export const metadata = { title: 'Faturas | Pork Tracker' }

export default async function InvoicesPage() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const [data, transactions, accounts] = await Promise.all([
    loadInvoiceData(), loadCashTransactions(), db.from('account_types').select('*').eq('user_id', user.id).order('name'),
  ])
  if (accounts.error) throw new Error('Não foi possível consultar as contas.')
  return <InvoicesClient data={data} transactions={transactions} accounts={accounts.data} />
}
