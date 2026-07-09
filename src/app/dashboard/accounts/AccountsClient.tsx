'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  createAccountType,
  deleteAccountType,
  createSnapshot,
  deleteSnapshot,
} from '@/app/actions/accounts'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AccountType, AccountSnapshot } from '@/types/database'
import AccountLineChart from '@/components/charts/AccountLineChart'

const ICON_OPTIONS = ['💰', '🏦', '💳', '🏠', '📈', '💎', '🪙', '🏧', '💵', '🎯']
const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f43f5e', '#84cc16',
]

interface Props {
  accountTypes: AccountType[]
  snapshots: AccountSnapshot[]
}

export default function AccountsClient({ accountTypes, snapshots }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showSnapshotModal, setShowSnapshotModal] = useState<string | null>(null) // account_type_id
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState('💰')
  const [selectedColor, setSelectedColor] = useState('#6366f1')

  // Latest balance per account
  const latestBalances: Record<string, { balance: number; date: string } | null> = {}
  for (const acct of accountTypes) {
    const acctSnaps = snapshots.filter(s => s.account_type_id === acct.id)
    if (acctSnaps.length > 0) {
      latestBalances[acct.id] = { balance: acctSnaps[0].balance, date: acctSnaps[0].snapshot_date }
    } else {
      latestBalances[acct.id] = null
    }
  }

  function handleCreateAccountType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('icon', selectedIcon)
    fd.set('color', selectedColor)
    startTransition(async () => {
      try {
        await createAccountType(fd)
        toast.success('Conta criada!')
        setShowNewAccountModal(false)
        form.reset()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleDeleteAccountType(id: string, name: string) {
    if (!confirm(`Excluir a conta "${name}" e todos os seus registros?`)) return
    startTransition(async () => {
      try {
        await deleteAccountType(id)
        toast.success('Conta excluída.')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleCreateSnapshot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createSnapshot(fd)
        toast.success('Saldo registrado!')
        setShowSnapshotModal(null)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleDeleteSnapshot(id: string) {
    if (!confirm('Excluir este registro?')) return
    startTransition(async () => {
      try {
        await deleteSnapshot(id)
        toast.success('Registro excluído.')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>Contas</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Gerencie seus saldos em bancos, cofre e carteiras
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowNewAccountModal(true)}
          id="btn-add-account"
        >
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      {/* Account Cards */}
      {accountTypes.length === 0 ? (
        <div className="glass-card empty-state">
          <div className="empty-state-icon">🏦</div>
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
            Nenhuma conta cadastrada
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Clique em &quot;Nova Conta&quot; para começar
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {accountTypes.map(acct => {
            const latest = latestBalances[acct.id]
            const acctSnaps = snapshots
              .filter(s => s.account_type_id === acct.id)
              .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
            const isExpanded = expandedAccount === acct.id
            const chartData = acctSnaps.map(s => ({ date: s.snapshot_date, balance: s.balance }))

            return (
              <div key={acct.id} className="glass-card" style={{ padding: '1.5rem' }}>
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '48px', height: '48px',
                    background: `${acct.color ?? '#6366f1'}22`,
                    border: `1px solid ${acct.color ?? '#6366f1'}44`,
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem', flexShrink: 0,
                  }}>
                    {acct.icon ?? '💰'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{acct.name}</h3>
                    {latest ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Atualizado em {formatDate(latest.date)}
                      </p>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Sem registros ainda</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.375rem', fontWeight: '800' }}>
                      {latest ? formatCurrency(latest.balance) : '—'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                    onClick={() => setShowSnapshotModal(acct.id)}
                    id={`btn-register-balance-${acct.id}`}
                  >
                    <Plus size={14} /> Registrar Saldo
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: '0.8125rem', padding: '0.5rem 0.875rem' }}
                    onClick={() => setExpandedAccount(isExpanded ? null : acct.id)}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Histórico ({acctSnaps.length})
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteAccountType(acct.id, acct.name)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded: chart + history */}
                {isExpanded && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--bg-border)', paddingTop: '1.5rem' }}>
                    {chartData.length >= 2 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>
                          Evolução do saldo
                        </p>
                        <AccountLineChart data={chartData} color={acct.color ?? '#6366f1'} />
                      </div>
                    )}

                    {acctSnaps.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                        Nenhum registro ainda
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Saldo</th>
                            <th>Observações</th>
                            <th style={{ width: 48 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...acctSnaps].reverse().map(snap => (
                            <tr key={snap.id}>
                              <td>{formatDate(snap.snapshot_date)}</td>
                              <td style={{ fontWeight: 600 }}>{formatCurrency(snap.balance)}</td>
                              <td style={{ color: 'var(--text-muted)' }}>{snap.notes ?? '—'}</td>
                              <td>
                                <button
                                  className="btn-danger"
                                  style={{ padding: '0.25rem 0.5rem' }}
                                  onClick={() => handleDeleteSnapshot(snap.id)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Nova Conta */}
      {showNewAccountModal && (
        <div className="modal-overlay" onClick={() => setShowNewAccountModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Nova Conta</h2>
            <form onSubmit={handleCreateAccountType} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label" htmlFor="new-account-name">Nome da conta</label>
                <input
                  id="new-account-name"
                  name="name"
                  className="input"
                  placeholder="ex: Nubank, Cofre, XP Investimentos"
                  required
                />
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
                        borderRadius: '8px', fontSize: '1.25rem', cursor: 'pointer',
                        transition: 'all 0.15s',
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
                        width: '32px', height: '32px',
                        background: color,
                        borderRadius: '50%', border: 'none', cursor: 'pointer',
                        outline: selectedColor === color ? `3px solid ${color}` : '3px solid transparent',
                        outlineOffset: '2px',
                        transition: 'outline 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewAccountModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>
                  {isPending ? 'Criando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Saldo */}
      {showSnapshotModal && (
        <div className="modal-overlay" onClick={() => setShowSnapshotModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              Registrar Saldo — {accountTypes.find(a => a.id === showSnapshotModal)?.name}
            </h2>
            <form onSubmit={handleCreateSnapshot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="hidden" name="account_type_id" value={showSnapshotModal} />
              <div>
                <label className="label" htmlFor="snap-balance">Saldo (R$)</label>
                <input
                  id="snap-balance"
                  name="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0,00"
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="snap-date">Data</label>
                <input
                  id="snap-date"
                  name="snapshot_date"
                  type="date"
                  defaultValue={today}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="snap-notes">Observações (opcional)</label>
                <input
                  id="snap-notes"
                  name="notes"
                  type="text"
                  placeholder="ex: Após recebimento de salário"
                  className="input"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowSnapshotModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>
                  {isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
