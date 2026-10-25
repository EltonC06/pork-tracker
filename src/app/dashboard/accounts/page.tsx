import { createClient } from '@/lib/supabase/server'
import AccountsClient from './AccountsClient'
import type { AccountType, AccountSnapshot, ExpenseCategoryOption } from '@/types/database'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: accountTypes } = await db
    .from('account_types')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })

  const { data: snapshots } = await db
    .from('account_snapshots')
    .select('*')
    .eq('user_id', user!.id)
    .order('snapshot_date', { ascending: false })

  const { data: transactions } = await db
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: recurringPlans } = await db
    .from('recurring_plans')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: true })

  const { data: categories } = await db
    .from('expense_categories')
    .select('id, name, active')
    .eq('user_id', user!.id)
    .order('name')

  return (
    <AccountsClient
      accountTypes={(accountTypes as AccountType[]) ?? []}
      snapshots={(snapshots as AccountSnapshot[]) ?? []}
      transactions={transactions ?? []}
      recurringPlans={recurringPlans ?? []}
      categories={(categories as ExpenseCategoryOption[]) ?? []}
    />
  )
}
