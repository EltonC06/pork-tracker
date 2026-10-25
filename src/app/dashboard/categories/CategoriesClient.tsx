'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'
import ExpenseCategoryCharts from '@/components/charts/ExpenseCategoryCharts'
import { createExpenseCategory, setExpenseCategoryActive } from '@/app/actions/expense-categories'
import { formatCurrency } from '@/lib/utils'
import {
  getExpensePeriodBounds, monthlyCategoryEvolution, summarizeCategories,
  type ExpenseEntry, type ExpensePeriod,
} from '@/lib/categoryAnalytics'
import type { ExpenseCategory } from '@/types/database'

interface CategoriesClientProps {
  categories: ExpenseCategory[]
  expenses: ExpenseEntry[]
  todayDate: string
}

export default function CategoriesClient({ categories, expenses, todayDate }: CategoriesClientProps) {
  const today = useMemo(() => new Date(`${todayDate}T12:00:00`), [todayDate])
  const [period, setPeriod] = useState<ExpensePeriod>('month')
  const [selectedKey, setSelectedKey] = useState('')
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()

  const bounds = getExpensePeriodBounds(period, today)
  const summary = useMemo(
    () => summarizeCategories(expenses, categories, bounds.start, bounds.end),
    [bounds.start, bounds.end, expenses, categories]
  )
  const monthly = useMemo(
    () => monthlyCategoryEvolution(expenses, categories, selectedKey, today),
    [today, expenses, categories, selectedKey]
  )
  const selectedName = categories.find(category => category.id === selectedKey)?.name
    ?? summary.rows.find(row => row.key === selectedKey)?.name
    ?? null

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      try {
        await createExpenseCategory(newName)
        setNewName('')
        toast.success('Categoria cadastrada.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível cadastrar.')
      }
    })
  }

  function handleToggle(category: ExpenseCategory) {
    startTransition(async () => {
      try {
        await setExpenseCategoryActive(category.id, !category.active)
        toast.success(category.active ? 'Categoria desativada. O histórico foi preservado.' : 'Categoria reativada.')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar.')
      }
    })
  }

  return (
    <div className="expense-categories-page">
      <header className="page-header">
        <div>
          <span className="expense-category-eyebrow"><Tag size={15} /> Análise de gastos</span>
          <h1>Categorias de despesas</h1>
          <p className="expense-category-intro">Veja quanto cada categoria representa do total gasto e como evolui mês a mês.</p>
        </div>
      </header>

      <div className="expense-category-period" role="group" aria-label="Período do resumo">
        <button type="button" className={period === 'week' ? 'active' : ''} aria-pressed={period === 'week'} onClick={() => setPeriod('week')}>Esta semana</button>
        <button type="button" className={period === 'month' ? 'active' : ''} aria-pressed={period === 'month'} onClick={() => setPeriod('month')}>Este mês</button>
      </div>

      <div className="expense-category-kpis">
        <div className="kpi-card">
          <span>Despesas no período</span>
          <strong>{formatCurrency(summary.totalCents / 100)}</strong>
          <small>{`${bounds.start.split('-').reverse().join('/')} a ${bounds.end.split('-').reverse().join('/')}`}</small>
        </div>
        <div className="kpi-card">
          <span>Lançamentos</span>
          <strong>{summary.count}</strong>
          <small>Somente despesas realizadas</small>
        </div>
        <div className="kpi-card">
          <span>Categorias com gastos</span>
          <strong>{summary.rows.length}</strong>
          <small>Inclui “Sem categoria” quando houver</small>
        </div>
      </div>

      <section className="glass-card expense-category-section">
        <h2>Distribuição por categoria</h2>
        <p>Percentual calculado sobre o total de despesas do período selecionado.</p>
        {summary.rows.length ? (
          <div className="expense-category-list">
            {summary.rows.map((row, index) => (
              <div className="expense-category-row" key={row.key}>
                <div className="expense-category-row-title">
                  <span className={`expense-category-swatch color-${index % 8}`} aria-hidden="true" />
                  <strong>{row.name}</strong>
                  <span>{row.count} {row.count === 1 ? 'lançamento' : 'lançamentos'}</span>
                </div>
                <div className="expense-category-row-values">
                  <strong>{formatCurrency(row.cents / 100)}</strong>
                  <span>{row.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%</span>
                </div>
                <div className="expense-category-progress" role="img" aria-label={`${row.name}: ${row.percent.toFixed(1)}% das despesas`}>
                  <div style={{ width: `${row.percent}%`, background: `var(--category-color-${index % 8})` }} />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="expense-category-empty">Nenhuma despesa registrada neste período.</p>}
      </section>

      <section className="glass-card expense-category-section">
        <div className="expense-category-section-heading">
          <div>
            <h2>Explore uma categoria</h2>
            <p>Escolha uma categoria para compará-la ao total nos últimos 12 meses.</p>
          </div>
          <select className="input expense-category-filter" aria-label="Categoria da evolução mensal" value={selectedKey} onChange={event => setSelectedKey(event.target.value)}>
            <option value="">Somente total</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            {summary.rows.filter(row => row.key.startsWith('legacy:')).map(row => <option key={row.key} value={row.key}>{row.name}</option>)}
          </select>
        </div>
      </section>

      <ExpenseCategoryCharts rows={summary.rows} monthly={monthly} selectedName={selectedName} />

      <section className="glass-card expense-category-section">
        <h2>Gerenciar categorias</h2>
        <p>As categorias iniciais e as suas ficam disponíveis no seletor de despesas.</p>
        <form onSubmit={handleCreate} className="expense-category-create">
          <label className="label" htmlFor="new-expense-category">Nova categoria</label>
          <div>
            <input id="new-expense-category" className="input" value={newName} onChange={event => setNewName(event.target.value)} maxLength={120} placeholder="Ex.: Pets, Viagens, Presentes" required />
            <button type="submit" className="btn-primary" disabled={isPending}><Plus size={17} /> Cadastrar</button>
          </div>
        </form>
        <div className="expense-category-catalog">
          {categories.map(category => (
            <div key={category.id} className="expense-category-catalog-row">
              <div>
                <strong>{category.name}</strong>
                <span>{category.is_default ? 'Inicial' : 'Personalizada'} · {category.active ? 'Ativa' : 'Inativa'}</span>
              </div>
              <button type="button" className="btn-ghost" disabled={isPending} onClick={() => handleToggle(category)}>
                {category.active ? 'Desativar' : 'Reativar'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
