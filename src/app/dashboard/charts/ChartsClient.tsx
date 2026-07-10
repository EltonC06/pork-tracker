'use client'

import { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface AccountType { id: string; name: string; icon: string | null; color: string | null }
interface Snapshot { balance: number; snapshot_date: string; account_type_id: string }
interface Stock { ticker: string; quantity: number; avg_price: number; current_price: number | null }
interface PriceHistory { ticker: string; price: number; recorded_date: string }

interface Props {
  accountTypes: AccountType[]
  snapshots: Snapshot[]
  stocks: Stock[]
  priceHistory: PriceHistory[]
}

type Period = '30d' | '90d' | '1a' | 'all'

function filterByPeriod<T extends { snapshot_date?: string; recorded_date?: string }>(
  data: T[], period: Period, dateKey: 'snapshot_date' | 'recorded_date'
): T[] {
  if (period === 'all') return data
  const now = new Date()
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365
  const cutoff = new Date(now.getTime() - days * 86400000)
  return data.filter(item => new Date((item as any)[dateKey]) >= cutoff)
}

function formatMonth(m: string) {
  const [year, mo] = m.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[parseInt(mo) - 1]}/${year.slice(2)}`
}

const TOOLTIP_STYLE = {
  background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
  borderRadius: '10px', fontSize: '0.8125rem',
}

export default function ChartsClient({ accountTypes, snapshots, stocks, priceHistory }: Props) {
  const [period, setPeriod] = useState<Period>('all')

  // ── 1. Total Patrimony Over Time (by month, accounts only) ────────
  const filteredSnaps = filterByPeriod(snapshots, period, 'snapshot_date')
  const monthlyTotals: Record<string, Record<string, number>> = {}
  for (const snap of filteredSnaps) {
    const month = snap.snapshot_date.substring(0, 7)
    if (!monthlyTotals[month]) monthlyTotals[month] = {}
    monthlyTotals[month][snap.account_type_id] = snap.balance
  }
  const patrimonyData = Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, balances]) => ({
      month,
      total: Object.values(balances).reduce((a, b) => a + b, 0),
    }))

  // ── 2. Pie: current allocation across accounts + stocks ───────────
  const latestPerAccount: { name: string; value: number; color: string; icon: string }[] = []
  for (const acct of accountTypes) {
    const acctSnaps = snapshots.filter(s => s.account_type_id === acct.id)
    if (acctSnaps.length === 0) continue
    const latest = acctSnaps.reduce((a, b) =>
      a.snapshot_date > b.snapshot_date ? a : b
    )
    latestPerAccount.push({
      name: `${acct.icon ?? '💰'} ${acct.name}`,
      value: latest.balance,
      color: acct.color ?? '#6366f1',
      icon: acct.icon ?? '💰',
    })
  }
  const stockTotal = stocks.reduce((s, p) => s + p.quantity * (p.current_price ?? p.avg_price), 0)
  if (stockTotal > 0) {
    latestPerAccount.push({ name: '📈 Ações', value: stockTotal, color: '#10b981', icon: '📈' })
  }
  const grandTotal = latestPerAccount.reduce((s, a) => s + a.value, 0)

  // ── 3. Multi-line: each account over time ─────────────────────────
  const allMonths = Array.from(new Set(filteredSnaps.map(s => s.snapshot_date.substring(0, 7)))).sort()
  const multiLineData = allMonths.map(month => {
    const row: Record<string, any> = { month }
    for (const acct of accountTypes) {
      const monthSnaps = filteredSnaps.filter(s =>
        s.account_type_id === acct.id && s.snapshot_date.startsWith(month)
      )
      if (monthSnaps.length > 0) {
        row[acct.name] = monthSnaps[monthSnaps.length - 1].balance
      }
    }
    return row
  })

  // ── 4. Stock P&L bar chart ────────────────────────────────────────
  const stockBarData = stocks.map(s => {
    const invested = s.quantity * s.avg_price
    const current = s.quantity * (s.current_price ?? s.avg_price)
    const pl = current - invested
    return { ticker: s.ticker, invested, current, pl, plPct: invested > 0 ? (pl / invested) * 100 : 0 }
  }).sort((a, b) => b.pl - a.pl)

  const PERIODS: { label: string; value: Period }[] = [
    { label: '30 dias', value: '30d' },
    { label: '90 dias', value: '90d' },
    { label: '1 ano', value: '1a' },
    { label: 'Tudo', value: 'all' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Gráficos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Visualize a evolução do seu patrimônio
          </p>
        </div>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: '0.375rem', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              style={{
                padding: '0.375rem 0.875rem',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: period === p.value ? 'var(--brand-600)' : 'transparent',
                color: period === p.value ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* 1. Patrimony Evolution */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Evolução do Patrimônio (Contas)</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            Soma de todos os saldos registrados por mês
          </p>
          {patrimonyData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={patrimonyData}>
                <defs>
                  <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatCurrency(v), 'Total']} labelFormatter={(m) => formatMonth(String(m))} />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#cg1)" dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Registre saldos em pelo menos 2 meses para ver o gráfico" />
          )}
        </div>

        {/* 2. Pie + 3. Multi-line grid */}
        <div className="grid-auto-fit">

          {/* Pie: Allocation */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Composição Atual</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              Alocação do patrimônio
            </p>
            {latestPerAccount.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={latestPerAccount}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {latestPerAccount.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatCurrency(v)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {latestPerAccount.map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        {grandTotal > 0 ? ((a.value / grandTotal) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart message="Nenhum dado de conta disponível" />
            )}
          </div>

          {/* Multi-line: accounts */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Evolução por Conta</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              Saldo mensal por conta cadastrada
            </p>
            {multiLineData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={multiLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [formatCurrency(v)]} labelFormatter={(m) => formatMonth(String(m))} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
                  {accountTypes.map(acct => (
                    <Line
                      key={acct.id}
                      type="monotone"
                      dataKey={acct.name}
                      stroke={acct.color ?? '#6366f1'}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="Registre saldos em pelo menos 2 meses para ver as linhas" />
            )}
          </div>
        </div>

        {/* 4. Stocks P&L bar chart */}
        {stocks.length > 0 && (
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>P&L por Ação</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              Resultado em R$ por ticker
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stockBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="ticker" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: any, name: any) => [
                    formatCurrency(v),
                    name === 'pl' ? 'Resultado' : name === 'invested' ? 'Investido' : 'Atual'
                  ]}
                />
                <Bar dataKey="pl" radius={[0, 6, 6, 0]}>
                  {stockBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.pl >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="empty-state" style={{ padding: '3rem 1rem' }}>
      <div className="empty-state-icon" style={{ fontSize: '2rem' }}>📉</div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}
