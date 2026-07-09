import { createClient } from '@/lib/supabase/server'
import PlanningClient from './PlanningClient'
import type { AccountType, AccountSnapshot, RecurringPlan } from '@/types/database'

export default async function PlanningPage() {
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

  const { data: recurringPlans } = await db
    .from('recurring_plans')
    .select('*')
    .eq('user_id', user!.id)

  return (
    <PlanningClient
      accountTypes={(accountTypes as AccountType[]) ?? []}
      snapshots={(snapshots as AccountSnapshot[]) ?? []}
      recurringPlans={(recurringPlans as RecurringPlan[]) ?? []}
    />
  )
}
