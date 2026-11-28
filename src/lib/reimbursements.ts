import type { ExpenseCategoryOption, Transaction } from '@/types/database'
import type { CardInvoiceItem } from '@/types/invoices'
import type { Reimbursement, ReimbursementCandidate, ReimbursementStatus } from '@/types/reimbursements'
import { isInvoicePaymentTransaction } from './invoicePayments'

export const reimbursementLabels: Record<ReimbursementStatus, string> = {
  to_claim: 'Ainda a cobrar', claimed: 'Já cobrado', not_reimbursed: 'Não reembolsado', reimbursed: 'Reembolsado',
}

export function reimbursementFor(records: Reimbursement[], source: 'bank' | 'card', id: string) {
  return records.find(record => source === 'bank' ? record.transaction_id === id : record.invoice_item_id === id)
}

export function reimbursementCandidates(transactions: Transaction[], items: CardInvoiceItem[], categories: ExpenseCategoryOption[], records: Reimbursement[]): ReimbursementCandidate[] {
  return [
    ...transactions.filter(tx => tx.type === 'expense' && Number(tx.amount) > 0 && !isInvoicePaymentTransaction(tx, categories) && !reimbursementFor(records, 'bank', tx.id))
      .map(tx => ({ id: tx.id, source: 'bank' as const, description: tx.description || 'Sem descrição', date: tx.date, amountCents: Math.round(Number(tx.amount) * 100) })),
    ...items.filter(item => item.amount_cents > 0 && !reimbursementFor(records, 'card', item.id))
      .map(item => ({ id: item.id, source: 'card' as const, description: item.description, date: item.date, amountCents: item.amount_cents })),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description))
}

export function reimbursementSummary(records: Reimbursement[], today: string) {
  const pending = records.filter(record => record.status !== 'reimbursed')
  return {
    pending, received: records.filter(record => record.status === 'reimbursed'),
    pendingCents: pending.reduce((sum, record) => sum + Number(record.amount_cents), 0),
    overdue: pending.filter(record => record.due_date < today && ['to_claim', 'claimed'].includes(record.status)).length,
  }
}
