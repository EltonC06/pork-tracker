import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from './DashboardLayoutClient'
import type { ExpenseCategoryOption } from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Run lazy execution for recurring plans
  try {
    const { processPendingPlans } = await import('@/app/actions/planning')
    await processPendingPlans()
  } catch (err) {
    console.error('Failed to process pending plans', err)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [{ data: accountTypes }, { data: categories }] = await Promise.all([
    db
      .from('account_types')
      .select('id, name, icon, color')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    db
      .from('expense_categories')
      .select('id, name, active')
      .eq('user_id', user.id)
      .order('name'),
  ])

  return (
    <DashboardLayoutClient
      accounts={accountTypes ?? []}
      categories={(categories as ExpenseCategoryOption[]) ?? []}
    >
      {children}
    </DashboardLayoutClient>
  )
}

