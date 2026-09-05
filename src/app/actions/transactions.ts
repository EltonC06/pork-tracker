'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const transactionSchema = z.object({
  account_type_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().min(0.01),
  type: z.enum(['income', 'expense']),
  category: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  description: z.string().optional(),
})

/**
 * Criar transação — APENAS registro de fluxo de caixa.
 * NÃO cria snapshots automaticamente. O saldo da conta é
 * controlado exclusivamente por snapshots manuais.
 */
export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado')

  const parsed = transactionSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) {
    throw new Error('Dados inválidos: ' + parsed.error.message)
  }

  const { account_type_id, amount, type, category, date, description } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('transactions')
    .insert({
      user_id: user.id,
      account_type_id: account_type_id || null,
      amount,
      type,
      category: category || null,
      date: date || new Date().toISOString().split('T')[0],
      description: description || null,
    })

  if (error) throw new Error('Erro ao salvar transação: ' + error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard/planning')
  return { success: true }
}

/**
 * Atualizar transação existente.
 * Apenas atualiza os campos da transação, sem mexer em snapshots.
 */
export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const parsed = transactionSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) throw new Error('Dados inválidos: ' + parsed.error.message)

  const { account_type_id, amount, type, category, date, description } = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const updateData: Record<string, any> = {
    amount,
    type,
    category: category || null,
    date: date || new Date().toISOString().split('T')[0],
    description: description || null,
  }
  if (account_type_id !== undefined) {
    updateData.account_type_id = account_type_id || null
  }

  const { error } = await db
    .from('transactions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error('Erro ao atualizar transação: ' + error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard/planning')
  return { success: true }
}

/**
 * Deletar transação.
 * Apenas remove o registro de fluxo, sem reverter snapshots.
 */
export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard/planning')
}

