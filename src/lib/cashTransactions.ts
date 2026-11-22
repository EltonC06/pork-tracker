import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Transaction } from '@/types/database'

export async function loadCashTransactions(): Promise<Transaction[]> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const transactions: Transaction[] = []
  for (let page = 0; ; page++) {
    const result = await db.from('transactions').select('*').eq('user_id', user.id)
      .order('date', { ascending: false }).order('id').range(page * 500, page * 500 + 499)
    if (result.error) throw new Error('Não foi possível consultar o extrato bancário.')
    transactions.push(...result.data)
    if (result.data.length < 500) break
  }
  return transactions
}
