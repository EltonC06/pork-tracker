'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { validISODate } from '@/lib/interInvoice'

const dateSchema = z.string().refine(validISODate, 'Data inválida.')
const centsSchema = z.number().int().safe().max(99999999999)
const itemSchema = z.object({
  date: dateSchema,
  description: z.string().trim().min(1).max(500),
  cardLastFour: z.string().regex(/^\d{4}$/),
  amountCents: centsSchema.min(-99999999999).refine(value => value !== 0),
  category: z.string().trim().max(100),
  installment: z.number().int().min(1).max(999).nullable(),
  installments: z.number().int().min(1).max(999).nullable(),
}).refine(item => (item.installment === null && item.installments === null) ||
  (item.installment !== null && item.installments !== null && item.installment <= item.installments))

const invoiceSchema = z.object({
  cardLabel: z.string().trim().min(1).max(80),
  cardLastFour: z.string().regex(/^\d{4}$/),
  dueDate: dateSchema,
  totalCents: centsSchema.min(0),
  items: z.array(itemSchema).min(1).max(5000),
}).refine(invoice => invoice.items.reduce((sum, item) => sum + item.amountCents, 0) === invoice.totalCents,
  'Os itens precisam conferir com o total declarado.')

function refreshInvoices() {
  revalidatePath('/dashboard', 'layout')
}

export async function importCardInvoice(input: unknown) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) throw new Error('Revise os dados: ' + parsed.error.issues[0].message)
  const invoice = parsed.data
  // Identity excludes editable categories/label, preserves multiplicity and tolerates PDF row order.
  const canonical = invoice.items.map(({ category: _category, ...item }) => JSON.stringify({
    ...item, description: item.description.normalize('NFKC').replace(/\s+/g, ' ').toUpperCase(),
  })).sort()
  const contentHash = createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
  const { data, error } = await db.rpc('import_card_invoice', {
    p_invoice: {
      card_label: invoice.cardLabel, card_last_four: invoice.cardLastFour,
      due_date: invoice.dueDate, total_cents: invoice.totalCents, content_hash: contentHash,
    },
    p_items: invoice.items.map(item => ({
      date: item.date, description: item.description, card_last_four: item.cardLastFour,
      amount_cents: item.amountCents, category: item.category,
      installment: item.installment, installments: item.installments,
    })),
  })
  if (error) throw new Error(error.message)
  refreshInvoices()
  return data as { id: string; duplicate: boolean }
}

export async function linkInvoicePayment(input: unknown) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const parsed = z.object({ invoiceId: z.string().uuid(), transactionId: z.string().uuid(), amountCents: centsSchema.positive() }).safeParse(input)
  if (!parsed.success) throw new Error('Pagamento inválido.')
  const { error } = await db.from('card_invoice_payments').insert({
    user_id: user.id, invoice_id: parsed.data.invoiceId, transaction_id: parsed.data.transactionId,
    amount_cents: parsed.data.amountCents,
  })
  if (error) throw new Error(error.message)
  refreshInvoices()
}

export async function unlinkInvoicePayment(id: string) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user || !z.string().uuid().safeParse(id).success) throw new Error('Pedido inválido.')
  const { error } = await db.from('card_invoice_payments').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  refreshInvoices()
}

export async function updateInvoiceCategory(id: string, category: string) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user || !z.string().uuid().safeParse(id).success || category.trim().length > 100) throw new Error('Categoria inválida.')
  const { error } = await db.from('card_invoice_items').update({ category: category.trim() }).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  refreshInvoices()
}

export async function deleteCardInvoice(id: string) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user || !z.string().uuid().safeParse(id).success) throw new Error('Pedido inválido.')
  const { error } = await db.from('card_invoices').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  refreshInvoices()
}
