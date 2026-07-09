'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Stock Positions ──────────────────────────────────────────────

export async function createStockPosition(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const ticker = (formData.get('ticker') as string).toUpperCase().trim()
  const quantity = parseFloat(formData.get('quantity') as string)
  const avg_price = parseFloat(formData.get('avg_price') as string)
  const current_price = formData.get('current_price')
    ? parseFloat(formData.get('current_price') as string)
    : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('stock_positions').insert({
    user_id: user.id,
    ticker,
    quantity,
    avg_price,
    current_price,
    last_updated: current_price ? new Date().toISOString().split('T')[0] : null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/stocks')
  revalidatePath('/dashboard')
}

export async function updateStockPosition(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const quantity = parseFloat(formData.get('quantity') as string)
  const avg_price = parseFloat(formData.get('avg_price') as string)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('stock_positions')
    .update({ quantity, avg_price })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/stocks')
}

export async function updateStockPrice(id: string, ticker: string, price: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const today = new Date().toISOString().split('T')[0]

  // Update current price on position
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('stock_positions')
    .update({ current_price: price, last_updated: today })
    .eq('id', id)
    .eq('user_id', user.id)

  if (updateError) throw new Error(updateError.message)

  // Upsert into price history (one record per ticker per day)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: historyError } = await (supabase as any)
    .from('stock_price_history')
    .upsert(
      { user_id: user.id, ticker, price, recorded_date: today },
      { onConflict: 'user_id,ticker,recorded_date' }
    )

  if (historyError) throw new Error(historyError.message)

  revalidatePath('/dashboard/stocks')
  revalidatePath('/dashboard')
}

export async function deleteStockPosition(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('stock_positions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/stocks')
  revalidatePath('/dashboard')
}
