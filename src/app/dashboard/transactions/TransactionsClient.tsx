'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  Receipt,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Trash2,
  Calendar,
  Wallet,
  Tag,
  ArrowUpDown,
  Check,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateTransaction, deleteTransaction } from '@/app/actions/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import FormModal from '@/components/ui/FormModal'
import OfxImportModal from '@/components/ui/OfxImportModal'
import EmptyState from '@/components/ui/EmptyState'
import MonthPicker from '@/components/ui/MonthPicker'
import ReimbursementBadge from '@/components/ui/ReimbursementBadge'
import { reimbursementFor } from '@/lib/reimbursements'
import type { Reimbursement } from '@/types/reimbursements'
import { currentMonth as getCurrentMonth } from '@/lib/months'
import DateListControls from '@/components/ui/DateListControls'
import { periodRange, matchesListSearch, sortDateItems, groupDateItems, type PeriodPreset, type GroupByMode, type ListOrder } from '@/lib/dateList'
import StatementTabs from '@/components/invoices/StatementTabs'
import { isInvoicePaymentTransaction } from '@/lib/statements'
import ExpenseCategorySelect from '@/components/ui/ExpenseCategorySelect'
import type { Transaction, AccountType, ExpenseCategoryOption } from '@/types/database'

interface TransactionsClientProps {
  initialTransactions: Transaction[]
  accounts: AccountType[]
  categories: ExpenseCategoryOption[]
  reimbursements?: Reimbursement[]
}

export default function TransactionsClient({
  initialTransactions,
  accounts,
  categories,
  reimbursements = [],
}: TransactionsClientProps) {
  const [isPending, startTransition] = useTransition()

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [groupBy, setGroupBy] = useState<GroupByMode>('day')
  const [order, setOrder] = useState<ListOrder>('date_desc')

  // Edit / Delete Dialog states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editingType, setEditingType] = useState<'expense' | 'income'>('expense')
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)
  const [isOfxModalOpen, setIsOfxModalOpen] = useState(false)

  // Fast account lookup map
  const accountsMap = useMemo(() => {
    const map = new Map<string, AccountType>()
    for (const acc of accounts) {
      map.set(acc.id, acc)
    }
    return map
  }, [accounts])

  // Distinct categories from all transactions
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    for (const tx of initialTransactions) {
      if (tx.category && tx.category.trim()) {
        set.add(tx.category.trim())
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [initialTransactions])

  const dateRange = useMemo(() => periodRange(periodPreset, selectedMonth, customStartDate, customEndDate), [periodPreset, selectedMonth, customStartDate, customEndDate])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return sortDateItems(initialTransactions.filter(tx => {
      // Date filter
      if (tx.date < dateRange.start || tx.date > dateRange.end) {
        return false
      }

      // Account filter
      if (selectedAccountId !== 'all') {
        if (selectedAccountId === 'none') {
          if (tx.account_type_id) return false
        } else if (tx.account_type_id !== selectedAccountId) {
          return false
        }
      }

      // Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) {
        return false
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if (!tx.category || tx.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false
        }
      }

      if (!matchesListSearch(searchQuery, tx.description, tx.category, tx.account_type_id ? accountsMap.get(tx.account_type_id)?.name : '')) return false

      return true
    }), order, tx => Number(tx.amount))
  }, [
    initialTransactions,
    dateRange,
    selectedAccountId,
    selectedType,
    selectedCategory,
    searchQuery,
    accountsMap,
    order,
  ])

  // KPI calculations on filtered items
  const kpis = useMemo(() => {
    let income = 0
    let expense = 0
    for (const tx of filteredTransactions) {
      if (tx.type === 'income') {
        income += Number(tx.amount)
      } else {
        expense += Number(tx.amount)
      }
    }
    const net = income - expense
    return {
      income,
      expense,
      net,
      count: filteredTransactions.length,
    }
  }, [filteredTransactions])

  const handleClearFilters = () => {
    setOrder('date_desc')
    setSearchQuery('')
    setSelectedAccountId('all')
    setSelectedType('all')
    setSelectedCategory('all')
    setPeriodPreset('month')
    setSelectedMonth(getCurrentMonth())
    setCustomStartDate('')
    setCustomEndDate('')
  }

  const groupedSections = useMemo(() => groupDateItems(filteredTransactions, groupBy, order).map(section => {
    const income = section.items.reduce((sum, tx) => sum + (tx.type === 'income' ? Number(tx.amount) : 0), 0)
    const expense = section.items.reduce((sum, tx) => sum + (tx.type === 'expense' ? Number(tx.amount) : 0), 0)
    return { ...section, income, expense, net: income - expense }
  }), [filteredTransactions, groupBy, order])

  // Delete transaction action
  const confirmDelete = () => {
    if (!deletingTxId) return
    startTransition(async () => {
      try {
        await deleteTransaction(deletingTxId)
        toast.success('Lançamento excluído com sucesso.')
        setDeletingTxId(null)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao excluir lançamento'
        toast.error(msg)
      }
    })
  }

  // Update transaction action
  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingTx) return
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTransaction(editingTx.id, fd)
        toast.success('Lançamento atualizado com sucesso.')
        setEditingTx(null)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar lançamento'
        toast.error(msg)
      }
    })
  }

  return (
    <div className="transactions-page">
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-400)',
            }}>
              <Receipt size={20} />
            </div>
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800 }}>Extrato bancário</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Fluxo de caixa das contas, incluindo pagamentos de faturas. As compras do cartão ficam em Faturas.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setIsOfxModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            title="Importar extrato bancário em formato .ofx"
          >
            <Upload size={16} />
            <span>Importar OFX</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              // Trigger keyboard shortcut event to open QuickAddFab modal
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true })
              )
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      <StatementTabs active="bank" />
      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <KpiCard
          label="Total de Entradas"
          value={formatCurrency(kpis.income)}
          accent="success"
          icon={<ArrowUpRight size={20} />}
          sub={{
            value: `${filteredTransactions.filter(t => t.type === 'income').length} receitas`,
            positive: true,
            label: 'no período',
          }}
        />
        <KpiCard
          label="Total de Saídas"
          value={formatCurrency(kpis.expense)}
          accent="danger"
          icon={<ArrowDownLeft size={20} />}
          sub={{
            value: `${filteredTransactions.filter(t => t.type === 'expense').length} despesas`,
            positive: false,
            label: 'no período',
          }}
        />
        <KpiCard
          label="Saldo do Período"
          value={
            <span style={{ color: kpis.net >= 0 ? 'var(--success-400)' : 'var(--danger-400)' }}>
              {formatCurrency(kpis.net)}
            </span>
          }
          accent={kpis.net >= 0 ? 'success' : 'danger'}
          icon={<ArrowUpDown size={20} />}
          sub={{
            value: kpis.net >= 0 ? 'Superávit' : 'Déficit',
            positive: kpis.net >= 0,
            label: 'no período',
          }}
        />
        <KpiCard
          label="Total de Lançamentos"
          value={kpis.count}
          accent="neutral"
          icon={<Receipt size={20} />}
          sub={{
            value: `${accounts.length} contas`,
            positive: true,
            label: 'disponíveis',
          }}
        />
      </div>

      <section className="glass-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <MonthPicker label="Extrato bancário" value={selectedMonth} months={initialTransactions.map(tx => tx.date.slice(0, 7))} onChange={value => { setSelectedMonth(value); setPeriodPreset('month') }} />
        {periodPreset !== 'month' && <p style={{ color: 'var(--text-secondary)', fontSize: '.8125rem', marginTop: '.5rem' }}>Filtro por intervalo ativo abaixo. Selecione um mês para voltar ao filtro mensal.</p>}
      </section>
      <DateListControls search={searchQuery} onSearch={setSearchQuery} period={periodPreset} onPeriod={setPeriodPreset} start={customStartDate} end={customEndDate} onStart={setCustomStartDate} onEnd={setCustomEndDate} group={groupBy} onGroup={setGroupBy} order={order} onOrder={setOrder} onClear={handleClearFilters}>
        <label className="label">Conta<select className="input" value={selectedAccountId} onChange={event => setSelectedAccountId(event.target.value)}>
          <option value="all">Todas as contas</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}<option value="none">Sem conta associada</option>
        </select></label>
        <label className="label">Tipo<select className="input" value={selectedType} onChange={event => setSelectedType(event.target.value as 'all' | 'expense' | 'income')}>
          <option value="all">Todos os tipos</option><option value="expense">Despesas</option><option value="income">Receitas</option>
        </select></label>
        <label className="label">Categoria<select className="input" value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}>
          <option value="all">Todas as categorias</option>{availableCategories.map(category => <option key={category} value={category}>{category}</option>)}
        </select></label>
      </DateListControls>

      {/* Transaction List / Groups */}
      {initialTransactions.length === 0 ? (
        <EmptyState
          icon={<Receipt size={36} color="var(--brand-400)" />}
          title="Nenhum lançamento registrado"
          description="Você ainda não registrou nenhum gasto ou ganho. Comece a criar seu fluxo de caixa agora mesmo!"
          action={{
            label: 'Novo Lançamento',
            onClick: () => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true })
              )
            },
          }}
        />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={<Filter size={36} color="var(--brand-400)" />}
          title="Nenhum lançamento encontrado"
          description="Nenhuma transação corresponde aos filtros selecionados. Tente ajustar o período ou os termos de busca."
          action={{
            label: 'Limpar Filtros',
            onClick: handleClearFilters,
          }}
        />
      ) : (
        <div>
          {groupedSections.map(section => (
            <div key={section.key} style={{ marginBottom: '1.25rem' }}>
              {/* Group Section Header */}
              {groupBy !== 'none' && (
                <div className="tx-group-header">
                  <div className="tx-group-title">
                    <Calendar size={16} color="var(--brand-400)" />
                    <span>{section.title}</span>
                    <span className="tx-group-count">
                      {section.items.length} {section.items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <div className="tx-group-subtotal">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Subtotal:
                    </span>
                    <span style={{
                      color: section.net >= 0 ? 'var(--success-400)' : 'var(--danger-400)',
                    }}>
                      {section.net >= 0 ? '+' : ''}
                      {formatCurrency(section.net)}
                    </span>
                  </div>
                </div>
              )}

              {/* Desktop Table View */}
              <div className="glass-card tx-table-desktop table-scroll">
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '110px' }}>Data</th>
                      <th style={{ width: '180px' }}>Conta</th>
                      <th>Descrição</th>
                      <th style={{ width: '140px' }}>Categoria</th>
                      <th style={{ width: '140px', textAlign: 'right' }}>Valor</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map(tx => {
                      const account = tx.account_type_id ? accountsMap.get(tx.account_type_id) : null
                      const isIncome = tx.type === 'income'

                      return (
                        <tr key={tx.id}>
                          {/* Date */}
                          <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {formatDate(tx.date)}
                          </td>

                          {/* Account */}
                          <td>
                            {account ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '6px',
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}>
                                  <Wallet size={13} color="var(--brand-400)" />
                                </div>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                                  {account.name}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Description */}
                          <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {tx.description || 'Sem descrição'}
                            <ReimbursementBadge record={reimbursementFor(reimbursements, 'bank', tx.id)} />
                            {isInvoicePaymentTransaction(tx, categories) && <div><span className="badge badge-neutral">Fora do extrato geral</span></div>}
                          </td>

                          {/* Category badge */}
                          <td>
                            {tx.category ? (
                              <span
                                className="badge badge-neutral"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.6875rem',
                                  padding: '0.2rem 0.5rem',
                                }}
                              >
                                <Tag size={10} />
                                {tx.category}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>

                          {/* Amount */}
                          <td style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            fontSize: '0.9375rem',
                            color: isIncome ? 'var(--success-400)' : 'var(--danger-400)',
                            whiteSpace: 'nowrap',
                          }}>
                            {isIncome ? '+ ' : '- '}
                            {formatCurrency(Number(tx.amount))}
                          </td>

                          {/* Actions */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                              <button
                                type="button"
                                onClick={() => { setEditingType(tx.type); setEditingTx(tx) }}
                                title="Editar lançamento"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '0.375rem',
                                  borderRadius: '6px',
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--brand-400)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTxId(tx.id)}
                                title="Excluir lançamento"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '0.375rem',
                                  borderRadius: '6px',
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger-400)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="tx-cards-mobile">
                {section.items.map(tx => {
                  const account = tx.account_type_id ? accountsMap.get(tx.account_type_id) : null
                  const isIncome = tx.type === 'income'

                  return (
                    <div
                      key={tx.id}
                      className="glass-card transaction-card"
                      style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
                    >
                      {/* Top: Account + Date */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <Wallet size={14} color="var(--brand-400)" />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {account ? account.name : 'Sem conta'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDate(tx.date)}
                        </span>
                      </div>

                      {/* Middle: Description + Category */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                          {tx.description || 'Sem descrição'}
                          {isInvoicePaymentTransaction(tx, categories) && <span className="badge badge-neutral">Fora do extrato geral</span>}
                        </span>
                        {tx.category && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                            {tx.category}
                          </span>
                        )}
                      </div>

                      <ReimbursementBadge record={reimbursementFor(reimbursements, 'bank', tx.id)} />
                      {/* Bottom: Amount + Actions */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--bg-border-subtle)',
                        paddingTop: '0.5rem',
                        marginTop: '0.25rem',
                      }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: isIncome ? 'var(--success-400)' : 'var(--danger-400)',
                        }}>
                          {isIncome ? '+ ' : '- '}
                          {formatCurrency(Number(tx.amount))}
                        </span>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => { setEditingType(tx.type); setEditingTx(tx) }}
                            className="btn-ghost"
                            style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                          >
                            <Pencil size={13} />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTxId(tx.id)}
                            className="btn-danger"
                            style={{ padding: '0.375rem 0.625rem', fontSize: '0.75rem' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingTx && (
        <FormModal
          isOpen={true}
          onClose={() => setEditingTx(null)}
          title="Editar Lançamento"
        >
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Type */}
            <div className="form-grid">
              <div>
                <label className="label">Tipo</label>
                <select name="type" className="input" required value={editingType} onChange={event => setEditingType(event.target.value as 'expense' | 'income')}>
                  <option value="expense">Despesa (-)</option>
                  <option value="income">Receita (+)</option>
                </select>
              </div>
              <div>
                <label className="label">Valor (R$)*</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input"
                  defaultValue={editingTx.amount}
                />
              </div>
            </div>

            {/* Account & Date */}
            <div className="form-grid">
              <div>
                <label className="label">Conta</label>
                <select
                  name="account_type_id"
                  className="input"
                  defaultValue={editingTx.account_type_id || ''}
                >
                  <option value="">Sem conta associada</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Data*</label>
                <input
                  name="date"
                  type="date"
                  required
                  className="input"
                  defaultValue={editingTx.date}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="label">Categoria</label>
              {editingType === 'expense' ? (
                <ExpenseCategorySelect categories={categories} defaultValue={editingTx.category_id ?? ''} />
              ) : (
                <input name="category" type="text" placeholder="Categoria da receita (opcional)" className="input" defaultValue={editingTx.type === 'income' ? editingTx.category ?? '' : ''} />
              )}
            </div>

            {/* Description */}
            <div>
              <label className="label">Descrição*</label>
              <input
                name="description"
                type="text"
                required
                placeholder="ex: Supermercado..."
                className="input"
                defaultValue={editingTx.description || ''}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setEditingTx(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={isPending}
              >
                {isPending ? 'Salvando...' : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Check size={16} />
                    Salvar Alterações
                  </span>
                )}
              </button>
            </div>
          </form>
        </FormModal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTxId}
        title="Excluir Lançamento"
        message="Tem certeza que deseja remover este lançamento? Esta ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingTxId(null)}
      />

      {/* OFX Import Modal */}
      <OfxImportModal
        isOpen={isOfxModalOpen}
        onClose={() => setIsOfxModalOpen(false)}
        accounts={accounts}
        existingTransactions={initialTransactions}
        categories={categories}
      />
    </div>
  )
}
