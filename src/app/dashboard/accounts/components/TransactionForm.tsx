'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { createTransaction, updateTransaction } from '@/app/actions/transactions'
import FormModal from '@/components/ui/FormModal'
import type { Transaction } from '@/types/database'

interface TransactionFormProps {
  isOpen: boolean
  onClose: () => void
  accountName: string
  accountTypeId: string
  /** If provided, form is in edit mode */
  editingTransaction?: Transaction | null
}

export default function TransactionForm({
  isOpen,
  onClose,
  accountName,
  accountTypeId,
  editingTransaction,
}: TransactionFormProps) {
  const [isPending, startTransition] = useTransition()
  const today = new Date().toISOString().split('T')[0]
  const isEditing = !!editingTransaction

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateTransaction(editingTransaction!.id, fd)
          toast.success('Transação atualizada!')
        } else {
          await createTransaction(fd)
          toast.success('Transação registrada!')
        }
        onClose()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  const title = isEditing ? 'Editar Transação' : `Gasto ou Ganho — ${accountName}`

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="hidden" name="account_type_id" value={accountTypeId} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Tipo</label>
            <select name="type" className="input" required defaultValue={editingTransaction?.type ?? 'expense'}>
              <option value="expense">Despesa (-)</option>
              <option value="income">Receita (+)</option>
            </select>
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
              className="input"
              defaultValue={editingTransaction?.amount ?? ''}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label">Categoria</label>
            <input
              name="category"
              type="text"
              placeholder="ex: Alimentação, Transporte"
              className="input"
              defaultValue={editingTransaction?.category ?? ''}
            />
          </div>
          <div>
            <label className="label">Data</label>
            <input name="date" type="date" defaultValue={editingTransaction?.date ?? today} max={today} required className="input" />
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <input
            name="description"
            type="text"
            placeholder="ex: Conta de Luz"
            className="input"
            required
            defaultValue={editingTransaction?.description ?? ''}
          />
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          * Transações são registros de fluxo de caixa. Para atualizar o saldo da conta, use o botão &quot;+ Saldo&quot;.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>
            {isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}
