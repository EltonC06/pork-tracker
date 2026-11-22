import type { ExpenseCategoryOption, Transaction } from '@/types/database'
import type { CardInvoice, CardInvoiceItem } from '@/types/invoices'
import { categoryKey, type CategoryTotal, type ExpenseEntry } from './categoryAnalytics'

export const INVOICE_PAYMENT_CATEGORY = 'Pagamento de fatura'
export type StatementSource = 'general' | 'bank' | 'card'
export interface StatementEntry extends ExpenseEntry {
  id: string
  source: 'bank' | 'card'
  description: string
  originalDate: string
  type: 'income' | 'expense'
  invoiceId?: string
}

export function isInvoicePayment(category: string | null | undefined) {
  return category?.trim().toLocaleLowerCase('pt-BR') === INVOICE_PAYMENT_CATEGORY.toLocaleLowerCase('pt-BR')
}

export function suggestedStatementMonth(items: Array<{ date: string }>, dueDate: string) {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.date.slice(0, 7), (counts.get(item.date.slice(0, 7)) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0]?.[0] ?? dueDate.slice(0, 7)
}

export function buildStatement(source: StatementSource, transactions: Transaction[], invoices: CardInvoice[], items: CardInvoiceItem[], categories: ExpenseCategoryOption[] = []): StatementEntry[] {
  const bank: StatementEntry[] = source === 'card' ? [] : transactions
    .filter(tx => source === 'bank' || tx.type !== 'expense' || !isInvoicePayment(categories.find(c => c.id === tx.category_id)?.name ?? tx.category))
    .map(tx => ({ id: `bank:${tx.id}`, source: 'bank', description: tx.description || 'Sem descrição', date: tx.date, originalDate: tx.date, type: tx.type, amount: Number(tx.amount), category_id: tx.category_id, category: tx.category }))
  const invoiceMap = new Map(invoices.map(invoice => [invoice.id, invoice]))
  const card: StatementEntry[] = source === 'bank' ? [] : items.flatMap(item => {
    const invoice = invoiceMap.get(item.invoice_id)
    if (!invoice) return []
    return [{ id: `card:${item.id}`, source: 'card', invoiceId: invoice.id, description: item.description, date: invoice.statement_month, originalDate: item.date, type: 'expense', amount: item.amount_cents / 100, category_id: item.category_id, category: item.category }]
  })
  return [...bank, ...card].sort((a, b) => b.date.localeCompare(a.date) || b.originalDate.localeCompare(a.originalDate) || a.id.localeCompare(b.id))
}

export function statementSummary(entries: StatementEntry[], categories: ExpenseCategoryOption[]) {
  const totals = new Map<string, Omit<CategoryTotal, 'percent'>>()
  let incomeCents = 0, bankCents = 0, cardCents = 0
  for (const entry of entries) {
    const cents = Math.round(entry.amount * 100)
    if (entry.type === 'income') { incomeCents += cents; continue }
    if (entry.source === 'bank') bankCents += cents
    else cardCents += cents
    const category = categoryKey(entry, categories)
    const previous = totals.get(category.key)
    totals.set(category.key, { ...category, cents: (previous?.cents ?? 0) + cents, count: (previous?.count ?? 0) + 1 })
  }
  // Negative category balances remain visible in the list; only positive net spending forms the pie.
  const positiveCents = [...totals.values()].reduce((sum, row) => sum + Math.max(0, row.cents), 0)
  const rows = [...totals.values()].map(row => ({ ...row, percent: positiveCents > 0 ? Math.max(0, row.cents) / positiveCents * 100 : 0 })).sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name))
  return { incomeCents, bankCents, cardCents, totalCents: bankCents + cardCents, rows }
}
