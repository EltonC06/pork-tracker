import { createClient } from '@/lib/supabase/server'
import type { ExpenseCategory } from '@/types/database'
import type { ExpenseEntry } from '@/lib/categoryAnalytics'
import CategoriesClient from './CategoriesClient'

export const metadata = {
  title: 'Categorias de Despesas | Pork Tracker',
  description: 'Participação e evolução das despesas por categoria',
}

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null // O layout protegido redireciona visitantes.

  const { data: categories, error: categoriesError } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')
  if (categoriesError) throw new Error('Não foi possível carregar as categorias.')

  const todayDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const oldestMonth = new Date(Date.UTC(Number(todayDate.slice(0, 4)), Number(todayDate.slice(5, 7)) - 11, 1)).toISOString().slice(0, 10)
  // Paginação explícita e ordem estável: o Data API limita respostas por requisição.
  const expenses: ExpenseEntry[] = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('transactions')
      .select('category_id, category, amount, date')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('date', oldestMonth)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw new Error('Não foi possível carregar as despesas.')
    const batch = (data ?? []) as ExpenseEntry[]
    expenses.push(...batch)
    if (batch.length < pageSize) break
  }

  return (
    <CategoriesClient
      categories={(categories as ExpenseCategory[]) ?? []}
      expenses={expenses}
      todayDate={todayDate}
    />
  )
}
