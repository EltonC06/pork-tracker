import { createClient } from '@/lib/supabase/server'
import { loadCashTransactions } from '@/lib/cashTransactions'
import { loadInvoiceData } from '@/lib/invoiceData'
import { loadReimbursements } from '@/lib/reimbursementData'
import { reimbursementCandidates } from '@/lib/reimbursements'
import ReimbursementsClient from './ReimbursementsClient'

export const metadata = { title: 'Reembolsos | Pork Tracker' }

export default async function ReimbursementsPage() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const [data, transactions, invoices, categories] = await Promise.all([
    loadReimbursements(), loadCashTransactions(), loadInvoiceData(),
    db.from('expense_categories').select('id,name,active').eq('user_id', user.id).order('name'),
  ])
  if (categories.error) throw new Error('Não foi possível carregar as categorias.')
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return <ReimbursementsClient data={data} candidates={reimbursementCandidates(transactions, invoices.items, categories.data, data.records)} today={today} />
}
