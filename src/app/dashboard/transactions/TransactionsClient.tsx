'use client'

import { useState, useMemo, useTransition } from 'react'
import {
  Receipt,
  Search,
  Filter,
  X,
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
import type { Transaction, AccountType } from '@/types/database'

interface TransactionsClientProps {
  initialTransactions: Transaction[]
  accounts: AccountType[]
}

type PeriodPreset =
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'all'
  | 'custom'

type GroupByMode = 'day' | 'week' | 'month' | 'none'

export default function TransactionsClient({
  initialTransactions,
  accounts,
}: TransactionsClientProps) {
  const [isPending, startTransition] = useTransition()

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [groupBy, setGroupBy] = useState<GroupByMode>('day')

  // Edit / Delete Dialog states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
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

  // Date range calculation for period filters
  const dateRange = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed

    if (periodPreset === 'this_month') {
      const start = new Date(currentYear, currentMonth, 1)
      const end = new Date(currentYear, currentMonth + 1, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }

    if (periodPreset === 'last_month') {
      const start = new Date(currentYear, currentMonth - 1, 1)
      const end = new Date(currentYear, currentMonth, 0)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }

    if (periodPreset === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      }
    }

    if (periodPreset === 'last_90_days') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return {
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0],
      }
    }

    if (periodPreset === 'this_year') {
      const start = new Date(currentYear, 0, 1)
      const end = new Date(currentYear, 11, 31)
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      }
    }

    if (periodPreset === 'custom') {
      return {
        start: customStartDate || '1970-01-01',
        end: customEndDate || '2099-12-31',
      }
    }

    // 'all'
    return { start: '1970-01-01', end: '2099-12-31' }
  }, [periodPreset, customStartDate, customEndDate])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter(tx => {
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

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const descMatch = (tx.description || '').toLowerCase().includes(query)
        const catMatch = (tx.category || '').toLowerCase().includes(query)
        const accountName = tx.account_type_id ? accountsMap.get(tx.account_type_id)?.name.toLowerCase() || '' : ''
        const accMatch = accountName.includes(query)

        if (!descMatch && !catMatch && !accMatch) {
          return false
        }
      }

      return true
    })
  }, [
    initialTransactions,
    dateRange,
    selectedAccountId,
    selectedType,
    selectedCategory,
    searchQuery,
    accountsMap,
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

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedAccountId !== 'all' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    periodPreset !== 'this_month'

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedAccountId('all')
    setSelectedType('all')
    setSelectedCategory('all')
    setPeriodPreset('this_month')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  // Grouping helper functions
  const groupedSections = useMemo(() => {
    if (groupBy === 'none') {
      return [
        {
          key: 'all',
          title: 'Todas as Transações',
          items: filteredTransactions,
          income: kpis.income,
          expense: kpis.expense,
          net: kpis.net,
        },
      ]
    }

    const groups = new Map<
      string,
      {
        key: string
        title: string
        sortKey: string
        items: Transaction[]
        income: number
        expense: number
        net: number
      }
    >()

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    for (const tx of filteredTransactions) {
      let groupKey = ''
      let groupTitle = ''
      let sortKey = ''

      if (groupBy === 'day') {
        groupKey = tx.date
        sortKey = tx.date
        if (tx.date === todayStr) {
          groupTitle = `Hoje, ${formatDate(tx.date)}`
        } else if (tx.date === yesterdayStr) {
          groupTitle = `Ontem, ${formatDate(tx.date)}`
        } else {
          // Format e.g. "Sexta-feira, 05/09/2026"
          const dateObj = new Date(tx.date + 'T12:00:00')
          const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dateObj)
          const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
          groupTitle = `${capitalizedWeekday}, ${formatDate(tx.date)}`
        }
      } else if (groupBy === 'week') {
        const dateObj = new Date(tx.date + 'T12:00:00')
        const dayOfWeek = dateObj.getDay() // 0 = Sunday
        const diffToMonday = (dayOfWeek + 6) % 7
        const monday = new Date(dateObj)
        monday.setDate(dateObj.getDate() - diffToMonday)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        const mStr = monday.toISOString().split('T')[0]
        const sStr = sunday.toISOString().split('T')[0]
        groupKey = `week-${mStr}`
        sortKey = mStr
        groupTitle = `Semana ${formatDate(mStr)} a ${formatDate(sStr)}`
      } else if (groupBy === 'month') {
        const [year, month] = tx.date.split('-')
        groupKey = `${year}-${month}`
        sortKey = groupKey
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1)
        const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dateObj)
        groupTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1)
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          title: groupTitle,
          sortKey,
          items: [],
          income: 0,
          expense: 0,
          net: 0,
        })
      }

      const grp = groups.get(groupKey)!
      grp.items.push(tx)
      if (tx.type === 'income') {
        grp.income += Number(tx.amount)
      } else {
        grp.expense += Number(tx.amount)
      }
      grp.net = grp.income - grp.expense
    }

    return Array.from(groups.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey))
  }, [filteredTransactions, groupBy, kpis])

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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>
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
            <h1 style={{ fontSize: '1.625rem', fontWeight: 800 }}>Extrato de Lançamentos</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Visão unificada e detalhada de todas as suas movimentações financeiras
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

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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

      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{ marginBottom: '1.5rem' }}>
        {/* Top filter row: Search input + Period Select + Group By */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          alignItems: 'center',
        }}>
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: '2.5rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Account Filter */}
          <select
            className="input"
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
          >
            <option value="all">Todas as Contas</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
            <option value="none">Sem conta associada</option>
          </select>

          {/* Type Filter */}
          <select
            className="input"
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as 'all' | 'expense' | 'income')}
          >
            <option value="all">Todos os Tipos</option>
            <option value="expense">Apenas Despesas (-)</option>
            <option value="income">Apenas Receitas (+)</option>
          </select>

          {/* Category Filter */}
          <select
            className="input"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="all">Todas as Categorias</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Secondary row: Quick Period Chips + Grouping Toggle + Clear Button */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          borderTop: '1px solid var(--bg-border-subtle)',
          paddingTop: '0.875rem',
        }}>
          {/* Period Chips */}
          <div className="filter-chip-group">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
              Período:
            </span>
            <button
              type="button"
              className={`filter-chip ${periodPreset === 'this_month' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('this_month')}
            >
              Este Mês
            </button>
            <button
              type="button"
              className={`filter-chip ${periodPreset === 'last_month' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('last_month')}
            >
              Mês Anterior
            </button>
            <button
              type="button"
              className={`filter-chip ${periodPreset === 'last_30_days' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('last_30_days')}
            >
              30 Dias
            </button>
            <button
              type="button"
              className={`filter-chip ${periodPreset === 'last_90_days' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('last_90_days')}
            >
              90 Dias
            </button>
            <button
              type="button"
              className={`filter-chip ${periodPreset === 'this_year' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('this_year')}
            >
              Este Ano
            </button>
            <button
              type="button"
              className={`filter-chip ${periodPreset === 'all' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('all')}
            >
              Tudo
            </button>
            <button
              type="button"
              className={`filter-chip ${periodPreset === 'custom' ? 'active' : ''}`}
              onClick={() => setPeriodPreset('custom')}
            >
              Personalizado
            </button>
          </div>

          {/* Grouping Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agrupar:</span>
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--bg-border)',
              padding: '2px',
            }}>
              {(['day', 'week', 'month', 'none'] as GroupByMode[]).map(mode => {
                const labels: Record<GroupByMode, string> = {
                  day: 'Dia',
                  week: 'Semana',
                  month: 'Mês',
                  none: 'Nenhum',
                }
                const isActive = groupBy === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGroupBy(mode)}
                    style={{
                      padding: '0.25rem 0.625rem',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 600 : 500,
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? 'var(--brand-600)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {labels[mode]}
                  </button>
                )
              })}
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn-ghost"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.375rem 0.625rem',
                  height: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={13} />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Pickers when 'custom' is active */}
        {periodPreset === 'custom' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px dashed var(--bg-border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>De:</span>
              <input
                type="date"
                className="input"
                style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Até:</span>
              <input
                type="date"
                className="input"
                style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

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
              <div className="glass-card tx-table-desktop" style={{ overflow: 'hidden' }}>
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
                                onClick={() => setEditingTx(tx)}
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
                      className="glass-card"
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                          {tx.description || 'Sem descrição'}
                        </span>
                        {tx.category && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                            {tx.category}
                          </span>
                        )}
                      </div>

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
                            onClick={() => setEditingTx(tx)}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="label">Tipo</label>
                <select name="type" className="input" required defaultValue={editingTx.type}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
              <input
                name="category"
                type="text"
                list="edit-modal-categories"
                placeholder="ex: Alimentação, Transporte..."
                className="input"
                defaultValue={editingTx.category || ''}
              />
              <datalist id="edit-modal-categories">
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
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
      />
    </div>
  )
}
