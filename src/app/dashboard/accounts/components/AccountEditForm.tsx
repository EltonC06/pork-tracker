'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateAccountType } from '@/app/actions/accounts'
import FormModal from '@/components/ui/FormModal'
import type { AccountType } from '@/types/database'

const ICON_OPTIONS = ['💰', '🏦', '💳', '🏠', '📈', '💎', '🪙', '🏧', '💵', '🎯']
const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f43f5e', '#84cc16',
]

interface AccountEditFormProps {
  isOpen: boolean
  onClose: () => void
  account: AccountType
}

export default function AccountEditForm({ isOpen, onClose, account }: AccountEditFormProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedIcon, setSelectedIcon] = useState(account.icon ?? '💰')
  const [selectedColor, setSelectedColor] = useState(account.color ?? '#6366f1')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('icon', selectedIcon)
    fd.set('color', selectedColor)
    startTransition(async () => {
      try {
        await updateAccountType(account.id, fd)
        toast.success('Conta atualizada!')
        onClose()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Editar — ${account.name}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="label" htmlFor="edit-account-name">Nome da conta</label>
          <input id="edit-account-name" name="name" className="input" defaultValue={account.name} required />
        </div>
        <div>
          <label className="label">Ícone</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {ICON_OPTIONS.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setSelectedIcon(icon)}
                style={{
                  width: '40px', height: '40px',
                  background: selectedIcon === icon ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface)',
                  border: selectedIcon === icon ? '2px solid var(--brand-500)' : '1px solid var(--bg-border)',
                  borderRadius: '8px', fontSize: '1.25rem', cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Cor</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {COLOR_OPTIONS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                style={{
                  width: '32px', height: '32px', background: color, borderRadius: '50%',
                  border: 'none', cursor: 'pointer',
                  outline: selectedColor === color ? `3px solid ${color}` : '3px solid transparent',
                  outlineOffset: '2px', transition: 'outline 0.15s',
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}
