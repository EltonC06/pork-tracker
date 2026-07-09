import { TrendingUp, TrendingDown } from 'lucide-react'

export interface KpiCardProps {
  label: string
  value: string | React.ReactNode
  icon?: React.ReactNode
  accent: 'brand' | 'success' | 'neutral' | 'danger'
  sub?: { value: string; positive: boolean; label: string }
}

export default function KpiCard({ label, value, icon, accent, sub }: KpiCardProps) {
  const colors = {
    brand: { bg: 'rgba(99,102,241,0.1)', color: 'var(--brand-400)', border: 'rgba(99,102,241,0.2)' },
    success: { bg: 'rgba(16,185,129,0.1)', color: 'var(--success-400)', border: 'rgba(16,185,129,0.2)' },
    neutral: { bg: 'rgba(99,102,241,0.07)', color: 'var(--text-secondary)', border: 'var(--bg-border)' },
    danger: { bg: 'rgba(244,63,94,0.1)', color: 'var(--danger-400)', border: 'rgba(244,63,94,0.2)' },
  }
  const c = colors[accent]

  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</p>
        {icon && (
          <div style={{
            padding: '0.5rem',
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: '10px',
            color: c.color,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.625rem', fontWeight: '800', lineHeight: 1.1 }}>{value}</div>
      {sub && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
          {sub.positive ? (
            <TrendingUp size={13} style={{ color: 'var(--success-400)' }} />
          ) : (
            <TrendingDown size={13} style={{ color: 'var(--danger-400)' }} />
          )}
          <span style={{
            fontSize: '0.8125rem', fontWeight: 600,
            color: sub.positive ? 'var(--success-400)' : 'var(--danger-400)',
          }}>
            {sub.value}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub.label}</span>
        </div>
      )}
    </div>
  )
}
