import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransactionsClient from './TransactionsClient'
import type { Transaction, AccountType } from '@/types/database'
import { loadCashTransactions } from '@/lib/cashTransactions'
import { loadInvoiceData } from '@/lib/invoiceData'

export const metadata = {
  title: 'Extrato de Lançamentos | Pork Tracker',
  description: 'Histórico unificado e gerenciamento de transações financeiras',
}

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = supabase as any

  const [transactions, invoiceData, { data: accountTypes }] = await Promise.all([
    loadCashTransactions(),
    loadInvoiceData(),
    db
      .from('account_types')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <TransactionsClient
      initialTransactions={(transactions as Transaction[]) ?? []}
      accounts={(accountTypes as AccountType[]) ?? []}
      invoicePayments={invoiceData.payments}
    />
  )
}
