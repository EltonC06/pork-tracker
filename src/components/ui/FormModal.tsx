'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function FormModal({ isOpen, onClose, title, children }: FormModalProps) {
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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
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
