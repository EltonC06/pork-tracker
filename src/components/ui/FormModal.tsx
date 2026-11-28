'use client'

import { useEffect, useId, type ReactNode } from 'react'
import { X } from 'lucide-react'
import useDialogFocus from './useDialogFocus'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  maxWidth?: string
  children: ReactNode
}

export default function FormModal({ isOpen, onClose, title, maxWidth, children }: FormModalProps) {
  const titleId = useId()
  const dialogRef = useDialogFocus(isOpen)
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={maxWidth ? { maxWidth } : undefined}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-heading">
          <h2 id={titleId} style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '0.25rem',
            }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {children}
      </div>
    </div>
  )
}
