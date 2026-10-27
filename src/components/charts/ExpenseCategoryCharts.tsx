'use client'

import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { CategoryTotal } from '@/lib/categoryAnalytics'

const COLORS = [
  'var(--brand-400)', 'var(--success-400)', 'var(--warning-400)',
  'var(--danger-400)', 'var(--brand-200)', 'var(--success-600)',
  'var(--warning-500)', 'var(--brand-700)',
]

interface ExpenseCategoryChartsProps {
  rows: CategoryTotal[]
  monthly: Array<{ month: string; label: string; total: number; selected: number }>
  selectedName: string | null
}

const tooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--bg-border)',
  borderRadius: '0.75rem',
  color: 'var(--text-primary)',
}

export default function ExpenseCategoryCharts({ rows, monthly, selectedName }: ExpenseCategoryChartsProps) {
  const pieData = rows.map(row => ({ name: row.name, value: row.cents }))
  const barHeight = Math.max(250, rows.length * 44)
  return (
    <>
      <div className="expense-category-chart-grid">
        <section className="glass-card expense-category-chart" aria-label="Composição percentual das despesas">
          <h2>Composição das despesas</h2>
          <p>Participação de cada categoria no período.</p>
          {rows.length ? (
            <ResponsiveContainer width="100%" height={250} minWidth={0}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="78%" paddingAngle={2} isAnimationActive={false}>
                  {pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value) / 100)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="expense-category-empty">Nenhuma despesa neste período.</p>}
        </section>

        <section className="glass-card expense-category-chart" aria-label="Barras de despesas por categoria">
          <h2>Valor por categoria</h2>
          <p>Comparação em reais no período.</p>
          {rows.length ? (
            <ResponsiveContainer width="100%" height={barHeight} minWidth={0}>
              <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid stroke="var(--bg-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={value => `R$${Math.round(Number(value) / 100)}`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tickFormatter={value => String(value).length > 13 ? `${String(value).slice(0, 12)}…` : String(value)} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value) / 100)} />
                <Bar dataKey="cents" name="Despesas" radius={[0, 5, 5, 0]}>
                  {rows.map((row, index) => <Cell key={row.key} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="expense-category-empty">As barras aparecerão após o primeiro gasto.</p>}
        </section>
      </div>

      <section className="glass-card expense-category-chart" aria-label="Evolução mensal das despesas">
        <h2>Evolução mensal</h2>
        <p>Últimos 12 meses{selectedName ? ` · ${selectedName} em destaque` : ' · total de despesas'}.</p>
        <ResponsiveContainer width="100%" height={280} minWidth={0}>
          <BarChart data={monthly} margin={{ left: 0, right: 8 }}>
            <CartesianGrid stroke="var(--bg-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" interval={1} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis width={55} tickFormatter={value => `R$${Math.round(Number(value) / 100)}`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value) / 100)} />
            <Bar dataKey="total" name="Total" fill="var(--brand-600)" radius={[4, 4, 0, 0]} />
            {selectedName && <Bar dataKey="selected" name={selectedName} fill="var(--success-400)" radius={[4, 4, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </section>
    </>
  )
}
