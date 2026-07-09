'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Processa todos os planos recorrentes que estão atrasados ou vencem hoje
export async function processPendingPlans() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const today = new Date().toISOString().split('T')[0]

  // Encontra planos pendentes
  const { data: pending } = await db
    .from('recurring_plans')
    .select('*')
    .eq('user_id', user.id)
    .lte('target_date', today)

  if (!pending || pending.length === 0) return

  for (const plan of pending) {
    const currentProcessDate = new Date(plan.target_date)
    const todayDate = new Date(today)
    let nextDateStr = plan.target_date

    // Vamos processar quantas vezes forem necessárias se ficou meses sem logar
    while (currentProcessDate <= todayDate) {
      const processDateStr = currentProcessDate.toISOString().split('T')[0]

      // 1. Criar transação para este ciclo
      await db.from('transactions').insert({
        user_id: user.id,
        account_type_id: plan.account_type_id,
        amount: plan.amount,
        type: plan.type,
        date: processDateStr,
        description: `Automático: ${plan.name}`,
      })

      // 2. Atualizar saldo (novo snapshot)
      if (plan.account_type_id) {
        const { data: latest } = await db
          .from('account_snapshots')
          .select('balance')
          .eq('account_type_id', plan.account_type_id)
          .eq('user_id', user.id)
          .order('snapshot_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)

        const curBal = latest?.[0]?.balance ?? 0
        const newBal = curBal + (plan.type === 'income' ? plan.amount : -plan.amount)
        
        await db.from('account_snapshots').insert({
          user_id: user.id,
          account_type_id: plan.account_type_id,
          balance: newBal,
          snapshot_date: processDateStr,
          notes: `Recorrência processada: ${plan.name}`,
        })
      }

      // 3. Calcular próximo ciclo
      if (plan.frequency === 'monthly') {
        currentProcessDate.setUTCMonth(currentProcessDate.getUTCMonth() + 1)
      } else if (plan.frequency === 'yearly') {
        currentProcessDate.setUTCFullYear(currentProcessDate.getUTCFullYear() + 1)
      } else {
        // one-time, sai do loop
        break
      }
    }

    // 4. Atualizar o plano no BD para a próxima data (ou deletar se one-time)
    if (plan.frequency === 'one-time') {
      await db.from('recurring_plans').delete().eq('id', plan.id)
    } else {
      nextDateStr = currentProcessDate.toISOString().split('T')[0]
      await db.from('recurring_plans')
        .update({ target_date: nextDateStr, last_processed_date: today })
        .eq('id', plan.id)
    }
  }

  // Se algo mudou, já dar um revalidate
  revalidatePath('/dashboard')
}

const planSchema = z.object({
  account_type_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  type: z.enum(['income', 'expense']),
  frequency: z.enum(['monthly', 'yearly', 'one-time']),
  target_date: z.string(),
})

export async function createRecurringPlan(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const parsed = planSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) throw new Error('Dados inválidos: ' + parsed.error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from('recurring_plans').insert({
    user_id: user.id,
    ...parsed.data,
  })

  if (error) throw new Error('Erro ao criar plano: ' + error.message)

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteRecurringPlan(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { error } = await db.from('recurring_plans').delete().eq('id', id).eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
}
