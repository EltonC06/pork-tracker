'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, Calendar, History, BarChart2, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  createAccountType,
  deleteAccountType,
  createSnapshot,
  deleteSnapshot,
} from '@/app/actions/accounts'
import { createTransaction } from '@/app/actions/transactions'
import { createRecurringPlan, deleteRecurringPlan } from '@/app/actions/planning'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AccountType, AccountSnapshot, Transaction, RecurringPlan } from '@/types/database'
import AccountLineChart from '@/components/charts/AccountLineChart'

const ICON_OPTIONS = ['💰', '🏦', '💳', '🏠', '📈', '💎', '🪙', '🏧', '💵', '🎯']
const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f43f5e', '#84cc16',
]

interface Props {
  accountTypes: AccountType[]
  snapshots: AccountSnapshot[]
  transactions: Transaction[]
  recurringPlans: RecurringPlan[]
}

export default function AccountsClient({ accountTypes, snapshots, transactions, recurringPlans }: Props) {
  const [isPending, startTransition] = useTransition()
  
  // Modals
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showSnapshotModal, setShowSnapshotModal] = useState<string | null>(null)
  const [showTxModal, setShowTxModal] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState<string | null>(null)
  
  // UI State
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [activeTabs, setActiveTabs] = useState<Record<string, 'overview' | 'tx' | 'plans'>>({})
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

  // Action Handlers
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

  function handleCreateTx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createTransaction(fd)
        toast.success('Transação adicionada e saldo atualizado!')
        setShowTxModal(null)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleCreatePlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createRecurringPlan(fd)
        toast.success('Previsão cadastrada!')
        setShowPlanModal(null)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleDeletePlan(id: string) {
    if (!confirm('Excluir esta previsão?')) return
    startTransition(async () => {
      try {
        await deleteRecurringPlan(id)
        toast.success('Previsão removida.')
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
            Gerencie seus saldos, transações e previsibilidades
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNewAccountModal(true)}>
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
            
            const acctTxs = transactions.filter(t => t.account_type_id === acct.id)
            const acctPlans = recurringPlans.filter(p => p.account_type_id === acct.id)

            const isExpanded = expandedAccount === acct.id
            const currentTab = activeTabs[acct.id] || 'overview'
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
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                    onClick={() => setShowSnapshotModal(acct.id)}
                  >
                    <Plus size={14} /> Atualizar Saldo
                  </button>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                    onClick={() => setShowTxModal(acct.id)}
                  >
                    <Plus size={14} /> Gasto / Ganho
                  </button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                    onClick={() => setExpandedAccount(isExpanded ? null : acct.id)}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Detalhes
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => handleDeleteAccountType(acct.id, acct.name)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expanded Area */}
                {isExpanded && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--bg-border)', paddingTop: '1.5rem' }}>
                    
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--bg-border)' }}>
                      <button 
                        onClick={() => setActiveTabs({ ...activeTabs, [acct.id]: 'overview' })}
                        style={{
                          background: 'none', border: 'none', padding: '0 0 0.5rem 0',
                          color: currentTab === 'overview' ? 'var(--brand-400)' : 'var(--text-secondary)',
                          fontWeight: currentTab === 'overview' ? 700 : 500,
                          borderBottom: currentTab === 'overview' ? '2px solid var(--brand-500)' : '2px solid transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem'
                        }}
                      >
                        <BarChart2 size={16} /> Visão Geral
                      </button>
                      <button 
                        onClick={() => setActiveTabs({ ...activeTabs, [acct.id]: 'tx' })}
                        style={{
                          background: 'none', border: 'none', padding: '0 0 0.5rem 0',
                          color: currentTab === 'tx' ? 'var(--brand-400)' : 'var(--text-secondary)',
                          fontWeight: currentTab === 'tx' ? 700 : 500,
                          borderBottom: currentTab === 'tx' ? '2px solid var(--brand-500)' : '2px solid transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem'
                        }}
                      >
                        <History size={16} /> Transações
                      </button>
                      <button 
                        onClick={() => setActiveTabs({ ...activeTabs, [acct.id]: 'plans' })}
                        style={{
                          background: 'none', border: 'none', padding: '0 0 0.5rem 0',
                          color: currentTab === 'plans' ? 'var(--brand-400)' : 'var(--text-secondary)',
                          fontWeight: currentTab === 'plans' ? 700 : 500,
                          borderBottom: currentTab === 'plans' ? '2px solid var(--brand-500)' : '2px solid transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem'
                        }}
                      >
                        <Calendar size={16} /> Previsões
                      </button>
                    </div>

                    {/* Tab Content: OVERVIEW */}
                    {currentTab === 'overview' && (
                      <div>
                        {chartData.length >= 2 && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>
                              Evolução do saldo (Snapshots)
                            </p>
                            <AccountLineChart data={chartData} color={acct.color ?? '#6366f1'} />
                          </div>
                        )}
                        {acctSnaps.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Nenhum registro ainda</p>
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
                              {[...acctSnaps].reverse().slice(0, 5).map(snap => (
                                <tr key={snap.id}>
                                  <td>{formatDate(snap.snapshot_date)}</td>
                                  <td style={{ fontWeight: 600 }}>{formatCurrency(snap.balance)}</td>
                                  <td style={{ color: 'var(--text-muted)' }}>{snap.notes ?? '—'}</td>
                                  <td>
                                    <button className="btn-danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDeleteSnapshot(snap.id)}>
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

                    {/* Tab Content: TRANSACTIONS */}
                    {currentTab === 'tx' && (
                      <div>
                        {acctTxs.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Nenhuma transação pontual registrada.</p>
                        ) : (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Descrição</th>
                                <th>Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {acctTxs.map(tx => (
                                <tr key={tx.id}>
                                  <td>{formatDate(tx.date)}</td>
                                  <td>
                                    {tx.type === 'income' ? (
                                      <span style={{ color: 'var(--success-400)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                                        <ArrowUpRight size={14} /> Receita
                                      </span>
                                    ) : (
                                      <span style={{ color: 'var(--danger-400)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                                        <ArrowDownRight size={14} /> Despesa
                                      </span>
                                    )}
                                  </td>
                                  <td>{tx.description || '—'}</td>
                                  <td style={{ fontWeight: 700, color: tx.type === 'income' ? 'var(--success-400)' : 'var(--text-primary)' }}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {/* Tab Content: PLANS */}
                    {currentTab === 'plans' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                           <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }} onClick={() => setShowPlanModal(acct.id)}>
                             <Clock size={14} /> Adicionar Previsão
                           </button>
                        </div>
                        {acctPlans.length === 0 ? (
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Nenhuma previsão/recorrência configurada para esta conta.</p>
                        ) : (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Nome</th>
                                <th>Frequência</th>
                                <th>Próx. Data</th>
                                <th>Valor</th>
                                <th style={{ width: 48 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {acctPlans.map(plan => (
                                <tr key={plan.id}>
                                  <td style={{ fontWeight: 600 }}>{plan.name}</td>
                                  <td>
                                    <span style={{ fontSize: '0.75rem', background: 'var(--bg-surface)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--bg-border)' }}>
                                      {plan.frequency === 'monthly' ? 'Mensal' : plan.frequency === 'yearly' ? 'Anual' : 'Única'}
                                    </span>
                                  </td>
                                  <td>{plan.target_date ? formatDate(plan.target_date) : '—'}</td>
                                  <td style={{ fontWeight: 700, color: plan.type === 'income' ? 'var(--success-400)' : 'var(--text-primary)' }}>
                                    {plan.type === 'income' ? '+' : '-'}{formatCurrency(plan.amount)}
                                  </td>
                                  <td>
                                    <button className="btn-danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDeletePlan(plan.id)}>
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
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Modal: Nova Conta */}
      {showNewAccountModal && (
        <div className="modal-overlay" onClick={() => setShowNewAccountModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Nova Conta</h2>
            <form onSubmit={handleCreateAccountType} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label" htmlFor="new-account-name">Nome da conta</label>
                <input id="new-account-name" name="name" className="input" placeholder="ex: Nubank" required />
              </div>
              <div>
                <label className="label">Ícone</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ICON_OPTIONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setSelectedIcon(icon)} style={{ width: '40px', height: '40px', background: selectedIcon === icon ? 'rgba(99,102,241,0.2)' : 'var(--bg-surface)', border: selectedIcon === icon ? '2px solid var(--brand-500)' : '1px solid var(--bg-border)', borderRadius: '8px', fontSize: '1.25rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Cor</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {COLOR_OPTIONS.map(color => (
                    <button key={color} type="button" onClick={() => setSelectedColor(color)} style={{ width: '32px', height: '32px', background: color, borderRadius: '50%', border: 'none', cursor: 'pointer', outline: selectedColor === color ? `3px solid ${color}` : '3px solid transparent', outlineOffset: '2px', transition: 'outline 0.15s' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewAccountModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>{isPending ? 'Criando...' : 'Criar Conta'}</button>
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
              Atualizar Saldo Total — {accountTypes.find(a => a.id === showSnapshotModal)?.name}
            </h2>
            <form onSubmit={handleCreateSnapshot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="hidden" name="account_type_id" value={showSnapshotModal} />
              <div>
                <label className="label" htmlFor="snap-balance">Novo Saldo Atual (R$)</label>
                <input id="snap-balance" name="balance" type="number" step="0.01" min="0" required placeholder="0,00" className="input" />
              </div>
              <div>
                <label className="label" htmlFor="snap-date">Data</label>
                <input id="snap-date" name="snapshot_date" type="date" defaultValue={today} required className="input" />
              </div>
              <div>
                <label className="label" htmlFor="snap-notes">Observações (opcional)</label>
                <input id="snap-notes" name="notes" type="text" placeholder="ex: Fechamento do mês" className="input" />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowSnapshotModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Transação (Gasto/Ganho) */}
      {showTxModal && (
        <div className="modal-overlay" onClick={() => setShowTxModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              Gasto ou Ganho — {accountTypes.find(a => a.id === showTxModal)?.name}
            </h2>
            <form onSubmit={handleCreateTx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="hidden" name="account_type_id" value={showTxModal} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label">Tipo</label>
                  <select name="type" className="input" required defaultValue="expense">
                    <option value="expense">Despesa (-)</option>
                    <option value="income">Receita (+)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Valor (R$)</label>
                  <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" className="input" />
                </div>
              </div>
              <div>
                <label className="label">Data</label>
                <input name="date" type="date" defaultValue={today} required className="input" />
              </div>
              <div>
                <label className="label">Descrição</label>
                <input name="description" type="text" placeholder="ex: Conta de Luz" className="input" required />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* Adicionar esta transação ajustará automaticamente o saldo atual da sua conta gerando um novo registro de Snapshot.</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowTxModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>{isPending ? 'Salvando...' : 'Adicionar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Previsão (Recorrente) */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>
              Nova Previsão — {accountTypes.find(a => a.id === showPlanModal)?.name}
            </h2>
            <form onSubmit={handleCreatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="hidden" name="account_type_id" value={showPlanModal} />
              <div>
                <label className="label">Nome da Previsão</label>
                <input name="name" type="text" placeholder="ex: Salário Mensal, Aluguel" className="input" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label">Tipo</label>
                  <select name="type" className="input" required defaultValue="expense">
                    <option value="expense">Despesa (-)</option>
                    <option value="income">Receita (+)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Valor (R$)</label>
                  <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" className="input" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label">Frequência</label>
                  <select name="frequency" className="input" required defaultValue="monthly">
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                    <option value="one-time">Única (Apenas 1x)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Próxima Data (Vencimento)</label>
                  <input name="target_date" type="date" defaultValue={today} required className="input" />
                </div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* Quando a data for atingida, o sistema abaterá este valor automaticamente da conta na próxima vez que você abrir o Dashboard.</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowPlanModal(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar Previsão'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
