'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface Props {
  data: { date: string; balance: number }[]
  color: string
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--bg-border)',
        borderRadius: '8px', padding: '0.5rem 0.75rem',
      }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: payload[0].stroke }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

export default function AccountLineChart({ data, color }: Props) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
        <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="balance"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
