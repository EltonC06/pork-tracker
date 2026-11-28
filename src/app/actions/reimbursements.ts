'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validISODate } from '@/lib/interInvoice'

const fields = z.object({
  description: z.string().trim().min(1, 'Descreva o motivo do reembolso.').max(500),
  due_date: z.string().refine(validISODate, 'Prazo inválido.'),
  status: z.enum(['to_claim', 'claimed', 'not_reimbursed', 'reimbursed']),
})
const createSchema = fields.extend({ source: z.enum(['bank', 'card']), expenseId: z.string().uuid() })

export async function createReimbursement(input: unknown) {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const { source, expenseId, ...values } = parsed.data
  // The database reads the owned expense and snapshots its amount and date atomically.
  const { error } = await db.from('reimbursements').insert({
    ...values, user_id: user.id, source,
    transaction_id: source === 'bank' ? expenseId : null,
    invoice_item_id: source === 'card' ? expenseId : null,
  })
  if (error?.code === '23505') throw new Error('Este gasto já está na lista de reembolsos.')
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard', 'layout')
}

export async function updateReimbursement(id: string, input: unknown) {
  const parsed = fields.safeParse(input)
  if (!z.string().uuid().safeParse(id).success || !parsed.success) throw new Error('Revise o motivo, prazo e situação.')
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const { error } = await db.from('reimbursements').update(parsed.data).eq('id', id).eq('user_id', user.id).select('id').single()
  if (error) throw new Error('Não foi possível atualizar o reembolso.')
  revalidatePath('/dashboard', 'layout')
}

export async function deleteReimbursement(id: string) {
  if (!z.string().uuid().safeParse(id).success) throw new Error('Reembolso inválido.')
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Não autenticado.')
  const { error } = await db.from('reimbursements').delete().eq('id', id).eq('user_id', user.id).select('id').single()
  if (error) throw new Error('Não foi possível remover o acompanhamento.')
  revalidatePath('/dashboard', 'layout')
}
