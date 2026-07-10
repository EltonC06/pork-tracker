'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, Edit2 } from 'lucide-react'
import {
  createStockPosition,
  deleteStockPosition,
  updateStockPrice,
} from '@/app/actions/stocks'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils'
import type { StockPosition } from '@/types/database'
import KpiCard from '@/components/ui/KpiCard'
import EmptyState from '@/components/ui/EmptyState'
import FormModal from '@/components/ui/FormModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StockEditModal from './components/StockEditModal'

interface Props {
  positions: StockPosition[]
}

export default function StocksClient({ positions }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingPosition, setEditingPosition] = useState<StockPosition | null>(null)
  const [editPriceId, setEditPriceId] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; ticker: string } | null>(null)

  const totalInvested = positions.reduce((sum, p) => sum + p.quantity * p.avg_price, 0)
  const totalCurrent = positions.reduce((sum, p) => {
    return sum + p.quantity * (p.current_price ?? p.avg_price)
  }, 0)
  const totalPL = totalCurrent - totalInvested
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0

  function handleAddPosition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createStockPosition(fd)
        toast.success('Posição adicionada!')
        setShowAddModal(false)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  function handleDelete() {
    if (!deleteConfirm) return
    startTransition(async () => {
      try {
        await deleteStockPosition(deleteConfirm.id)
        toast.success('Posição removida.')
        setDeleteConfirm(null)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  function handleUpdatePrice(id: string, ticker: string) {
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) { toast.error('Preço inválido'); return }
    startTransition(async () => {
      try {
        await updateStockPrice(id, ticker, price)
        toast.success(`Preço de ${ticker} atualizado!`)
        setEditPriceId(null)
        setNewPrice('')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Ações</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Renda variável — posições e P&L
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)} id="btn-add-stock">
          <Plus size={16} /> Adicionar Ativo
        </button>
      </div>

      {/* Summary Cards */}
      {positions.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <KpiCard label="Total Investido" value={formatCurrency(totalInvested)} accent="neutral" />
          <KpiCard label="Valor Atual" value={formatCurrency(totalCurrent)} accent="brand" />
          <KpiCard label="Resultado (R$)" value={formatCurrency(totalPL)} accent={totalPL >= 0 ? 'success' : 'danger'} />
          <KpiCard label="Resultado (%)" value={formatPercent(totalPLPct)} accent={totalPLPct >= 0 ? 'success' : 'danger'} />
        </div>
      )}

      {/* Positions */}
      {positions.length === 0 ? (
        <EmptyState
          icon="📈"
          title="Nenhum ativo cadastrado"
          description="Adicione suas posições de ações"
          action={{ label: '+ Adicionar Ativo', onClick: () => setShowAddModal(true) }}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="glass-card" style={{ overflow: 'auto' }}>
            <table className="data-table stock-table-desktop">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Qtd</th>
                  <th>PM (R$)</th>
                  <th>Preço Atual</th>
                  <th>Investido</th>
                  <th>Valor Atual</th>
                  <th>P&L (R$)</th>
                  <th>P&L (%)</th>
                  <th>Atualizado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const invested = p.quantity * p.avg_price
                  const currentVal = p.quantity * (p.current_price ?? p.avg_price)
                  const pl = currentVal - invested
                  const plPct = invested > 0 ? (pl / invested) * 100 : 0
                  const isPositive = pl >= 0

                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--brand-400)', fontFamily: 'monospace' }}>
                          {p.ticker}
                        </span>
                      </td>
                      <td>{p.quantity.toLocaleString('pt-BR')}</td>
                      <td>{formatCurrency(p.avg_price)}</td>
                      <td>
                        {editPriceId === p.id ? (
                          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                            <input
                              type="number" step="0.01" value={newPrice}
                              onChange={e => setNewPrice(e.target.value)}
                              className="input"
                              style={{ width: '90px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
                              placeholder="0.00" autoFocus
                            />
                            <button className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdatePrice(p.id, p.ticker)} disabled={isPending}>OK</button>
                            <button className="btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => { setEditPriceId(null); setNewPrice('') }}>✕</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <span>{p.current_price ? formatCurrency(p.current_price) : '—'}</span>
                            <button className="btn-ghost" style={{ padding: '0.2rem 0.4rem', border: 'none', fontSize: '0.75rem' }} onClick={() => { setEditPriceId(p.id); setNewPrice(p.current_price?.toString() ?? '') }} title="Atualizar preço">
                              <RefreshCw size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td>{formatCurrency(invested)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(currentVal)}</td>
                      <td>
                        <span className={isPositive ? 'text-positive' : 'text-negative'} style={{ fontWeight: 600 }}>
                          {isPositive ? '+' : ''}{formatCurrency(pl)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
                          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {isPositive ? '+' : ''}{plPct.toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {p.last_updated ? formatDate(p.last_updated) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                          <button className="btn-ghost" style={{ padding: '0.25rem 0.5rem', border: 'none' }} onClick={() => setEditingPosition(p)} title="Editar posição">
                            <Edit2 size={13} />
                          </button>
                          <button className="btn-danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setDeleteConfirm({ id: p.id, ticker: p.ticker })}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="stock-cards-mobile">
            {positions.map(p => {
              const invested = p.quantity * p.avg_price
              const currentVal = p.quantity * (p.current_price ?? p.avg_price)
              const pl = currentVal - invested
              const plPct = invested > 0 ? (pl / invested) * 100 : 0
              const isPositive = pl >= 0

              return (
                <div key={p.id} className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--brand-400)', fontFamily: 'monospace' }}>
                      {p.ticker}
                    </span>
                    <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
                      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {isPositive ? '+' : ''}{plPct.toFixed(2)}%
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.125rem' }}>Qtd</span>
                      <span style={{ fontWeight: 600 }}>{p.quantity.toLocaleString('pt-BR')}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.125rem' }}>PM</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(p.avg_price)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.125rem' }}>Investido</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(invested)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.125rem' }}>Atual</span>
                      <span style={{ fontWeight: 700 }}>{formatCurrency(currentVal)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--bg-border)' }}>
                    <span className={isPositive ? 'text-positive' : 'text-negative'} style={{ fontWeight: 700 }}>
                      P&L: {isPositive ? '+' : ''}{formatCurrency(pl)}
                    </span>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button className="btn-ghost" style={{ padding: '0.375rem', border: 'none' }} onClick={() => setEditingPosition(p)} title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-danger" style={{ padding: '0.375rem' }} onClick={() => setDeleteConfirm({ id: p.id, ticker: p.ticker })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Modal: Adicionar Ativo */}
      <FormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Ativo">
        <form onSubmit={handleAddPosition} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label" htmlFor="stock-ticker">Ticker</label>
              <input id="stock-ticker" name="ticker" className="input" placeholder="ex: PETR4" required style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label className="label" htmlFor="stock-qty">Quantidade</label>
              <input id="stock-qty" name="quantity" type="number" step="0.000001" min="0.000001" required placeholder="100" className="input" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="label" htmlFor="stock-avgprice">Preço Médio (R$)</label>
              <input id="stock-avgprice" name="avg_price" type="number" step="0.0001" min="0.0001" required placeholder="28.50" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="stock-curprice">Preço Atual (R$)</label>
              <input id="stock-curprice" name="current_price" type="number" step="0.0001" min="0.0001" placeholder="Opcional" className="input" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>
              {isPending ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </FormModal>

      {/* Modal: Editar Posição */}
      {editingPosition && (
        <StockEditModal
          isOpen={true}
          onClose={() => setEditingPosition(null)}
          position={editingPosition}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={`Excluir ${deleteConfirm?.ticker ?? ''}?`}
        message="Esta posição será removida permanentemente, incluindo todo o histórico de preços."
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
