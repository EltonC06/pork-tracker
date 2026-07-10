'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateStockPosition } from '@/app/actions/stocks'
import FormModal from '@/components/ui/FormModal'
import type { StockPosition } from '@/types/database'

interface StockEditModalProps {
  isOpen: boolean
  onClose: () => void
  position: StockPosition
}

export default function StockEditModal({ isOpen, onClose, position }: StockEditModalProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateStockPosition(position.id, fd)
        toast.success(`${position.ticker} atualizado!`)
        onClose()
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Editar Posição — ${position.ticker}`}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="label">Ticker</label>
          <input
            className="input"
            value={position.ticker}
            disabled
            style={{ opacity: 0.6, cursor: 'not-allowed' }}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            O ticker não pode ser alterado. Delete e recrie para mudar.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="label" htmlFor="edit-qty">Quantidade</label>
            <input
              id="edit-qty"
              name="quantity"
              type="number"
              step="0.000001"
              min="0.000001"
              required
              defaultValue={position.quantity}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-avgprice">Preço Médio (R$)</label>
            <input
              id="edit-avgprice"
              name="avg_price"
              type="number"
              step="0.0001"
              min="0.0001"
              required
              defaultValue={position.avg_price}
              className="input"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </FormModal>
  )
}
