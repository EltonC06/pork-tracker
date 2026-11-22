import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getExpensePeriodBounds,
  monthlyCategoryEvolution,
  summarizeCategories,
} from '../src/lib/categoryAnalytics.ts'

const categories = [
  { id: 'food', name: 'Alimentação', active: true },
  { id: 'travel', name: 'Transporte', active: true },
]

test('weeks start on Monday and months use calendar boundaries', () => {
  const sunday = new Date(2026, 9, 25, 12)
  assert.deepEqual(getExpensePeriodBounds('week', sunday), { start: '2026-10-19', end: '2026-10-25' })
  assert.deepEqual(getExpensePeriodBounds('month', sunday), { start: '2026-10-01', end: '2026-10-31' })
})

test('category shares use expense cents, include uncategorized and exclude dates outside period', () => {
  const entries = [
    { category_id: 'food', category: 'Alimentação', amount: 30.01, date: '2026-10-01' },
    { category_id: 'food', category: 'Alimentação', amount: 0.02, date: '2026-10-02' },
    { category_id: 'travel', category: 'Transporte', amount: 20, date: '2026-10-03' },
    { category_id: null, category: null, amount: 49.97, date: '2026-10-04' },
    { category_id: 'food', category: 'Alimentação', amount: 1000, date: '2026-09-30' },
  ]
  const result = summarizeCategories(entries, categories, '2026-10-01', '2026-10-31')
  assert.equal(result.totalCents, 10000)
  assert.equal(result.count, 4)
  assert.equal(result.rows.find(row => row.key === 'food')?.cents, 3003)
  assert.equal(result.rows.find(row => row.key === 'food')?.percent, 30.03)
  assert.equal(result.rows.find(row => row.key === 'uncategorized')?.cents, 4997)
})

test('monthly evolution keeps zero months and selected category totals separate', () => {
  const entries = [
    { category_id: 'food', category: null, amount: 12.50, date: '2026-09-30' },
    { category_id: 'travel', category: null, amount: 8, date: '2026-10-01' },
    { category_id: 'food', category: null, amount: 2.25, date: '2026-10-02' },
  ]
  const months = monthlyCategoryEvolution(entries, categories, 'food', new Date(2026, 9, 25, 12))
  assert.equal(months.length, 12)
  assert.deepEqual(months.at(-2) && [months.at(-2).month, months.at(-2).total, months.at(-2).selected], ['2026-09', 1250, 1250])
  assert.deepEqual(months.at(-1) && [months.at(-1).month, months.at(-1).total, months.at(-1).selected], ['2026-10', 1025, 225])
  assert.equal(months[0].total, 0)
})
