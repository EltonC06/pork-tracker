'use client'

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export default function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
  return (
    <div className="glass-card empty-state">
      <div className="empty-state-icon">{icon}</div>
      <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          className="btn-primary"
          style={{ marginTop: '1rem', fontSize: '0.8125rem' }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  )
}
