import { createClient } from '@/lib/supabase/server'
import StocksClient from './StocksClient'
import type { StockPosition } from '@/types/database'

export default async function StocksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: positions } = await db
    .from('stock_positions')
    .select('*')
    .eq('user_id', user!.id)
    .order('ticker', { ascending: true })

  return <StocksClient positions={(positions as StockPosition[]) ?? []} />
}
