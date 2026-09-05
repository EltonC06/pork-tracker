'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Edit2, BarChart2, History, Calendar, Clock, Upload } from 'lucide-react'
import { createAccountType, deleteSnapshot } from '@/app/actions/accounts'
import { deleteTransaction } from '@/app/actions/transactions'
import { createRecurringPlan, deleteRecurringPlan } from '@/app/actions/planning'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AccountType, AccountSnapshot, Transaction, RecurringPlan } from '@/types/database'
import AccountLineChart from '@/components/charts/AccountLineChart'
import TabBar from '@/components/ui/TabBar'
import EmptyState from '@/components/ui/EmptyState'
import FormModal from '@/components/ui/FormModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import OfxImportModal from '@/components/ui/OfxImportModal'
import AccountCard from './components/AccountCard'
import SnapshotForm from './components/SnapshotForm'
import TransactionForm from './components/TransactionForm'
import AccountEditForm from './components/AccountEditForm'

const ICON_OPTIONS = ['💰', '🏦', '💳', '🏠', '📈', '💎', '🪙', '🏧', '💵', '🎯']
const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f43f5e', '#84cc16',
]

const ACCOUNT_TABS = [
  { id: 'overview', label: 'Visão Geral', icon: <BarChart2 size={16} /> },
  { id: 'tx', label: 'Transações', icon: <History size={16} /> },
  { id: 'plans', label: 'Previsões', icon: <Calendar size={16} /> },
]

interface Props {
  accountTypes: AccountType[]
  snapshots: AccountSnapshot[]
  transactions: Transaction[]
  recurringPlans: RecurringPlan[]
}

export default function AccountsClient({ accountTypes, snapshots, transactions, recurringPlans }: Props) {
  const [isPending, startTransition] = useTransition()

  // UI State
  const [showNewAccountModal, setShowNewAccountModal] = useState(false)
  const [showSnapshotModal, setShowSnapshotModal] = useState<string | null>(null)
  const [showTxModal, setShowTxModal] = useState<string | null>(null)
  const [showEditTxModal, setShowEditTxModal] = useState<Transaction | null>(null)
  const [showPlanModal, setShowPlanModal] = useState<string | null>(null)
  const [showEditAccount, setShowEditAccount] = useState<AccountType | null>(null)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({})
  const [selectedIcon, setSelectedIcon] = useState('💰')
  const [selectedColor, setSelectedColor] = useState('#6366f1')
  const [showOfxModal, setShowOfxModal] = useState<string | null>(null)

  // Delete confirm states
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'snapshot' | 'tx' | 'plan'; id: string; label: string } | null>(null)

  // Compute latest balance per account
  const latestBalances: Record<string, { balance: number; date: string } | null> = {}
  for (const acct of accountTypes) {
    const acctSnaps = snapshots.filter(s => s.account_type_id === acct.id)
    latestBalances[acct.id] = acctSnaps.length > 0
      ? { balance: acctSnaps[0].balance, date: acctSnaps[0].snapshot_date }
      : null
  }

  // Handlers
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  function handleConfirmDelete() {
    if (!deleteConfirm) return
    startTransition(async () => {
      try {
        if (deleteConfirm.type === 'snapshot') {
          await deleteSnapshot(deleteConfirm.id)
          toast.success('Registro excluído.')
        } else if (deleteConfirm.type === 'tx') {
          await deleteTransaction(deleteConfirm.id)
          toast.success('Transação excluída.')
        } else if (deleteConfirm.type === 'plan') {
          await deleteRecurringPlan(deleteConfirm.id)
          toast.success('Previsão removida.')
        }
        setDeleteConfirm(null)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
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
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowOfxModal('open')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            title="Importar extrato bancário em formato .ofx"
          >
            <Upload size={16} /> Importar OFX
          </button>
          <button className="btn-primary" onClick={() => setShowNewAccountModal(true)}>
            <Plus size={16} /> Nova Conta
          </button>
        </div>
      </div>

      {/* Account Cards */}
      {accountTypes.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="Nenhuma conta cadastrada"
          description='Clique em "Nova Conta" para começar'
          action={{ label: '+ Nova Conta', onClick: () => setShowNewAccountModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {accountTypes.map(acct => {
            const acctSnaps = snapshots
              .filter(s => s.account_type_id === acct.id)
              .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
            const acctTxs = transactions.filter(t => t.account_type_id === acct.id)
            const acctPlans = recurringPlans.filter(p => p.account_type_id === acct.id)
            const isExpanded = expandedAccount === acct.id
            const currentTab = activeTabs[acct.id] || 'overview'
            const chartData = acctSnaps.map(s => ({ date: s.snapshot_date, balance: s.balance }))

            return (
              <AccountCard
                key={acct.id}
                account={acct}
                latestBalance={latestBalances[acct.id]}
                isExpanded={isExpanded}
                onToggleExpand={() => setExpandedAccount(isExpanded ? null : acct.id)}
                onAddTransaction={() => setShowTxModal(acct.id)}
                onAddSnapshot={() => setShowSnapshotModal(acct.id)}
                onEditAccount={() => setShowEditAccount(acct)}
                onImportOfx={() => setShowOfxModal(acct.id)}
              >
                {/* Tab Navigation */}
                <TabBar
                  tabs={ACCOUNT_TABS}
                  activeTab={currentTab}
                  onChange={tabId => setActiveTabs({ ...activeTabs, [acct.id]: tabId })}
                />

                {/* Tab: Overview */}
                {currentTab === 'overview' && (
                  <div>
                    {chartData.length >= 2 && (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>
                          Evolução do saldo
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
                                <button
                                  className="btn-danger"
                                  style={{ padding: '0.25rem 0.5rem' }}
                                  onClick={() => setDeleteConfirm({ type: 'snapshot', id: snap.id, label: 'este registro de saldo' })}
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

                {/* Tab: Transactions */}
                {currentTab === 'tx' && (
                  <div>
                    {acctTxs.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Nenhuma transação registrada.</p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Categoria</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th style={{ width: 80 }}></th>
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
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                                {tx.category || '—'}
                              </td>
                              <td>{tx.description || '—'}</td>
                              <td style={{ fontWeight: 700, color: tx.type === 'income' ? 'var(--success-400)' : 'var(--text-primary)' }}>
                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', minHeight: 0 }} onClick={() => setShowEditTxModal(tx)} title="Editar">
                                    <Edit2 size={13} />
                                  </button>
                                  <button className="btn-danger" style={{ padding: '0.25rem 0.5rem', minHeight: 0 }} onClick={() => setDeleteConfirm({ type: 'tx', id: tx.id, label: 'esta transação' })} title="Excluir">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab: Plans */}
                {currentTab === 'plans' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }} onClick={() => setShowPlanModal(acct.id)}>
                        <Clock size={14} /> Adicionar Previsão
                      </button>
                    </div>
                    {acctPlans.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Nenhuma previsão configurada.</p>
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
                                <span className="badge badge-neutral">
                                  {plan.frequency === 'monthly' ? 'Mensal' : plan.frequency === 'yearly' ? 'Anual' : 'Única'}
                                </span>
                              </td>
                              <td>{plan.target_date ? formatDate(plan.target_date) : '—'}</td>
                              <td style={{ fontWeight: 700, color: plan.type === 'income' ? 'var(--success-400)' : 'var(--text-primary)' }}>
                                {plan.type === 'income' ? '+' : '-'}{formatCurrency(plan.amount)}
                              </td>
                              <td>
                                <button className="btn-danger" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setDeleteConfirm({ type: 'plan', id: plan.id, label: 'esta previsão' })}>
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
              </AccountCard>
            )
          })}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Modal: Nova Conta */}
      <FormModal isOpen={showNewAccountModal} onClose={() => setShowNewAccountModal(false)} title="Nova Conta">
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
      </FormModal>

      {/* Modal: Registrar Saldo */}
      {showSnapshotModal && (
        <SnapshotForm
          isOpen={true}
          onClose={() => setShowSnapshotModal(null)}
          accountName={accountTypes.find(a => a.id === showSnapshotModal)?.name ?? ''}
          accountTypeId={showSnapshotModal}
        />
      )}

      {/* Modal: Nova Transação */}
      {showTxModal && (
        <TransactionForm
          isOpen={true}
          onClose={() => setShowTxModal(null)}
          accountName={accountTypes.find(a => a.id === showTxModal)?.name ?? ''}
          accountTypeId={showTxModal}
        />
      )}

      {/* Modal: Editar Transação */}
      {showEditTxModal && (
        <TransactionForm
          isOpen={true}
          onClose={() => setShowEditTxModal(null)}
          accountName={accountTypes.find(a => a.id === showEditTxModal.account_type_id)?.name ?? ''}
          accountTypeId={showEditTxModal.account_type_id ?? ''}
          editingTransaction={showEditTxModal}
        />
      )}

      {/* Modal: Editar Conta */}
      {showEditAccount && (
        <AccountEditForm
          isOpen={true}
          onClose={() => setShowEditAccount(null)}
          account={showEditAccount}
        />
      )}

      {/* Modal: Nova Previsão */}
      {showPlanModal && (
        <FormModal isOpen={true} onClose={() => setShowPlanModal(null)} title={`Nova Previsão — ${accountTypes.find(a => a.id === showPlanModal)?.name}`}>
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
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* Quando a data for atingida, o sistema processará esta previsão automaticamente.</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowPlanModal(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar Previsão'}</button>
            </div>
          </form>
        </FormModal>
      )}

      {/* Confirm Dialog for deletions */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Confirmar Exclusão"
        message={`Deseja realmente excluir ${deleteConfirm?.label ?? 'este item'}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* OFX Import Modal */}
      <OfxImportModal
        isOpen={!!showOfxModal}
        onClose={() => setShowOfxModal(null)}
        accounts={accountTypes}
        existingTransactions={transactions}
        initialAccountId={showOfxModal === 'open' ? undefined : showOfxModal || undefined}
      />
    </div>
  )
}
