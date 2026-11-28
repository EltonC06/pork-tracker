import type { CardInvoice } from '../types/invoices'

export function invoiceCardKey(invoice: Pick<CardInvoice, 'card_label' | 'card_last_four'>) {
  return JSON.stringify([invoice.card_label, invoice.card_last_four])
}

export function selectInvoices(invoices: CardInvoice[], month: string, card = '', invoiceId = '') {
  return invoices.filter(invoice => invoice.statement_month.startsWith(month) && (!card || invoiceCardKey(invoice) === card) && (!invoiceId || invoice.id === invoiceId))
}
