import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { InvoiceData } from '@/types/invoices'

export async function loadInvoiceData(): Promise<InvoiceData> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const readiness = await db.from('card_invoices').select('statement_month').limit(0)
  if (readiness.error) {
    if (['42P01', '42703', 'PGRST204', 'PGRST205'].includes(readiness.error.code)) return { invoices: [], items: [], available: false }
    throw new Error('Não foi possível consultar as faturas.')
  }
  const invoices: InvoiceData['invoices'] = []
  const items: InvoiceData['items'] = []
  // Page explicitly: historical statements can easily exceed the Data API row cap.
  for (let page = 0; ; page++) {
    const result = await db.from('card_invoices').select('*').eq('user_id', user.id)
      .order('id').range(page * 500, page * 500 + 499)
    if (result.error) {
      if (['42P01', 'PGRST205'].includes(result.error.code)) return { invoices: [], items: [], available: false }
      throw new Error('Não foi possível consultar as faturas.')
    }
    invoices.push(...result.data)
    if (result.data.length < 500) break
  }
  for (let page = 0; ; page++) {
    const result = await db.from('card_invoice_items').select('*').eq('user_id', user.id)
      .order('id').range(page * 500, page * 500 + 499)
    if (result.error) throw new Error('Não foi possível consultar os itens das faturas.')
    items.push(...result.data)
    if (result.data.length < 500) break
  }
  return { invoices, items, available: true }
}
