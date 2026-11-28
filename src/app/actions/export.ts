'use server'

import { loadReimbursements } from '@/lib/reimbursementData'
import { createClient } from '@/lib/supabase/server'
import type { AccountType, AccountSnapshot, Transaction, RecurringPlan, StockPosition, StockPriceHistory } from '@/types/database'
import { loadInvoiceData } from '@/lib/invoiceData'
import { loadCashTransactions } from '@/lib/cashTransactions'

export async function fetchAllUserData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [
    { data: accounts },
    { data: snapshots },
    transactions,
    { data: plans },
    { data: positions },
    { data: history },
    invoiceData,
    reimbursementData,
  ] = await Promise.all([
    db.from('account_types').select('*').eq('user_id', user.id),
    db.from('account_snapshots').select('*').eq('user_id', user.id),
    loadCashTransactions(),
    db.from('recurring_plans').select('*').eq('user_id', user.id),
    db.from('stock_positions').select('*').eq('user_id', user.id),
    db.from('stock_price_history').select('*').eq('user_id', user.id),
    loadInvoiceData(),
    loadReimbursements(),
  ])

  return {
    accounts: accounts as AccountType[] || [],
    snapshots: snapshots as AccountSnapshot[] || [],
    transactions: transactions as Transaction[] || [],
    plans: plans as RecurringPlan[] || [],
    positions: positions as StockPosition[] || [],
    history: history as StockPriceHistory[] || [],
    invoiceData,
    reimbursementData,
  }
}
