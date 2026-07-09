'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface DataPoint {
  month: string
  total: number
}

function formatMonth(month: string) {
  const [year, m] = month.split('-')
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${months[parseInt(m) - 1]}/${year.slice(2)}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
          {formatMonth(label)}
        </p>
        <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--brand-400)' }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export default function PatrimonyChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#colorTotal)"
          dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#818cf8', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
