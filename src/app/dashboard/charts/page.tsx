import { createClient } from '@/lib/supabase/server'
import ChartsClient from './ChartsClient'

export default async function ChartsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: accountTypes } = await db
    .from('account_types')
    .select('id, name, icon, color')
    .eq('user_id', user!.id)

  const { data: snapshots } = await db
    .from('account_snapshots')
    .select('balance, snapshot_date, account_type_id')
    .eq('user_id', user!.id)
    .order('snapshot_date', { ascending: true })

  const { data: stocks } = await db
    .from('stock_positions')
    .select('ticker, quantity, avg_price, current_price')
    .eq('user_id', user!.id)

  const { data: priceHistory } = await db
    .from('stock_price_history')
    .select('ticker, price, recorded_date')
    .eq('user_id', user!.id)
    .order('recorded_date', { ascending: true })

  return (
    <ChartsClient
      accountTypes={accountTypes ?? []}
      snapshots={snapshots ?? []}
      stocks={stocks ?? []}
      priceHistory={priceHistory ?? []}
    />
  )
}
