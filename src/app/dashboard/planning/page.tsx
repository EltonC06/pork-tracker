import { createClient } from '@/lib/supabase/server'
import PlanningClient from './PlanningClient'
import type { AccountType, AccountSnapshot, RecurringPlan, Transaction } from '@/types/database'

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Fetch all data in parallel
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0]

  const [
    { data: accountTypes },
    { data: snapshots },
    { data: recurringPlans },
    { data: monthTransactions },
  ] = await Promise.all([
    db.from('account_types').select('*').eq('user_id', user!.id).order('created_at', { ascending: true }),
    db.from('account_snapshots').select('*').eq('user_id', user!.id).order('snapshot_date', { ascending: false }),
    db.from('recurring_plans').select('*').eq('user_id', user!.id),
    db.from('transactions').select('*').eq('user_id', user!.id).gte('date', currentMonthStart).order('date', { ascending: false }),
  ])

  return (
    <PlanningClient
      accountTypes={(accountTypes as AccountType[]) ?? []}
      snapshots={(snapshots as AccountSnapshot[]) ?? []}
      recurringPlans={(recurringPlans as RecurringPlan[]) ?? []}
      monthTransactions={(monthTransactions as Transaction[]) ?? []}
    />
  )
}
