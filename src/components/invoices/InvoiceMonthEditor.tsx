'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateInvoiceMonth } from '@/app/actions/invoices'
import MonthPicker from '@/components/ui/MonthPicker'
import type { CardInvoice } from '@/types/invoices'
import styles from './invoices.module.css'

interface InvoiceMonthEditorProps { invoice: CardInvoice; onSaved: (month: string) => void }

export default function InvoiceMonthEditor({ invoice, onSaved }: InvoiceMonthEditorProps) {
  const [month, setMonth] = useState(invoice.statement_month.slice(0, 7))
  const [pending, startTransition] = useTransition()
  return <details><summary className={styles.link}>Alterar mês de referência</summary>
    <form className={styles.stack} onSubmit={event => {
      event.preventDefault()
      startTransition(async () => {
        try { await updateInvoiceMonth(invoice.id, month); onSaved(month); toast.success('Mês atualizado.') }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao alterar mês.') }
      })
    }}>
      <MonthPicker label="Referência desta fatura" value={month} disabled={pending} onChange={setMonth} />
      <button className="btn-ghost" disabled={pending}>Salvar mês</button>
    </form>
  </details>
}
