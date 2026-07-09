'use client'

import { Menu, LineChart } from 'lucide-react'

interface Props {
  onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1rem',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--bg-border)',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }} className="md:hidden">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '28px', height: '28px',
          background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <LineChart size={16} color="white" />
        </div>
        <span style={{ fontWeight: '800', fontSize: '1rem' }}>
          <span className="gradient-text">Pork</span> Tracker
        </span>
      </div>
      <button 
        onClick={onMenuClick}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          padding: '0.5rem',
        }}
      >
        <Menu size={24} />
      </button>
    </div>
  )
}
