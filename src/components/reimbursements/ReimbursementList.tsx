'use client'

import { useState } from 'react'
import { reimbursementLabels } from '@/lib/reimbursements'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Reimbursement, ReimbursementStatus } from '@/types/reimbursements'
import styles from '@/components/invoices/invoices.module.css'

interface ReimbursementListProps {
  records: Reimbursement[]
  today: string
  pending: boolean
  onEdit: (record: Reimbursement) => void
  onDelete: (record: Reimbursement) => void
  onStatus: (record: Reimbursement, status: ReimbursementStatus) => void
}

export default function ReimbursementList({ records, today, pending, onEdit, onDelete, onStatus }: ReimbursementListProps) {
  const [page, setPage] = useState(0)
  const current = Math.min(page, Math.max(0, Math.ceil(records.length / 10) - 1))
  return <div className={styles.stack}>
    {records.slice(current * 10, current * 10 + 10).map(record => <article key={record.id} className={styles.item}>
      <div className={styles.between}><strong>{record.description}</strong><strong>{formatCurrency(record.amount_cents / 100)}</strong></div>
      <p className={styles.muted}>{record.source === 'bank' ? 'Banco' : 'Cartão'} · {record.expense_description} · {formatDate(record.expense_date)}</p>
      <div className={styles.between}><span className={`badge ${record.status === 'reimbursed' ? 'badge-success' : record.status === 'not_reimbursed' ? 'badge-danger' : 'badge-neutral'}`}>{reimbursementLabels[record.status]}</span><span className={record.due_date < today && ['to_claim', 'claimed'].includes(record.status) ? styles.late : styles.muted}>Cobrar até {formatDate(record.due_date)}</span></div>
      {record.status === 'reimbursed' && record.reimbursed_at && <p className={styles.muted}>Recebido em {new Date(record.reimbursed_at).toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza' })}</p>}
      {!record.transaction_id && !record.invoice_item_id && <p className={styles.muted}>O lançamento original foi removido. O acompanhamento e o valor registrado foram preservados.</p>}
      <div className={styles.row}>
        {record.status === 'to_claim' && <button className="btn-ghost" disabled={pending} onClick={() => onStatus(record, 'claimed')}>Marcar já cobrado</button>}
        {record.status !== 'reimbursed' && <button className="btn-primary" disabled={pending} onClick={() => onStatus(record, 'reimbursed')}>Marcar reembolsado</button>}
        <button className="btn-ghost" disabled={pending} onClick={() => onEdit(record)}>Editar</button>
        <button className="btn-ghost" disabled={pending} onClick={() => onDelete(record)}>Remover</button>
      </div>
    </article>)}
    {!records.length && <p className={styles.muted}>Nenhum reembolso nesta lista.</p>}
    {records.length > 10 && <div className={styles.row}><button className="btn-ghost" disabled={!current} onClick={() => setPage(current - 1)}>Anterior</button><span>Página {current + 1} de {Math.ceil(records.length / 10)}</span><button className="btn-ghost" disabled={(current + 1) * 10 >= records.length} onClick={() => setPage(current + 1)}>Próxima</button></div>}
  </div>
}
