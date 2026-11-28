export type ReimbursementStatus = 'to_claim' | 'claimed' | 'not_reimbursed' | 'reimbursed'

export interface Reimbursement {
  id: string
  user_id: string
  source: 'bank' | 'card'
  transaction_id: string | null
  invoice_item_id: string | null
  description: string
  due_date: string
  status: ReimbursementStatus
  expense_description: string
  expense_date: string
  amount_cents: number
  reimbursed_at: string | null
  created_at: string
  updated_at: string
}

export interface ReimbursementData { records: Reimbursement[]; available: boolean }
export interface ReimbursementCandidate { id: string; source: 'bank' | 'card'; description: string; date: string; amountCents: number }
