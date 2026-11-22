import { createClient } from '@/lib/supabase/server'

type Client = Awaited<ReturnType<typeof createClient>>

/** Resolve a category using the authenticated owner's rows, never a client-supplied label. */
export async function resolveExpenseCategory(
  supabase: Client,
  userId: string,
  categoryId: string | undefined,
  existingCategoryId?: string | null
) {
  if (!categoryId) return { category_id: null, category: null }

  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, name, active')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single()

  if (error || !data || (!data.active && data.id !== existingCategoryId)) {
    throw new Error('Selecione uma categoria de despesa válida e ativa.')
  }

  return { category_id: data.id, category: data.name }
}
