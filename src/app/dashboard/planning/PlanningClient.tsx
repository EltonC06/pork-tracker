'use client'

import { useState, useMemo, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { AccountType, AccountSnapshot, RecurringPlan, Transaction } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  accountTypes: AccountType[]
  snapshots: AccountSnapshot[]
  recurringPlans: RecurringPlan[]
  monthTransactions: Transaction[]
}

export default function PlanningClient({ accountTypes, snapshots, recurringPlans, monthTransactions }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: 'PorkTracker_Resumo_Financeiro'
  })

  // Month totals from real transactions
  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const monthNet = monthIncome - monthExpense

  // Calculate base balances
  const latestBalances = useMemo(() => {
    const balances: Record<string, number> = {}
    for (const acct of accountTypes) {
      const acctSnaps = snapshots.filter(s => s.account_type_id === acct.id)
      balances[acct.id] = acctSnaps.length > 0 ? acctSnaps[0].balance : 0
    }
    return balances
  }, [accountTypes, snapshots])

  const projectionData = useMemo(() => {
    let currentBalance = 0
    let activePlans = recurringPlans

    if (selectedAccountId !== 'all') {
      currentBalance = latestBalances[selectedAccountId] ?? 0
      activePlans = recurringPlans.filter(p => p.account_type_id === selectedAccountId)
    } else {
      currentBalance = Object.values(latestBalances).reduce((a, b) => a + b, 0)
    }

    const data = []
    const today = new Date()

    for (let i = 0; i < 12; i++) {
      const projDate = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const monthLabel = projDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      const currentMonth = projDate.getMonth()
      const currentYear = projDate.getFullYear()

      let monthlyIncome = 0
      let monthlyExpense = 0

      for (const plan of activePlans) {
        let shouldApply = false
        
        if (plan.frequency === 'monthly') {
          shouldApply = true
        } else if (plan.frequency === 'yearly' && plan.target_date) {
          const tDate = new Date(plan.target_date)
          if (tDate.getMonth() === currentMonth) {
            shouldApply = true
          }
        } else if (plan.frequency === 'one-time' && plan.target_date) {
          const tDate = new Date(plan.target_date)
          if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
            shouldApply = true
          }
        }

        if (shouldApply) {
          if (plan.type === 'income') monthlyIncome += plan.amount
          else monthlyExpense += plan.amount
        }
      }

      currentBalance = currentBalance + monthlyIncome - monthlyExpense

      data.push({
        monthLabel,
        receitas: monthlyIncome,
        despesas: monthlyExpense,
        saldo: currentBalance,
      })
    }

    return data
  }, [selectedAccountId, latestBalances, recurringPlans])

  return (
    <div ref={contentRef}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Resumo Financeiro</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Transações realizadas + projeção dos próximos 12 meses
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            className="input" 
            value={selectedAccountId} 
            onChange={e => setSelectedAccountId(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            <option value="all">Todas as Contas (Patrimônio Global)</option>
            {accountTypes.map(acct => (
              <option key={acct.id} value={acct.id}>{acct.name}</option>
            ))}
          </select>
          <button onClick={() => handlePrint()} className="btn-secondary">
            <Printer size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Month Summary */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1.25rem' }}>Fluxo Realizado — Mês Atual</h2>
        
        {monthTransactions.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
            Nenhuma transação registrada este mês
          </p>
        ) : (
          <>
            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Receitas</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success-400)' }}>{formatCurrency(monthIncome)}</p>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(244,63,94,0.08)', borderRadius: '10px', border: '1px solid rgba(244,63,94,0.15)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Despesas</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger-400)' }}>{formatCurrency(monthExpense)}</p>
              </div>
              <div style={{ padding: '1rem', background: monthNet >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', borderRadius: '10px', border: `1px solid ${monthNet >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}` }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Resultado</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: monthNet >= 0 ? 'var(--success-400)' : 'var(--danger-400)' }}>
                  {monthNet >= 0 ? '+' : ''}{formatCurrency(monthNet)}
                </p>
              </div>
            </div>

            {/* Recent transactions list */}
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {monthTransactions.slice(0, 8).map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.8125rem' }}>{formatDate(tx.date)}</td>
                      <td>
                        {tx.type === 'income' ? (
                          <span style={{ color: 'var(--success-400)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                            <ArrowUpRight size={13} /> Receita
                          </span>
                        ) : (
                          <span style={{ color: 'var(--danger-400)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                            <ArrowDownRight size={13} /> Despesa
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8125rem' }}>{tx.description || tx.category || '—'}</td>
                      <td style={{ fontWeight: 700, color: tx.type === 'income' ? 'var(--success-400)' : 'var(--text-primary)', fontSize: '0.875rem' }}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Projection Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.25rem', height: '400px' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1.5rem' }}>Projeção de Saldo (12 meses)</h2>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
            <XAxis dataKey="monthLabel" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              tickFormatter={value => `R$ ${(value / 1000).toFixed(0)}k`} 
              dx={-10}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: '8px', color: 'var(--text-primary)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--text-primary)' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatCurrency(Number(value))}
            />
            <Area type="monotone" dataKey="saldo" name="Saldo Final Projetado" stroke="var(--brand-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Projection Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1.5rem' }}>Detalhamento Mensal (Projeção)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Receitas Previstas</th>
                <th>Despesas Previstas</th>
                <th>Resultado do Mês</th>
                <th>Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {projectionData.map((row, i) => {
                const monthResult = row.receitas - row.despesas
                const isPositive = monthResult >= 0
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{row.monthLabel}</td>
                    <td style={{ color: 'var(--success-400)' }}>{formatCurrency(row.receitas)}</td>
                    <td style={{ color: 'var(--danger-400)' }}>{formatCurrency(row.despesas)}</td>
                    <td>
                      <span style={{ 
                        color: isPositive ? 'var(--success-400)' : 'var(--danger-400)',
                        fontWeight: 600 
                      }}>
                        {isPositive ? '+' : ''}{formatCurrency(monthResult)}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                      {formatCurrency(row.saldo)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
