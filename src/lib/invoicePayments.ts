import type { ExpenseCategoryOption } from '@/types/database'

export const INVOICE_PAYMENT_CATEGORY = 'Pagamento de fatura'

function normalized(value: string | null | undefined) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function isInvoicePayment(category: string | null | undefined) {
  return ['pagamento de fatura', 'fatura'].includes(normalized(category))
}

export function isInvoicePaymentDescription(description: string | null | undefined) {
  const text = normalized(description)
  return /(?:^| )(?:pagamento|pagto|pgto|pag)(?: de| da| do)? (?:fatura|cartao)(?: |$)/.test(text)
    || /(?:^| )fatura (?:[a-z0-9]+ )*(?:cartao|inter)(?: |$)/.test(text)
}

interface BankEntry { type: 'income' | 'expense'; category: string | null; category_id?: string | null; description: string | null }

export function isInvoicePaymentTransaction(entry: BankEntry, categories: ExpenseCategoryOption[] = []) {
  return entry.type === 'expense' && (isInvoicePayment(categories.find(category => category.id === entry.category_id)?.name ?? entry.category) || isInvoicePaymentDescription(entry.description))
}
