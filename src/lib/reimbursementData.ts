import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { ReimbursementData } from '@/types/reimbursements'

export async function loadReimbursements(): Promise<ReimbursementData> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const records: ReimbursementData['records'] = []
  for (let page = 0; ; page++) {
    const { data, error } = await db.from('reimbursements').select('*').eq('user_id', user.id).order('due_date').order('id').range(page * 500, page * 500 + 499)
    if (error) {
      if (['42P01', 'PGRST205'].includes(error.code)) return { records: [], available: false }
      throw new Error('Não foi possível carregar os reembolsos.')
    }
    records.push(...data)
    if (data.length < 500) break
  }
  return { records, available: true }
}
