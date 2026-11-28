'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import FormModal from '@/components/ui/FormModal'
import { createReimbursement, updateReimbursement } from '@/app/actions/reimbursements'
import { reimbursementLabels } from '@/lib/reimbursements'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Reimbursement, ReimbursementCandidate, ReimbursementStatus } from '@/types/reimbursements'
import styles from '@/components/invoices/invoices.module.css'

interface ReimbursementFormProps { record?: Reimbursement; candidates: ReimbursementCandidate[]; onClose: () => void }

export default function ReimbursementForm({ record, candidates, onClose }: ReimbursementFormProps) {
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState<ReimbursementStatus>(record?.status ?? 'to_claim')
  const [error, setError] = useState('')
  const candidate = candidates.find(row => `${row.source}:${row.id}` === selected)
  const visible = candidates.filter(row => `${row.description} ${row.source === 'bank' ? 'banco' : 'cartão'} ${formatDate(row.date)}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) || `${row.source}:${row.id}` === selected)
  return <FormModal isOpen title={record ? 'Editar reembolso' : 'Novo reembolso'} onClose={() => { if (!pending) onClose() }} maxWidth="640px">
    <form className={styles.importBody} onSubmit={event => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const values = { description: String(form.get('description')), due_date: String(form.get('due_date')), status }
      setError('')
      startTransition(async () => {
        try {
          if (record) await updateReimbursement(record.id, values)
          else {
            if (!candidate) throw new Error('Selecione um gasto para acompanhar.')
            await createReimbursement({ ...values, source: candidate.source, expenseId: candidate.id })
          }
          toast.success('Reembolso salvo.'); onClose()
        } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao salvar.') }
      })
    }}>
      {!record && <>
        <div><label className="label" htmlFor="expense-search">Buscar gasto</label><input id="expense-search" className="input" value={search} onChange={event => setSearch(event.target.value)} disabled={pending} placeholder="Descrição, data ou banco/cartão" /></div>
        <div><label className="label" htmlFor="reimbursement-expense">Gasto a reembolsar</label><select id="reimbursement-expense" className="input" required value={selected} disabled={pending} onChange={event => setSelected(event.target.value)}><option value="">Selecione uma compra</option>{visible.map(row => <option key={`${row.source}:${row.id}`} value={`${row.source}:${row.id}`}>{formatDate(row.date)} · {row.source === 'bank' ? 'Banco' : 'Cartão'} · {formatCurrency(row.amountCents / 100)} · {row.description}</option>)}</select></div>
        {!candidates.length && <p className={styles.notice}>Não há gastos disponíveis. Compras já acompanhadas, estornos e pagamentos de fatura ficam fora desta seleção.</p>}
      </>}
      {(record || candidate) && <p className={styles.item}>{record?.expense_description ?? candidate?.description}<strong>{formatCurrency((record?.amount_cents ?? candidate?.amountCents ?? 0) / 100)}</strong><span className={styles.muted}>Valor registrado para este reembolso.</span></p>}
      <div><label className="label" htmlFor="reimbursement-description">Motivo / quem deve reembolsar</label><textarea id="reimbursement-description" name="description" className="input" required maxLength={500} rows={3} defaultValue={record?.description} disabled={pending} /></div>
      <div><label className="label" htmlFor="reimbursement-due">Prazo para cobrar</label><input id="reimbursement-due" name="due_date" type="date" className="input" required defaultValue={record?.due_date} disabled={pending} /></div>
      <div><label className="label" htmlFor="reimbursement-status">Situação do reembolso</label><select id="reimbursement-status" className="input" value={status} disabled={pending} onChange={event => setStatus(event.target.value as ReimbursementStatus)}>{Object.entries(reimbursementLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      {error && <p className={styles.notice} role="alert">{error}</p>}
      <button className="btn-primary" disabled={pending || (!record && !candidate)}>{pending ? 'Salvando…' : 'Salvar reembolso'}</button>
    </form>
  </FormModal>
}
