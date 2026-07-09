'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const transactionSchema = z.object({
  account_type_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().min(0.01),
  type: z.enum(['income', 'expense']),
  date: z.string().optional(), // YYYY-MM-DD
  description: z.string().optional(),
})

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado')

  const parsed = transactionSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) {
    throw new Error('Dados inválidos: ' + parsed.error.message)
  }

  const { account_type_id, amount, type, date, description } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 1. Insert Transaction
  const { error: txError } = await db
    .from('transactions')
    .insert({
      user_id: user.id,
      account_type_id: account_type_id || null,
      amount,
      type,
      date: date || new Date().toISOString().split('T')[0],
      description: description || null,
    })

  if (txError) throw new Error('Erro ao salvar transação: ' + txError.message)

  // 2. Adjust Balance via Snapshot
  if (account_type_id) {
    // Pegar o saldo mais recente dessa conta
    const { data: latestSnapshots } = await db
      .from('account_snapshots')
      .select('balance, snapshot_date')
      .eq('account_type_id', account_type_id)
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)

    const currentBalance = latestSnapshots?.[0]?.balance ?? 0
    const netAmount = type === 'income' ? amount : -amount
    const newBalance = currentBalance + netAmount

    // Criar um novo snapshot atualizado
    const { error: snapError } = await db
      .from('account_snapshots')
      .insert({
        user_id: user.id,
        account_type_id,
        balance: newBalance,
        snapshot_date: date || new Date().toISOString().split('T')[0],
        notes: `Atualização automática: ${type === 'income' ? '+' : '-'}${amount} (${description || 'Transação pontual'})`,
      })

    if (snapError) throw new Error('Transação salva, mas falha ao atualizar saldo da conta.')
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const parsed = transactionSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) throw new Error('Dados inválidos: ' + parsed.error.message)

  const { amount, type, date, description } = parsed.data
  const db = supabase as any

  const { data: oldTx, error: fetchErr } = await db.from('transactions').select('*').eq('id', id).eq('user_id', user.id).single()
  if (fetchErr || !oldTx) throw new Error('Transação não encontrada')

  const { error: txError } = await db.from('transactions').update({
    amount, type, date: date || new Date().toISOString().split('T')[0], description: description || null
  }).eq('id', id)

  if (txError) throw new Error('Erro ao atualizar transação: ' + txError.message)

  if (oldTx.account_type_id) {
    const oldImpact = oldTx.type === 'income' ? oldTx.amount : -oldTx.amount
    const newImpact = type === 'income' ? amount : -amount
    const difference = newImpact - oldImpact

    if (difference !== 0) {
      const { data: latestSnapshots } = await db.from('account_snapshots')
        .select('balance')
        .eq('account_type_id', oldTx.account_type_id)
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)

      const currentBalance = latestSnapshots?.[0]?.balance ?? 0
      const newBalance = currentBalance + difference

      await db.from('account_snapshots').insert({
        user_id: user.id,
        account_type_id: oldTx.account_type_id,
        balance: newBalance,
        snapshot_date: date || new Date().toISOString().split('T')[0],
        notes: `Ajuste (Edição de Transação): ${difference > 0 ? '+' : ''}${difference}`,
      })
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const db = supabase as any
  const { data: oldTx } = await db.from('transactions').select('*').eq('id', id).eq('user_id', user.id).single()
  
  const { error } = await db.from('transactions').delete().eq('id', id).eq('user_id', user.id)
  if (error) throw new Error(error.message)

  if (oldTx && oldTx.account_type_id) {
    const oldImpact = oldTx.type === 'income' ? oldTx.amount : -oldTx.amount
    const difference = -oldImpact

    if (difference !== 0) {
      const { data: latestSnapshots } = await db.from('account_snapshots')
        .select('balance')
        .eq('account_type_id', oldTx.account_type_id)
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)

      const currentBalance = latestSnapshots?.[0]?.balance ?? 0
      const newBalance = currentBalance + difference

      await db.from('account_snapshots').insert({
        user_id: user.id,
        account_type_id: oldTx.account_type_id,
        balance: newBalance,
        snapshot_date: new Date().toISOString().split('T')[0],
        notes: `Ajuste (Exclusão de Transação): ${difference > 0 ? '+' : ''}${difference}`,
      })
    }
  }

  revalidatePath('/dashboard')
}
