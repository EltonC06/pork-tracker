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

  return (
    <DashboardLayoutClient>
      {children}
    </DashboardLayoutClient>
  )
}
