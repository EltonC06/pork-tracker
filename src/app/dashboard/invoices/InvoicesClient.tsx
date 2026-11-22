'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { deleteCardInvoice } from '@/app/actions/invoices'
import InvoiceImport from '@/components/invoices/InvoiceImport'
import InvoicePayments from '@/components/invoices/InvoicePayments'
import InvoiceItems from '@/components/invoices/InvoiceItems'
import SpendingSummary from '@/components/invoices/SpendingSummary'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceData } from '@/types/invoices'
import type { AccountType, Transaction } from '@/types/database'
import styles from '@/components/invoices/invoices.module.css'

interface InvoicesClientProps { data: InvoiceData; transactions: Transaction[]; accounts: AccountType[] }

export default function InvoicesClient({ data, transactions, accounts }: InvoicesClientProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const invoices = [...data.invoices].sort((a, b) => b.due_date.localeCompare(a.due_date))
  const invoice = invoices.find(invoice => invoice.id === selectedId) ?? invoices[0]
  return <div className={styles.stack}>
    <header className={styles.between}>
      <div><h1 className={styles.heading}>Faturas</h1><p className={styles.muted}>Compras no cartão e pagamentos conciliados.</p></div>
      <button className="btn-primary" disabled={!data.available} onClick={() => setImportOpen(true)}>Importar PDF Inter</button>
    </header>
    <section className={`glass-card ${styles.panel} ${styles.stack}`}>
      <label className="label" htmlFor="spending-month">Mês dos lançamentos para análise</label>
      <input id="spending-month" className="input" type="month" value={month} onChange={event => { if (event.target.value) setMonth(event.target.value) }} />
      <p className={styles.muted}>O vencimento identifica a fatura. A análise segue a data informada no PDF, que em compras parceladas pode ser a data da compra original. O pagamento aparece no caixa pela data em que foi realizado.</p>
      <Link className={styles.link} href="/dashboard/transactions">Ver fluxo de caixa no extrato</Link>
    </section>
    <SpendingSummary transactions={transactions} data={data} start={`${month}-01`} end={`${month}-31`} />
    {invoices.length > 0 ? <>
      <label className="label" htmlFor="invoice-select">Fatura para conferir</label>
      <select id="invoice-select" className={`input ${styles.selector}`} value={invoice.id} onChange={event => setSelectedId(event.target.value)}>
        {invoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.card_label} · final {invoice.card_last_four} · vence {formatDate(invoice.due_date)} · {formatCurrency(invoice.total_cents / 100)}</option>)}
      </select>
      <section className={`glass-card ${styles.panel} ${styles.stack}`}>
        <div className={styles.between}><h2 className={styles.title}>{invoice.card_label} · vencimento {formatDate(invoice.due_date)}</h2><span className="badge badge-success">Composição conferida</span></div>
        <InvoicePayments key={`payments-${invoice.id}`} invoice={invoice} payments={data.payments} transactions={transactions} accounts={accounts} />
      </section>
      <section className={`glass-card ${styles.panel}`}>
        <InvoiceItems key={invoice.id} items={data.items.filter(item => item.invoice_id === invoice.id).sort((a, b) => a.position - b.position)} />
      </section>
      <button className="btn-danger" disabled={pending} onClick={() => setDeleteId(invoice.id)}>Remover detalhamento desta fatura</button>
    </> : <p className={styles.notice}>Nenhuma fatura importada. Comece pelo PDF do Inter e depois vincule a saída correspondente no extrato.</p>}
    {importOpen && <InvoiceImport onClose={() => setImportOpen(false)} />}
    <ConfirmDialog isOpen={!!deleteId} title="Remover detalhamento?" message="As compras desta fatura e seus vínculos serão removidos. O pagamento bancário continuará no extrato como despesa sem detalhamento." confirmLabel="Remover detalhamento" variant="danger" onCancel={() => setDeleteId(null)} onConfirm={() => {
      if (!deleteId || pending) return
      const id = deleteId
      setDeleteId(null)
      startTransition(async () => {
        try { await deleteCardInvoice(id); setSelectedId(''); toast.success('Detalhamento removido; extrato preservado.') }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao remover.') }
      })
    }} />
  </div>
}
