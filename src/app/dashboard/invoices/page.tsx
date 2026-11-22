import { createClient } from '@/lib/supabase/server'
import { loadInvoiceData } from '@/lib/invoiceData'
import InvoicesClient from './InvoicesClient'

export const metadata = { title: 'Extrato do cartão | Pork Tracker' }

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ month?: string | string[]; invoice?: string | string[] }> }) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const [data, categories, params] = await Promise.all([
    loadInvoiceData(), db.from('expense_categories').select('id, name, active').eq('user_id', user.id).order('name'), searchParams,
  ])
  if (categories.error) throw new Error('Não foi possível consultar as categorias.')
  const initialMonth = typeof params.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : undefined
  return <InvoicesClient data={data} categories={categories.data} initialMonth={initialMonth} initialInvoice={typeof params.invoice === 'string' ? params.invoice : undefined} />
}
