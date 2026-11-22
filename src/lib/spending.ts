import type { Transaction } from '@/types/database'
import type { CardInvoiceItem, InvoicePayment } from '@/types/invoices'

export function summarizeSpending(
  transactions: Transaction[], items: CardInvoiceItem[], payments: InvoicePayment[],
  start: string, end: string,
) {
  const allocated = new Map<string, number>()
  for (const payment of payments) {
    allocated.set(payment.transaction_id, (allocated.get(payment.transaction_id) ?? 0) + payment.amount_cents)
  }
  const categories = new Map<string, number>()
  let directCents = 0
  let cardCents = 0
  let unlinkedPossiblePayments = 0
  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.date < start || tx.date > end) continue
    const cents = Math.max(0, Math.round(Number(tx.amount) * 100) - (allocated.get(tx.id) ?? 0))
    directCents += cents
    categories.set(tx.category || 'Sem categoria', (categories.get(tx.category || 'Sem categoria') ?? 0) + cents)
    if (cents && /fatura|pagamento.*cart[aã]o|cart[aã]o.*pagamento/i.test(tx.description ?? '')) unlinkedPossiblePayments++
  }
  for (const item of items) {
    if (item.date < start || item.date > end) continue
    cardCents += item.amount_cents
    categories.set(item.category || 'Sem categoria', (categories.get(item.category || 'Sem categoria') ?? 0) + item.amount_cents)
  }
  return {
    directCents, cardCents, totalCents: directCents + cardCents, unlinkedPossiblePayments,
    categories: Array.from(categories, ([category, amountCents]) => ({ category, amountCents }))
      .filter(item => item.amountCents !== 0).sort((a, b) => b.amountCents - a.amountCents),
  }
}
