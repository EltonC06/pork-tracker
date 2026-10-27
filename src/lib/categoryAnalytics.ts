import type { ExpenseCategoryOption } from '@/types/database'

export interface ExpenseEntry {
  category_id: string | null
  category: string | null
  amount: number
  date: string
}

export interface CategoryTotal {
  key: string
  name: string
  cents: number
  count: number
  percent: number
}

export type ExpensePeriod = 'week' | 'month'

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getExpensePeriodBounds(period: ExpensePeriod, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(start)
  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    end.setDate(start.getDate() + 6)
  } else {
    start.setDate(1)
    end.setMonth(start.getMonth() + 1, 0)
  }
  return { start: dateKey(start), end: dateKey(end) }
}

export function categoryKey(entry: ExpenseEntry, categories: ExpenseCategoryOption[]) {
  const byId = entry.category_id && categories.find(item => item.id === entry.category_id)
  if (byId) return { key: byId.id, name: byId.name }
  const legacyName = entry.category?.trim()
  if (legacyName) {
    const byName = categories.find(item => item.name.toLocaleLowerCase('pt-BR') === legacyName.toLocaleLowerCase('pt-BR'))
    return byName
      ? { key: byName.id, name: byName.name }
      : { key: `legacy:${legacyName.toLocaleLowerCase('pt-BR')}`, name: legacyName }
  }
  return { key: 'uncategorized', name: 'Sem categoria' }
}

export function summarizeCategories(
  entries: ExpenseEntry[],
  categories: ExpenseCategoryOption[],
  start: string,
  end: string
) {
  const totals = new Map<string, Omit<CategoryTotal, 'percent'>>()
  let totalCents = 0
  for (const entry of entries) {
    if (entry.date < start || entry.date > end) continue
    const cents = Math.round(Number(entry.amount) * 100)
    if (!Number.isFinite(cents) || cents < 0) continue
    const { key, name } = categoryKey(entry, categories)
    const previous = totals.get(key)
    totals.set(key, {
      key,
      name,
      cents: (previous?.cents ?? 0) + cents,
      count: (previous?.count ?? 0) + 1,
    })
    totalCents += cents
  }
  const rows = Array.from(totals.values())
    .map(row => ({ ...row, percent: totalCents > 0 ? row.cents / totalCents * 100 : 0 }))
    .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, 'pt-BR'))
  return { totalCents, count: rows.reduce((total, row) => total + row.count, 0), rows }
}

export function monthlyCategoryEvolution(
  entries: ExpenseEntry[],
  categories: ExpenseCategoryOption[],
  selectedKey: string,
  today = new Date()
) {
  const months: Array<{ month: string; label: string; total: number; selected: number }> = []
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1)
    months.push({
      month: dateKey(date).slice(0, 7),
      label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date),
      total: 0,
      selected: 0,
    })
  }
  const monthMap = new Map(months.map(month => [month.month, month]))
  for (const entry of entries) {
    const month = monthMap.get(entry.date.slice(0, 7))
    if (!month) continue
    const cents = Math.round(Number(entry.amount) * 100)
    if (!Number.isFinite(cents) || cents < 0) continue
    month.total += cents
    if (categoryKey(entry, categories).key === selectedKey) month.selected += cents
  }
  return months
}
