'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createSnapshot } from '@/app/actions/accounts'
import FormModal from '@/components/ui/FormModal'

interface SnapshotFormProps {
  isOpen: boolean
  onClose: () => void
  accountName: string
  accountTypeId: string
}

export default function SnapshotForm({ isOpen, onClose, accountName, accountTypeId }: SnapshotFormProps) {
  const [isPending, startTransition] = useTransition()
  const today = new Date().toISOString().split('T')[0]

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createSnapshot(fd)
        toast.success('Saldo registrado!')
        onClose()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Atualizar Saldo — ${accountName}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="hidden" name="account_type_id" value={accountTypeId} />
        <div>
          <label className="label" htmlFor="snap-balance">Novo Saldo Atual (R$)</label>
          <input id="snap-balance" name="balance" type="number" step="0.01" min="0" required placeholder="0,00" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="snap-date">Data</label>
          <input id="snap-date" name="snapshot_date" type="date" defaultValue={today} max={today} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="snap-notes">Observações (opcional)</label>
          <input id="snap-notes" name="notes" type="text" placeholder="ex: Fechamento do mês" className="input" />
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
