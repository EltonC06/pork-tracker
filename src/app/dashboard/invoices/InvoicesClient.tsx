'use client'

import type { Reimbursement } from '@/types/reimbursements'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { deleteCardInvoice } from '@/app/actions/invoices'
import MonthPicker from '@/components/ui/MonthPicker'
import InvoiceImport from '@/components/invoices/InvoiceImport'
import InvoiceMonthEditor from '@/components/invoices/InvoiceMonthEditor'
import InvoiceItems from '@/components/invoices/InvoiceItems'
import StatementTabs from '@/components/invoices/StatementTabs'
import StatementAnalysis from '@/components/invoices/StatementAnalysis'
import StatementViewSwitch from '@/components/invoices/StatementViewSwitch'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { buildStatement } from '@/lib/statements'
import { formatCurrency, formatDate } from '@/lib/utils'
import { invoiceCardKey, selectInvoices } from '@/lib/invoiceList'
import { monthLabel } from '@/lib/dateList'
import type { InvoiceData } from '@/types/invoices'
import type { ExpenseCategoryOption } from '@/types/database'
import styles from '@/components/invoices/invoices.module.css'

interface InvoicesClientProps { data: InvoiceData; categories: ExpenseCategoryOption[]; initialMonth?: string; initialInvoice?: string; reimbursements?: Reimbursement[] }

export default function InvoicesClient({ data, categories, initialMonth, initialInvoice, reimbursements = [] }: InvoicesClientProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [analysis, setAnalysis] = useState(false)
  const initialSelected = data.invoices.find(invoice => invoice.id === initialInvoice)
  const [selectedId, setSelectedId] = useState(initialSelected?.id ?? '')
  const [selectedCard, setSelectedCard] = useState(initialSelected ? invoiceCardKey(initialSelected) : '')
  const invoices = [...data.invoices].sort((a, b) => b.statement_month.localeCompare(a.statement_month) || b.due_date.localeCompare(a.due_date))
  const [month, setMonth] = useState(initialMonth ?? initialSelected?.statement_month.slice(0, 7) ?? invoices[0]?.statement_month.slice(0, 7) ?? new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7))
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const cards = [...new Map(invoices.map(invoice => [invoiceCardKey(invoice), invoice])).entries()]
  const monthlyInvoices = selectInvoices(invoices, month, selectedCard)
  const shown = selectInvoices(invoices, month, selectedCard, selectedId)
  const analysisInvoices = invoices.filter(invoice => !selectedCard || invoiceCardKey(invoice) === selectedCard)
  const entries = buildStatement('card', [], analysisInvoices, data.items, categories)
  const shownIds = new Set(shown.map(invoice => invoice.id))
  const shownItems = data.items.filter(item => shownIds.has(item.invoice_id))
  const invoiceLabels = Object.fromEntries(shown.map(invoice => [invoice.id, `${invoice.card_label} · referência ${monthLabel(invoice.statement_month)}`]))
  return <div className={styles.stack}>
    <header className={styles.between}>
      <div><h1 className={styles.heading}>Faturas</h1><p className={styles.muted}>Compras e categorias das faturas, organizadas pelo mês de referência.</p></div>
      <button className="btn-primary" disabled={!data.available} onClick={() => setImportOpen(true)}>Importar PDF Inter</button>
    </header>
    <StatementTabs active="card" />
    {!data.available && <p role="status" className={styles.notice}>Aplique a nova migração de extratos no Supabase para ativar esta tela.</p>}
    <section className={`glass-card ${styles.panel} ${styles.row}`}>
      <div className={styles.grow}><MonthPicker label="Mês de referência da fatura" value={month} months={invoices.map(invoice => invoice.statement_month.slice(0, 7))} onChange={value => { setMonth(value); setSelectedId('') }} /></div>
      <div className={styles.grow}><label htmlFor="invoice-select">Fatura</label><select id="invoice-select" className="input" value={selectedId} onChange={event => setSelectedId(event.target.value)}>
        <option value="">Todas as faturas do mês ({monthlyInvoices.length})</option>
        {monthlyInvoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.card_label} · final {invoice.card_last_four} · {formatCurrency(invoice.total_cents / 100)}</option>)}
      </select></div>
    </section>
    <div className="filter-chip-group" role="group" aria-label="Selecionar cartão">
      <button className={`filter-chip ${!selectedCard && !selectedId ? 'active' : ''}`} aria-pressed={!selectedCard && !selectedId} onClick={() => { setSelectedCard(''); setSelectedId('') }}>Todas as faturas</button>
      {cards.map(([key, invoice]) => <button key={key} className={`filter-chip ${selectedCard === key ? 'active' : ''}`} aria-pressed={selectedCard === key} onClick={() => { setSelectedCard(key); setSelectedId('') }}>{invoice.card_label} · final {invoice.card_last_four}</button>)}
    </div>
    <p className={styles.muted}>Referência: <strong>{monthLabel(month)}</strong>. Define quais faturas entram na lista. Busca, período e agrupamento das compras abaixo usam a data original da compra, que pode pertencer a outro mês.</p>
    <StatementViewSwitch analysis={analysis} onChange={setAnalysis} />
    {analysis && <><p className={styles.muted}>Análise por mês de referência de todas as faturas do cartão selecionado. Os filtros de compras e a seleção de fatura individual não se aplicam a esta análise.</p><StatementAnalysis entries={entries} categories={categories} month={month} showDetails cardOnly /></>}
    {!shown.length && <p className={styles.notice}>Nenhuma fatura neste mês. Importe o PDF ou selecione outro mês.</p>}
    {!analysis && shown.map(invoice => <section key={invoice.id} className={`glass-card ${styles.panel} ${styles.stack}`}>
      <div className={styles.between}><h2 className={styles.title}>{invoice.card_label} · final {invoice.card_last_four}</h2><strong>{formatCurrency(invoice.total_cents / 100)}</strong></div>
      <p className={styles.muted}>Vencimento: {formatDate(invoice.due_date)} · referência: {monthLabel(invoice.statement_month)}</p>
      <InvoiceMonthEditor key={invoice.id + invoice.statement_month} invoice={invoice} onSaved={value => { setMonth(value); setSelectedId(invoice.id) }} />
      <button className="btn-danger" disabled={pending} onClick={() => setDeleteId(invoice.id)}>Excluir esta fatura</button>
    </section>)}
    {!analysis && shown.length > 0 && <InvoiceItems key={month + selectedCard + selectedId} items={shownItems} categories={categories} reimbursements={reimbursements} invoiceLabels={invoiceLabels} />}
    {importOpen && <InvoiceImport categories={categories} onClose={(importedMonth, invoiceId) => { setImportOpen(false); if (importedMonth) setMonth(importedMonth); if (invoiceId) { setSelectedCard(''); setSelectedId(invoiceId) } }} />}
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
