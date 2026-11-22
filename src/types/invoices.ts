export interface CardInvoice {
  id: string
  user_id: string
  card_label: string
  card_last_four: string
  due_date: string
  statement_month: string
  total_cents: number
  content_hash: string
  created_at: string
}

export interface CardInvoiceItem {
  id: string
  user_id: string
  invoice_id: string
  position: number
  date: string
  description: string
  card_last_four: string
  amount_cents: number
  category: string
  category_id: string | null
  installment: number | null
  installments: number | null
}

/** Archived records from the former reconciliation model; never used in spending. */
export interface InvoicePayment {
  id: string
  user_id: string
  invoice_id: string
  transaction_id: string
  amount_cents: number
}

export interface InvoiceData {
  invoices: CardInvoice[]
  items: CardInvoiceItem[]
  available: boolean
}
