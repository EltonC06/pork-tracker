'use client'

import { useState, useEffect, useRef, useTransition, useMemo } from 'react'
import { Plus, ArrowDownLeft, ArrowUpRight, Check, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createTransaction } from '@/app/actions/transactions'
import FormModal from './FormModal'

export interface QuickAddAccount {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface QuickAddFabProps {
  accounts: QuickAddAccount[]
  initialCategories?: string[]
}

const STORAGE_KEY_LAST_ACCOUNT = 'pork_last_account_id'

export default function QuickAddFab({
  accounts = [],
  initialCategories = [],
}: QuickAddFabProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form states
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  // User manual selection override (if changed in select)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  const amountInputRef = useRef<HTMLInputElement>(null)

  // Determine active account: manual selection > localStorage > first account
  const activeAccountId = useMemo(() => {
    if (selectedAccountId && accounts.some(a => a.id === selectedAccountId)) {
      return selectedAccountId
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_LAST_ACCOUNT)
      if (saved && accounts.some(a => a.id === saved)) {
        return saved
      }
    }
    return accounts[0]?.id || ''
  }, [selectedAccountId, accounts])

  // Focus amount input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus()
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Global keyboard shortcut: Ctrl+N or Cmd+N to open FAB
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+N or Cmd+N
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        // If an input is focused and modal is not open, prevent standard browser new window
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Common category suggestions
  const suggestedCategories = useMemo(() => {
    const baseSuggestions = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Salário', 'Investimento']
    const combined = Array.from(new Set([...initialCategories, ...baseSuggestions])).filter(Boolean)
    return combined.slice(0, 8)
  }, [initialCategories])

  const resetForm = (full = false) => {
    setAmount('')
    setDescription('')
    if (full) {
      setType('expense')
      setCategory('')
      setDate(new Date().toISOString().split('T')[0])
    }
  }

  const handleSave = (keepOpen: boolean) => {
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Informe um valor válido maior que zero.')
      amountInputRef.current?.focus()
      return
    }

    if (!description.trim()) {
      toast.error('Informe uma descrição para o lançamento.')
      return
    }

    const accountToUse = selectedAccountId || activeAccountId
    const fd = new FormData()
    if (accountToUse) {
      fd.append('account_type_id', accountToUse)
    }
    fd.append('amount', parsedAmount.toString())
    fd.append('type', type)
    if (category.trim()) fd.append('category', category.trim())
    if (date) fd.append('date', date)
    fd.append('description', description.trim())

    startTransition(async () => {
      try {
        await createTransaction(fd)

        // Save last used account in localStorage
        if (accountToUse && typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_LAST_ACCOUNT, accountToUse)
        }

        if (keepOpen) {
          toast.success('Transação registrada! Pronto para o próximo.')
          resetForm(false)
          amountInputRef.current?.focus()
        } else {
          toast.success('Transação registrada com sucesso!')
          setIsOpen(false)
          resetForm(true)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar transação'
        toast.error(msg)
      }
    })
  }

  // Keyboard shortcut inside form: Ctrl+Enter (Save & Close), Ctrl+Shift+Enter (Save & New)
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        handleSave(true)
      } else {
        handleSave(false)
      }
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        className="quick-add-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Adicionar lançamento rápido"
        title="Novo Lançamento (Ctrl+N)"
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.2)',
        }}>
          <Plus size={16} strokeWidth={3} />
        </div>
        <span>Novo Lançamento</span>
        <span className="fab-shortcut-badge">Ctrl+N</span>
      </button>

      {/* Quick Add Modal */}
      <FormModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          resetForm(true)
        }}
        title="Lançamento Rápido"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            handleSave(false)
          }}
          onKeyDown={handleFormKeyDown}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}
        >
          {/* Type Toggle: Despesa / Receita */}
          <div>
            <label className="label" style={{ marginBottom: '0.375rem' }}>Tipo de Movimentação</label>
            <div className="type-segmented-control">
              <button
                type="button"
                className={`type-segmented-btn ${type === 'expense' ? 'active-expense' : ''}`}
                onClick={() => setType('expense')}
              >
                <ArrowDownLeft size={16} />
                Despesa
              </button>
              <button
                type="button"
                className={`type-segmented-btn ${type === 'income' ? 'active-income' : ''}`}
                onClick={() => setType('income')}
              >
                <ArrowUpRight size={16} />
                Receita
              </button>
            </div>
          </div>

          {/* Amount & Account */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label className="label" htmlFor="quick-add-amount">Valor (R$)*</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="quick-add-amount"
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  required
                  className="input"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: type === 'expense' ? 'var(--danger-400)' : 'var(--success-400)',
                  }}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="quick-add-account">Conta</label>
              <select
                id="quick-add-account"
                className="input"
                value={activeAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                style={{ height: '46px' }}
              >
                {accounts.length === 0 ? (
                  <option value="">Sem conta associada</option>
                ) : (
                  accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label" htmlFor="quick-add-desc">Descrição*</label>
            <input
              id="quick-add-desc"
              type="text"
              placeholder="ex: Mercado da semana, Aluguel, Almoço..."
              required
              className="input"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Category with autocomplete datalist + quick chips */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="label" htmlFor="quick-add-category">Categoria</label>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>opcional</span>
            </div>
            <input
              id="quick-add-category"
              type="text"
              list="quick-add-categories-list"
              placeholder="ex: Alimentação, Transporte, Lazer..."
              className="input"
              value={category}
              onChange={e => setCategory(e.target.value)}
            />
            <datalist id="quick-add-categories-list">
              {suggestedCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>

            {/* Suggested category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
              {suggestedCategories.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  style={{
                    fontSize: '0.6875rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    border: category === cat ? '1px solid var(--brand-500)' : '1px solid var(--bg-border)',
                    background: category === cat ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-surface)',
                    color: category === cat ? 'var(--brand-400)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="label" htmlFor="quick-add-date">Data</label>
            <input
              id="quick-add-date"
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Shortcut hint */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            background: 'var(--bg-surface)',
            borderRadius: '8px',
            border: '1px solid var(--bg-border)',
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} color="var(--brand-400)" />
              Dica de atalho:
            </span>
            <span>
              <kbd style={{ padding: '2px 4px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--bg-border)' }}>Ctrl+Enter</kbd> Salvar &bull;{' '}
              <kbd style={{ padding: '2px 4px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--bg-border)' }}>Ctrl+Shift+Enter</kbd> Salvar e Novo
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ flex: 1 }}
              onClick={() => {
                setIsOpen(false)
                resetForm(true)
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{
                flex: 1.2,
                justifyContent: 'center',
                borderColor: 'var(--brand-500)',
                color: 'var(--brand-400)',
              }}
              disabled={isPending}
              onClick={() => handleSave(true)}
              title="Salvar e continuar lançando (Ctrl+Shift+Enter)"
            >
              Salvar e Novo
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ flex: 1.2, justifyContent: 'center' }}
              disabled={isPending}
              title="Salvar e fechar (Ctrl+Enter)"
            >
              {isPending ? 'Salvando...' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Check size={16} />
                  Salvar
                </span>
              )}
            </button>
          </div>
        </form>
      </FormModal>
    </>
  )
}
