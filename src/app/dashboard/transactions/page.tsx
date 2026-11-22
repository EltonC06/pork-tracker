import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransactionsClient from './TransactionsClient'
import { loadCashTransactions } from '@/lib/cashTransactions'
import type { Transaction, AccountType, ExpenseCategoryOption } from '@/types/database'

export const metadata = {
  title: 'Extrato bancário | Pork Tracker',
  description: 'Fluxo de caixa e gerenciamento dos lançamentos bancários',
}

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = supabase as any

  const [transactions, { data: accountTypes }, { data: categories }] = await Promise.all([
    loadCashTransactions(),
    db
      .from('account_types')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    db
      .from('expense_categories')
      .select('id, name, active')
      .eq('user_id', user.id)
      .order('name'),
  ])

  return (
    <TransactionsClient
      initialTransactions={(transactions as Transaction[]) ?? []}
      accounts={(accountTypes as AccountType[]) ?? []}
      categories={(categories as ExpenseCategoryOption[]) ?? []}
    />
  )
}
