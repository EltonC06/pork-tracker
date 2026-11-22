'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteCardInvoice, updateInvoiceMonth } from '@/app/actions/invoices'
import InvoiceImport from '@/components/invoices/InvoiceImport'
import InvoiceItems from '@/components/invoices/InvoiceItems'
import StatementTabs from '@/components/invoices/StatementTabs'
import StatementAnalysis from '@/components/invoices/StatementAnalysis'
import StatementViewSwitch from '@/components/invoices/StatementViewSwitch'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { buildStatement } from '@/lib/statements'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceData } from '@/types/invoices'
import type { ExpenseCategoryOption } from '@/types/database'
import styles from '@/components/invoices/invoices.module.css'

interface InvoicesClientProps { data: InvoiceData; categories: ExpenseCategoryOption[]; initialMonth?: string; initialInvoice?: string }

export default function InvoicesClient({ data, categories, initialMonth, initialInvoice }: InvoicesClientProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [analysis, setAnalysis] = useState(false)
  const [selectedId, setSelectedId] = useState(initialInvoice ?? '')
  const invoices = [...data.invoices].sort((a, b) => b.statement_month.localeCompare(a.statement_month) || b.due_date.localeCompare(a.due_date))
  const [month, setMonth] = useState(initialMonth ?? invoices[0]?.statement_month.slice(0, 7) ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const monthlyInvoices = invoices.filter(invoice => invoice.statement_month.startsWith(month))
  const selected = monthlyInvoices.find(invoice => invoice.id === selectedId)
  const shown = selected ? [selected] : monthlyInvoices
  const entries = buildStatement('card', [], selected ? invoices.filter(invoice => invoice.id === selected.id || (!invoice.statement_month.startsWith(month) && invoice.card_last_four === selected.card_last_four)) : invoices, data.items, categories)
  return <div className={styles.stack}>
    <header className={styles.between}>
      <div><h1 className={styles.heading}>Extrato do cartão</h1><p className={styles.muted}>Compras e categorias das faturas, organizadas pelo mês de referência.</p></div>
      <button className="btn-primary" disabled={!data.available} onClick={() => setImportOpen(true)}>Importar PDF Inter</button>
    </header>
    <StatementTabs active="card" />
    {!data.available && <p role="status" className={styles.notice}>Aplique a nova migração de extratos no Supabase para ativar esta tela.</p>}
    <section className={`glass-card ${styles.panel} ${styles.row}`}>
      <label className={styles.grow}>Mês da fatura<input aria-label="Mês da fatura" className="input" type="month" value={month} onChange={event => { if (event.target.value) { setMonth(event.target.value); setSelectedId('') } }} /></label>
      <div className={styles.grow}><label htmlFor="invoice-select">Fatura</label><select id="invoice-select" className="input" value={selected?.id ?? ''} onChange={event => setSelectedId(event.target.value)}>
        <option value="">Todas as faturas do mês ({monthlyInvoices.length})</option>
        {monthlyInvoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.card_label} · final {invoice.card_last_four} · {formatCurrency(invoice.total_cents / 100)}</option>)}
      </select></div>
    </section>
    <p className={styles.muted}>As compras seguem o mês de referência. Confira o vencimento e as datas originais nos detalhes.</p>
    <StatementViewSwitch analysis={analysis} onChange={setAnalysis} />
    <StatementAnalysis entries={entries} categories={categories} month={month} showDetails={analysis} cardOnly />
    {!shown.length && <p className={styles.notice}>Nenhuma fatura neste mês. Importe o PDF ou selecione outro mês.</p>}
    {!analysis && shown.map(invoice => <section key={invoice.id} className={`glass-card ${styles.panel} ${styles.stack}`}>
      <div className={styles.between}><h2 className={styles.title}>{invoice.card_label} · final {invoice.card_last_four}</h2><strong>{formatCurrency(invoice.total_cents / 100)}</strong></div>
      <p className={styles.muted}>Vencimento: {formatDate(invoice.due_date)} · referência: {invoice.statement_month.slice(5, 7)}/{invoice.statement_month.slice(0, 4)}</p>
      <details><summary className={styles.link}>Alterar mês de referência</summary>
        <form className={styles.row} onSubmit={event => {
          event.preventDefault()
          const value = String(new FormData(event.currentTarget).get('month'))
          startTransition(async () => { try { await updateInvoiceMonth(invoice.id, value); setMonth(value); setSelectedId(invoice.id); toast.success('Mês atualizado.') } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao alterar mês.') } })
        }}><label className={styles.grow}>Mês<input type="month" name="month" required className="input" defaultValue={invoice.statement_month.slice(0, 7)} disabled={pending} /></label><button className="btn-ghost" disabled={pending}>Salvar mês</button></form>
      </details>
      <InvoiceItems key={invoice.id + data.items.filter(item => item.invoice_id === invoice.id).map(item => item.category_id).join()} items={data.items.filter(item => item.invoice_id === invoice.id).sort((a, b) => a.position - b.position)} categories={categories} />
      <button className="btn-danger" disabled={pending} onClick={() => setDeleteId(invoice.id)}>Excluir esta fatura</button>
    </section>)}
    {importOpen && <InvoiceImport categories={categories} onClose={(importedMonth, invoiceId) => { setImportOpen(false); if (importedMonth) setMonth(importedMonth); if (invoiceId) setSelectedId(invoiceId) }} />}
    <ConfirmDialog isOpen={!!deleteId} title="Excluir fatura?" message="As compras desta fatura sairão do cartão e do extrato geral. Os lançamentos bancários serão preservados." confirmLabel="Excluir fatura" variant="danger" onCancel={() => setDeleteId(null)} onConfirm={() => {
      if (!deleteId || pending) return
      const id = deleteId
      setDeleteId(null)
      startTransition(async () => {
        try { await deleteCardInvoice(id); setSelectedId(''); toast.success('Fatura excluída.') }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao excluir.') }
      })
    }} />
  </div>
}
