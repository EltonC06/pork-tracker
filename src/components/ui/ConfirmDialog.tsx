'use client'

import { useEffect } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const iconColor = variant === 'danger' ? 'var(--danger-400)' : 'var(--warning-400)'
  const iconBg = variant === 'danger'
    ? 'rgba(244, 63, 94, 0.12)'
    : 'rgba(251, 191, 36, 0.12)'
  const iconBorder = variant === 'danger'
    ? 'rgba(244, 63, 94, 0.25)'
    : 'rgba(251, 191, 36, 0.25)'

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0.25rem',
          }}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: iconBg, border: `1px solid ${iconBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          {variant === 'danger'
            ? <Trash2 size={24} color={iconColor} />
            : <AlertTriangle size={24} color={iconColor} />
          }
        </div>

        {/* Content */}
        <h2
          id="confirm-dialog-title"
          style={{
            fontSize: '1.125rem', fontWeight: 700,
            textAlign: 'center', marginBottom: '0.5rem',
          }}
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-desc"
          style={{
            color: 'var(--text-secondary)', fontSize: '0.875rem',
            textAlign: 'center', lineHeight: 1.5,
            marginBottom: '1.5rem',
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-ghost"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            style={{
              flex: 1, justifyContent: 'center',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
