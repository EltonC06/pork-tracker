import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayoutClient from './DashboardLayoutClient'

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

  const [{ data: accountTypes }, { data: txCategories }] = await Promise.all([
    db
      .from('account_types')
      .select('id, name, icon, color')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    db
      .from('transactions')
      .select('category')
      .eq('user_id', user.id)
      .not('category', 'is', null)
      .limit(100),
  ])

  const distinctCategories = Array.from(
    new Set((txCategories || []).map((t: { category: string | null }) => t.category).filter(Boolean))
  ) as string[]

  return (
    <DashboardLayoutClient
      accounts={accountTypes ?? []}
      categories={distinctCategories}
    >
      {children}
    </DashboardLayoutClient>
  )
}

