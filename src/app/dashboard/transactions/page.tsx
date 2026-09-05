import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransactionsClient from './TransactionsClient'
import type { Transaction, AccountType } from '@/types/database'

export const metadata = {
  title: 'Extrato de Lançamentos | Pork Tracker',
  description: 'Histórico unificado e gerenciamento de transações financeiras',
}

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const db = supabase as any

  const [{ data: transactions }, { data: accountTypes }] = await Promise.all([
    db
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
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
    />
  )
}
