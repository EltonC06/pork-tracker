'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const itemSchema = z.object({
  amount: z.number().min(0.01),
  type: z.enum(['income', 'expense']),
  category: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
})

const batchSchema = z.object({
  account_type_id: z.string().uuid(),
  transactions: z.array(itemSchema).min(1),
})

export interface ImportBatchData {
  account_type_id: string
  transactions: Array<{
    amount: number
    type: 'income' | 'expense'
    category?: string | null
    date: string
    description: string
  }>
}

/**
 * Inserção em lote de transações importadas de arquivo OFX.
 * Registra o fluxo de caixa sem alterar o saldo da conta (snapshots manuais).
 */
export async function importTransactionsBatch(input: ImportBatchData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado.')
  }

  const parsed = batchSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error('Dados inválidos para importação: ' + parsed.error.message)
  }

  const { account_type_id, transactions } = parsed.data

  // Prepare batch records
  const rows = transactions.map(tx => ({
    user_id: user.id,
    account_type_id,
    amount: tx.amount,
    type: tx.type,
    category: tx.category ? tx.category.trim() : null,
    date: tx.date,
    description: tx.description.trim(),
  }))

  const db = supabase as any

  const { error } = await db.from('transactions').insert(rows)

  if (error) {
    throw new Error('Erro ao salvar transações no banco de dados: ' + error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transactions')
  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard/planning')

  return {
    success: true,
    count: rows.length,
  }
}
