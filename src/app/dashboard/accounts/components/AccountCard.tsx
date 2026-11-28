'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Plus, Edit2, Trash2, Upload } from 'lucide-react'
import { deleteAccountType } from '@/app/actions/accounts'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AccountType } from '@/types/database'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import styles from '../accounts.module.css'

interface AccountCardProps {
  account: AccountType
  latestBalance: { balance: number; date: string } | null
  isExpanded: boolean
  onToggleExpand: () => void
  onAddTransaction: () => void
  onAddSnapshot: () => void
  onEditAccount: () => void
  onImportOfx?: () => void
  children?: ReactNode
}

export default function AccountCard({
  account,
  latestBalance,
  isExpanded,
  onToggleExpand,
  onAddTransaction,
  onAddSnapshot,
  onEditAccount,
  onImportOfx,
  children,
}: AccountCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteAccountType(account.id)
        toast.success('Conta excluída.')
        setShowDeleteConfirm(false)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido'
        toast.error(message)
      }
    })
  }

  return (
    <>
      <div className={`glass-card ${styles.card}`}>
        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div style={{
            width: '48px', height: '48px',
            background: `${account.color ?? '#6366f1'}22`,
            border: `1px solid ${account.color ?? '#6366f1'}44`,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0,
          }}>
            {account.icon ?? '💰'}
          </div>
          <div className={styles.identity}>
            <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{account.name}</h3>
            {latestBalance ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Atualizado em {formatDate(latestBalance.date)}
              </p>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Sem registros ainda</p>
            )}
          </div>
          <div className={styles.balance}>
            <p>
              {latestBalance ? formatCurrency(latestBalance.balance) : '—'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <div className={styles.primaryActions}>
            <button
              className="btn-primary"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
              onClick={onAddTransaction}
            >
              <Plus size={14} /> Gasto / Ganho
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
              onClick={onAddSnapshot}
            >
              <Plus size={14} /> Saldo
            </button>
            <button
              className="btn-ghost"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
              id={`account-${account.id}-toggle`}
              aria-expanded={isExpanded}
              aria-controls={`account-${account.id}-details`}
              aria-label={`${isExpanded ? 'Fechar' : 'Abrir'} detalhes de ${account.name}`}
              onClick={onToggleExpand}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Detalhes
            </button>
            {onImportOfx && (
              <button
                className="btn-ghost"
                style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem' }}
                onClick={onImportOfx}
                title="Importar extrato bancário .ofx para esta conta"
              >
                <Upload size={14} /> OFX
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
            <button
              className="btn-ghost"
              onClick={onEditAccount}
              title="Editar Conta"
              aria-label={`Editar conta ${account.name}`}
              style={{ padding: '0.4rem', border: 'none' }}
            >
              <Edit2 size={14} />
            </button>
            <button
              className="btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
              title="Excluir Conta"
              aria-label={`Excluir conta ${account.name}`}
              disabled={isPending}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div id={`account-${account.id}-details`} role="region" aria-labelledby={`account-${account.id}-toggle`} className={styles.details}>
            {children}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={`Excluir "${account.name}"?`}
        message="Todos os saldos, transações e previsões vinculados a esta conta serão removidos permanentemente."
        confirmLabel="Excluir Conta"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
