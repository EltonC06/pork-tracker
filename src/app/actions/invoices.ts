'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { resolveExpenseCategory } from '@/lib/expense-categories'
import { isInvoicePayment } from '@/lib/statements'
import { validISODate } from '@/lib/interInvoice'

const dateSchema = z.string().refine(validISODate, 'Data inválida.')
const centsSchema = z.number().int().safe().max(99999999999)
const itemSchema = z.object({
  date: dateSchema,
  description: z.string().trim().min(1).max(500),
  cardLastFour: z.string().regex(/^\d{4}$/),
  amountCents: centsSchema.min(-99999999999).refine(value => value !== 0),
  category: z.string().trim().max(120),
  categoryId: z.union([z.string().uuid(), z.literal('')]).optional(),
  installment: z.number().int().min(1).max(999).nullable(),
  installments: z.number().int().min(1).max(999).nullable(),
}).refine(item => (item.installment === null && item.installments === null) ||
  (item.installment !== null && item.installments !== null && item.installment <= item.installments))

const invoiceSchema = z.object({
  cardLabel: z.string().trim().min(1).max(80),
  cardLastFour: z.string().regex(/^\d{4}$/),
  dueDate: dateSchema,
  statementMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
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
  const canonical = invoice.items.map(({ category: _category, categoryId: _categoryId, ...item }) => JSON.stringify({
    ...item, description: item.description.normalize('NFKC').replace(/\s+/g, ' ').toUpperCase(),
  })).sort()
  const contentHash = createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
  const categoryIds = [...new Set(invoice.items.map(item => item.categoryId).filter((id): id is string => !!id))]
  const { data: categories, error: categoriesError } = categoryIds.length
    ? await db.from('expense_categories').select('id, name, active').eq('user_id', user.id).in('id', categoryIds)
    : { data: [], error: null }
  if (categoriesError) throw new Error('Não foi possível consultar as categorias.')
  const categoryMap = new Map(categories.map(category => [category.id, category]))
  const resolvedItems = invoice.items.map(item => {
    const category = item.categoryId ? categoryMap.get(item.categoryId) : undefined
    if (item.categoryId && (!category?.active || isInvoicePayment(category.name))) throw new Error('Selecione uma categoria de compra ativa.')
    return { ...item, resolvedCategory: { category: category?.name ?? '', category_id: category?.id ?? null } }
  })
  const { data, error } = await db.rpc('import_card_invoice', {
    p_invoice: {
      card_label: invoice.cardLabel, card_last_four: invoice.cardLastFour,
      statement_month: `${invoice.statementMonth}-01`, due_date: invoice.dueDate, total_cents: invoice.totalCents, content_hash: contentHash,
    },
    p_items: resolvedItems.map(item => ({
      date: item.date, description: item.description, card_last_four: item.cardLastFour,
      amount_cents: item.amountCents, category: item.resolvedCategory.category ?? '', category_id: item.resolvedCategory.category_id,
      installment: item.installment, installments: item.installments,
    })),
  })
  if (error) throw new Error(error.message)
  const result = data as { id: string; duplicate: boolean }
  const { data: saved, error: savedError } = await db.from('card_invoices').select('statement_month').eq('id', result.id).eq('user_id', user.id).single()
  if (savedError || !saved) throw new Error('Fatura salva. Atualize a tela para conferir o mês de referência.')
  refreshInvoices()
  return { ...result, statementMonth: saved.statement_month.slice(0, 7) }
}

export async function updateInvoiceCategory(id: string, categoryId: string) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user || !z.string().uuid().safeParse(id).success || (categoryId && !z.string().uuid().safeParse(categoryId).success)) throw new Error('Categoria inválida.')
  const { data: item, error: itemError } = await db.from('card_invoice_items').select('category_id').eq('id', id).eq('user_id', user.id).single()
  if (itemError || !item) throw new Error('Compra não encontrada.')
  const category = await resolveExpenseCategory(db, user.id, categoryId, item.category_id)
  if (isInvoicePayment(category.category)) throw new Error('Use uma categoria de compra.')
  const { error } = await db.from('card_invoice_items').update({ ...category, category: category.category ?? '' }).eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)
  refreshInvoices()
}

export async function updateInvoiceMonth(id: string, month: string) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user || !z.string().uuid().safeParse(id).success || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mês inválido.')
  const { error } = await db.from('card_invoices').update({ statement_month: month + '-01' }).eq('id', id).eq('user_id', user.id)
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
