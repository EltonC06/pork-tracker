'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const nameSchema = z.string().trim().min(1, 'Informe o nome da categoria.').max(120, 'Use até 120 caracteres.')
const idSchema = z.string().uuid()

export async function createExpenseCategory(name: string) {
  const validName = nameSchema.safeParse(name)
  if (!validName.success) throw new Error(validName.error.issues[0]?.message ?? 'Nome inválido.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const { error } = await supabase.from('expense_categories').insert({
    user_id: user.id,
    name: validName.data,
  })
  if (error?.code === '23505') throw new Error('Essa categoria já está cadastrada.')
  if (error) throw new Error('Não foi possível cadastrar a categoria.')

  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/categories')
  return { success: true }
}

export async function setExpenseCategoryActive(id: string, active: boolean) {
  const validId = idSchema.safeParse(id)
  if (!validId.success || typeof active !== 'boolean') throw new Error('Categoria inválida.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado.')

  const { data, error } = await supabase
    .from('expense_categories')
    .update({ active })
    .eq('id', validId.data)
    .eq('user_id', user.id)
    .select('id')
    .single()

  if (error || !data) throw new Error('Não foi possível atualizar a categoria.')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/categories')
  return { success: true }
}
