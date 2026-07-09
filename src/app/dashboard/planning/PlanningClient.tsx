'use client'

import { useState, useMemo, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer } from 'lucide-react'
import type { AccountType, AccountSnapshot, RecurringPlan } from '@/types/database'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

interface Props {
  accountTypes: AccountType[]
  snapshots: AccountSnapshot[]
  recurringPlans: RecurringPlan[]
}

export default function PlanningClient({ accountTypes, snapshots, recurringPlans }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: 'PorkTracker_Relatorio_Anual'
  })

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
    // 1. Initial State
    let currentBalance = 0
    let activePlans = recurringPlans

    if (selectedAccountId !== 'all') {
      currentBalance = latestBalances[selectedAccountId] ?? 0
      activePlans = recurringPlans.filter(p => p.account_type_id === selectedAccountId)
    } else {
      currentBalance = Object.values(latestBalances).reduce((a, b) => a + b, 0)
    }

    // 2. Generate 12 months
    const data = []
    const today = new Date()
    
    // Simplification for the projection:
    // We assume 'monthly' happens once per month, 'yearly' happens in the month of target_date.
    // 'one-time' happens in the month of target_date.

    for (let i = 0; i < 12; i++) {
      const projDate = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const monthLabel = projDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      const currentMonth = projDate.getMonth()
      const currentYear = projDate.getFullYear()

      let monthlyIncome = 0
      let monthlyExpense = 0

      // Evaluate plans for this specific month
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Planejamento Anual</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Projeção do seu fluxo de caixa para os próximos 12 meses
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
            <Printer size={16} /> Relatório PDF
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', height: '400px' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1.5rem' }}>Evolução Projetada (Saldo)</h2>
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
              formatter={(value: any) => formatCurrency(Number(value))}
            />
            <Area type="monotone" dataKey="saldo" name="Saldo Final Projetado" stroke="var(--brand-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: '700', marginBottom: '1.5rem' }}>Detalhamento Mensal</h2>
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
