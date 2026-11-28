import { Edit2, Trash2 } from 'lucide-react'
import type { Transaction, RecurringPlan } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from '../accounts.module.css'

interface AccountTransactionsProps {
  transactions: Transaction[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
}

export function AccountTransactions({ transactions, onEdit, onDelete }: AccountTransactionsProps) {
  if (!transactions.length) return <p className={styles.empty}>Nenhuma transação registrada.</p>
  return (
    <ul className={styles.activityList} aria-label="Transações da conta">
      {transactions.map(tx => (
        <li className={styles.activityRow} key={tx.id}>
          <div className={styles.activityDescription}>
            <strong>{tx.description || 'Sem descrição'}</strong>
            <span>{formatDate(tx.date)} · {tx.type === 'income' ? 'Receita' : 'Despesa'}</span>
            <span>{tx.category || 'Sem categoria'}</span>
          </div>
          <strong className={styles.amount} style={{ color: tx.type === 'income' ? 'var(--success-400)' : 'var(--text-primary)' }}>
            {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
          </strong>
          <div className={styles.rowActions}>
            <button type="button" className="btn-secondary" onClick={() => onEdit(tx)} aria-label={`Editar transação: ${tx.description || formatDate(tx.date)}`}>
              <Edit2 size={16} /><span>Editar</span>
            </button>
            <button type="button" className="btn-danger" onClick={() => onDelete(tx.id)} aria-label={`Excluir transação: ${tx.description || formatDate(tx.date)}`}>
              <Trash2 size={16} /><span>Excluir</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

interface AccountPlansProps {
  plans: RecurringPlan[]
  onDelete: (id: string) => void
}

export function AccountPlans({ plans, onDelete }: AccountPlansProps) {
  if (!plans.length) return <p className={styles.empty}>Nenhuma previsão configurada.</p>
  return (
    <ul className={styles.activityList} aria-label="Previsões da conta">
      {plans.map(plan => (
        <li className={styles.activityRow} key={plan.id}>
          <div className={styles.activityDescription}>
            <strong>{plan.name}</strong>
            <span>{plan.frequency === 'monthly' ? 'Mensal' : plan.frequency === 'yearly' ? 'Anual' : 'Única'} · {plan.type === 'income' ? 'Receita' : 'Despesa'}</span>
            <span>Próxima data: {plan.target_date ? formatDate(plan.target_date) : 'Não definida'}</span>
          </div>
          <strong className={styles.amount} style={{ color: plan.type === 'income' ? 'var(--success-400)' : 'var(--text-primary)' }}>
            {plan.type === 'income' ? '+' : '−'}{formatCurrency(plan.amount)}
          </strong>
          <div className={styles.rowActions}>
            <button type="button" className="btn-danger" onClick={() => onDelete(plan.id)} aria-label={`Excluir previsão: ${plan.name}`}>
              <Trash2 size={16} /><span>Excluir</span>
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
