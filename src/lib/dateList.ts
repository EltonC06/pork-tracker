import { monthBounds, shiftMonth } from './months'

export type PeriodPreset = 'month' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'this_year' | 'all' | 'custom'
export type GroupByMode = 'day' | 'week' | 'month' | 'none'
export type ListOrder = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'description'

export function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month.slice(0, 7)}-01T12:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function periodRange(preset: PeriodPreset, month: string, start = '', end = '', today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza' }).format(new Date())) {
  const nowMonth = today.slice(0, 7)
  if (preset === 'month') return monthBounds(month)
  if (preset === 'this_month') return monthBounds(nowMonth)
  if (preset === 'last_month') return monthBounds(shiftMonth(nowMonth, -1))
  if (preset === 'this_year') return { start: `${today.slice(0, 4)}-01-01`, end: `${today.slice(0, 4)}-12-31` }
  if (preset === 'last_30_days' || preset === 'last_90_days') {
    const first = new Date(`${today}T12:00:00Z`)
    first.setUTCDate(first.getUTCDate() - (preset === 'last_30_days' ? 29 : 89))
    return { start: first.toISOString().slice(0, 10), end: today }
  }
  return { start: preset === 'custom' && start ? start : '0001-01-01', end: preset === 'custom' && end ? end : '9999-12-31' }
}

export function matchesListSearch(query: string, ...values: (string | null | undefined)[]) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  return values.some(value => normalize(value ?? '').includes(normalize(query.trim())))
}

export function sortDateItems<T extends { id: string; date: string; description: string | null }>(items: T[], order: ListOrder, amount: (item: T) => number) {
  return [...items].sort((a, b) => {
    const comparison = order === 'date_asc' ? a.date.localeCompare(b.date)
      : order === 'amount_desc' ? amount(b) - amount(a)
      : order === 'amount_asc' ? amount(a) - amount(b)
      : order === 'description' ? (a.description ?? '').localeCompare(b.description ?? '', 'pt-BR')
      : b.date.localeCompare(a.date)
    return comparison || b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
  })
}

export function groupDateItems<T extends { date: string }>(items: T[], mode: GroupByMode, order: ListOrder = 'date_desc') {
  const groups = new Map<string, { key: string; title: string; items: T[] }>()
  for (const item of items) {
    let key = item.date, title = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${item.date}T12:00:00Z`))
    if (mode === 'none') { key = 'all'; title = 'Todos os itens' }
    if (mode === 'month') { key = item.date.slice(0, 7); title = monthLabel(key) }
    if (mode === 'week') {
      const monday = new Date(`${item.date}T12:00:00Z`)
      monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
      key = monday.toISOString().slice(0, 10)
      const sunday = new Date(monday); sunday.setUTCDate(sunday.getUTCDate() + 6)
      const format = (date: Date) => date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
      title = `Semana ${format(monday)} a ${format(sunday)}`
    }
    if (!groups.has(key)) groups.set(key, { key, title, items: [] })
    groups.get(key)!.items.push(item)
  }
  // Keep chronological sections; ordering by amount/description applies inside each section.
  return [...groups.values()].sort((a, b) => order === 'date_asc' ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key))
}

export function paginateItems<T>(items: T[], page: number, size = 20) {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const currentPage = Math.max(0, Math.min(page, pageCount - 1))
  return { items: items.slice(currentPage * size, (currentPage + 1) * size), page: currentPage, pageCount }
}
