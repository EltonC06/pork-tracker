'use client'

import { statementSummary, type StatementEntry } from '@/lib/statements'
import { categoryKey } from '@/lib/categoryAnalytics'
import type { ExpenseCategoryOption } from '@/types/database'
import ExpenseCategoryCharts from '@/components/charts/ExpenseCategoryCharts'
import { formatCurrency } from '@/lib/utils'
import styles from './invoices.module.css'

export default function StatementAnalysis({ entries, categories, month, category = '', showDetails = true, cardOnly = false }: { entries: StatementEntry[]; categories: ExpenseCategoryOption[]; month: string; category?: string; showDetails?: boolean; cardOnly?: boolean }) {
  const period = entries.filter(entry => entry.date.startsWith(month))
  const selected = category ? period.filter(entry => categoryKey(entry, categories).key === category) : period
  const summary = statementSummary(selected, categories)
  const monthly = !showDetails ? [] : Array.from({ length: 12 }, (_, i) => {
    const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 12 + i, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const rows = entries.filter(entry => entry.date.startsWith(key))
    return { month: key, label: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), total: statementSummary(rows, categories).totalCents, selected: statementSummary(rows.filter(entry => categoryKey(entry, categories).key === category), categories).totalCents }
  })
  return <>
    <dl className={styles.stats}>
      {cardOnly ? <>
        <div><dt>Total do cartão</dt><dd>{formatCurrency(summary.cardCents / 100)}</dd></div>
        <div><dt>Lançamentos</dt><dd>{selected.length}</dd></div>
        <div><dt>Estornos e créditos</dt><dd>{formatCurrency(Math.abs(selected.reduce((sum, entry) => sum + Math.min(0, Math.round(entry.amount * 100)), 0)) / 100)}</dd></div>
      </> : <>
        <div><dt>Gastos no banco</dt><dd>{formatCurrency(summary.bankCents / 100)}</dd></div>
        <div><dt>Gastos no cartão</dt><dd>{formatCurrency(summary.cardCents / 100)}</dd></div>
        <div><dt>Despesas líquidas</dt><dd>{formatCurrency(summary.totalCents / 100)}</dd></div>
      </>}
    </dl>
    {showDetails && <>
    <ExpenseCategoryCharts rows={summary.rows.filter(row => row.cents > 0)} monthly={monthly} selectedName={category ? summary.rows[0]?.name ?? null : null} />
    <section className={`glass-card ${styles.panel}`} aria-label="Totais e percentuais por categoria">
      <h2 className={styles.title}>Distribuição por categoria</h2>
      <p className={styles.muted}>Estornos reduzem os gastos. Percentuais consideram as categorias com saldo positivo no período.</p>
      <ul className={styles.categoryList}>{summary.rows.map(row => <li key={row.key}><span>{row.name} · {row.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span><strong>{formatCurrency(row.cents / 100)}</strong></li>)}</ul>
      {!summary.rows.length && <p className={styles.muted}>Nenhuma despesa neste mês.</p>}
    </section>
    </>}
  </>
}
