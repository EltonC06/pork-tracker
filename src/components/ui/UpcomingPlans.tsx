'use client'

import { useMemo } from 'react'
import { Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { RecurringPlan } from '@/types/database'

interface UpcomingPlansProps {
  plans: RecurringPlan[]
  limit?: number
}

export default function UpcomingPlans({ plans, limit = 3 }: UpcomingPlansProps) {
  // eslint-disable-next-line react-hooks/purity
  const now = useMemo(() => Date.now(), [])

  const upcoming = plans
    .filter(p => p.target_date)
    .sort((a, b) => (a.target_date ?? '').localeCompare(b.target_date ?? ''))
    .slice(0, limit)

  if (upcoming.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Nenhuma previsão cadastrada
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {upcoming.map(plan => {
        const isIncome = plan.type === 'income'
        const daysUntil = plan.target_date
          ? Math.ceil((new Date(plan.target_date + 'T12:00:00').getTime() - now) / 86400000)
          : null
        const isOverdue = daysUntil !== null && daysUntil < 0
        const isToday = daysUntil === 0
        const isSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 7

        return (
          <div
            key={plan.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem',
              background: 'var(--bg-surface)',
              borderRadius: '10px',
              border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.3)' : isSoon ? 'rgba(251,191,36,0.3)' : 'var(--bg-border)'}`,
            }}
          >
            {/* Icon */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: isIncome ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {isIncome
                ? <ArrowUpRight size={18} color="var(--success-400)" />
                : <ArrowDownRight size={18} color="var(--danger-400)" />
              }
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {plan.name}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Calendar size={11} />
                {plan.target_date ? formatDate(plan.target_date) : '—'}
                {isOverdue && <span style={{ color: 'var(--danger-400)', fontWeight: 600 }}> (atrasado)</span>}
                {isToday && <span style={{ color: 'var(--warning-400)', fontWeight: 600 }}> (hoje)</span>}
                {isSoon && <span style={{ color: 'var(--warning-400)', fontWeight: 600 }}> (em {daysUntil}d)</span>}
              </div>
            </div>

            {/* Value */}
            <span style={{
              fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
              color: isIncome ? 'var(--success-400)' : 'var(--text-primary)',
            }}>
              {isIncome ? '+' : '-'}{formatCurrency(plan.amount)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
