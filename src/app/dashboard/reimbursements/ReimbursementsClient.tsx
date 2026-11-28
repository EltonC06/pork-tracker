'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { deleteReimbursement, updateReimbursement } from '@/app/actions/reimbursements'
import { reimbursementLabels, reimbursementSummary } from '@/lib/reimbursements'
import { formatCurrency } from '@/lib/utils'
import type { Reimbursement, ReimbursementCandidate, ReimbursementData, ReimbursementStatus } from '@/types/reimbursements'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ReimbursementForm from '@/components/reimbursements/ReimbursementForm'
import ReimbursementList from '@/components/reimbursements/ReimbursementList'
import styles from '@/components/invoices/invoices.module.css'

interface ReimbursementsClientProps { data: ReimbursementData; candidates: ReimbursementCandidate[]; today: string }

export default function ReimbursementsClient({ data, candidates, today }: ReimbursementsClientProps) {
  const [editing, setEditing] = useState<Reimbursement | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Reimbursement | null>(null)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()
  const summary = reimbursementSummary(data.records, today)
  const matches = (record: Reimbursement) => `${record.description} ${record.expense_description}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
  const open = summary.pending.filter(record => (!status || record.status === status) && matches(record))
  function changeStatus(record: Reimbursement, next: ReimbursementStatus) {
    startTransition(async () => {
      try { await updateReimbursement(record.id, { description: record.description, due_date: record.due_date, status: next }); toast.success(next === 'reimbursed' ? 'Reembolso recebido e arquivado.' : 'Situação atualizada.') }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar.') }
    })
  }
  return <div className={styles.stack}>
    <header className={styles.between}>
      <div><h1 className={styles.heading}>Reembolsos</h1><p className={styles.muted}>Associe uma compra e acompanhe o prazo de cobrança e o recebimento.</p></div>
      <button className="btn-primary" disabled={!data.available} onClick={() => setEditing('new')}><Plus size={16} />Novo reembolso</button>
    </header>
    {!data.available && <p role="status" className={styles.notice}>Aplique a nova migração de reembolsos no Supabase para ativar esta página.</p>}
    <dl className={styles.stats}>
      <div><dt>Em acompanhamento · {summary.pending.length}</dt><dd>{formatCurrency(summary.pendingCents / 100)}</dd></div>
      <div><dt>Prazo de cobrança vencido</dt><dd>{summary.overdue}</dd></div>
      <div><dt>Já reembolsados</dt><dd>{summary.received.length}</dd></div>
    </dl>
    <section className={`glass-card ${styles.panel} ${styles.row}`}>
      <div className={styles.grow}><label htmlFor="reimbursement-search">Buscar</label><input id="reimbursement-search" className="input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Motivo ou descrição da compra" /></div>
      <div className={styles.grow}><label htmlFor="reimbursement-filter">Situação em acompanhamento</label><select id="reimbursement-filter" className="input" value={status} onChange={event => setStatus(event.target.value)}><option value="">Todas</option>{(['to_claim', 'claimed', 'not_reimbursed'] as const).map(key => <option key={key} value={key}>{reimbursementLabels[key]}</option>)}</select></div>
    </section>
    <p className={styles.muted}>A situação do reembolso aparece junto à categoria do gasto. O acompanhamento não altera os totais financeiros nem cria entradas no banco.</p>
    <ReimbursementList key={`open-${status}-${query}`} records={open} today={today} pending={pending} onEdit={setEditing} onDelete={setDeleting} onStatus={changeStatus} />
    <details className={`glass-card ${styles.panel}`}>
      <summary className={styles.link}>Já reembolsados ({summary.received.length})</summary>
      <ReimbursementList key={`received-${query}`} records={summary.received.filter(matches)} today={today} pending={pending} onEdit={setEditing} onDelete={setDeleting} onStatus={changeStatus} />
    </details>
    {editing && <ReimbursementForm record={editing === 'new' ? undefined : editing} candidates={candidates} onClose={() => setEditing(null)} />}
    <ConfirmDialog isOpen={!!deleting} title="Remover acompanhamento?" message="O gasto original continuará no extrato. Apenas o acompanhamento deste reembolso será removido." confirmLabel="Remover acompanhamento" variant="danger" onCancel={() => setDeleting(null)} onConfirm={() => {
      if (!deleting || pending) return
      const id = deleting.id
      setDeleting(null)
      startTransition(async () => { try { await deleteReimbursement(id); toast.success('Acompanhamento removido.') } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao remover.') } })
    }} />
  </div>
}
