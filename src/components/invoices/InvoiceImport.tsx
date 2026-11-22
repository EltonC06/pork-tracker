'use client'

import ExpenseCategorySelect from '@/components/ui/ExpenseCategorySelect'
import type { ExpenseCategoryOption } from '@/types/database'
import { isInvoicePayment, suggestedStatementMonth } from '@/lib/statements'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import FormModal from '@/components/ui/FormModal'
import { parseInterInvoice, type InterInvoice } from '@/lib/interInvoice'
import { extractInvoicePdf } from '@/lib/invoicePdf'
import { importCardInvoice } from '@/app/actions/invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from './invoices.module.css'

interface InvoiceImportProps { onClose: (month?: string, invoiceId?: string) => void; categories: ExpenseCategoryOption[] }

export default function InvoiceImport({ onClose, categories }: InvoiceImportProps) {
  const [pending, startTransition] = useTransition()
  const [invoice, setInvoice] = useState<InterInvoice | null>(null)
  const [month, setMonth] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const purchaseCategories = categories.filter(category => !isInvoicePayment(category.name))
  const [label, setLabel] = useState('Inter')
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState('')

  function readFile(file: File) {
    setInvoice(null); setReviewed(false); setError('')
    startTransition(async () => {
      try {
        if (!/\.pdf$/i.test(file.name) || file.size > 10 * 1024 * 1024) throw new Error('Selecione um PDF de até 10 MB.')
        const result = parseInterInvoice(await extractInvoicePdf(new Uint8Array(await file.arrayBuffer())))
        setInvoice(result)
        setMonth(suggestedStatementMonth(result.items, result.dueDate))
        setPage(0)
        setCategoryIds(result.items.map(item => {
          const name = /assinatura/i.test(item.category) ? 'Assinaturas' : item.category
          return purchaseCategories.find(category => category.active && category.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))?.id ?? ''
        }))
      } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao ler o PDF.') }
    })
  }

  function save() {
    if (!invoice || !reviewed || invoice.warnings.length) return
    startTransition(async () => {
      try {
        const result = await importCardInvoice({ ...invoice, cardLabel: label, statementMonth: month, items: invoice.items.map((item, i) => ({ ...item, categoryId: categoryIds[i] })) })
        toast.success(result.duplicate ? 'Esta fatura já foi importada. Nenhuma compra duplicada.' : 'Fatura importada no extrato do cartão.')
        onClose(result.statementMonth ?? month, result.id)
      } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao importar.') }
    })
  }

  return (
    <FormModal isOpen onClose={() => { if (!pending) onClose() }} title="Importar fatura Inter" maxWidth="760px">
      <div className={styles.importBody}>
        <p className={styles.muted}>Selecione o PDF exportado pelo Inter. A leitura acontece neste dispositivo; somente os lançamentos revisados são salvos. Pagamentos anteriores e previsões da próxima fatura ficam fora das compras.</p>
        <label className="label" htmlFor="invoice-pdf">Arquivo PDF (até 10 MB)</label>
        <input id="invoice-pdf" type="file" className="input" accept="application/pdf,.pdf" disabled={pending} onChange={event => {
          const file = event.target.files?.[0]
          if (file) readFile(file)
        }} />
        {pending && <p role="status">Processando fatura…</p>}
        {error && <p role="alert" className={styles.notice}>{error}</p>}
        {invoice && <>
          <dl className={styles.stats}>
            <div><dt>Vencimento</dt><dd>{formatDate(invoice.dueDate)}</dd></div>
            <div><dt>Total declarado</dt><dd>{formatCurrency(invoice.totalCents / 100)}</dd></div>
            <div><dt>Itens conferidos</dt><dd>{invoice.items.length}</dd></div>
          </dl>
          <label className="label" htmlFor="invoice-month">Mês de referência da fatura</label>
          <input id="invoice-month" className="input" type="month" required value={month} disabled={pending} onChange={event => { setMonth(event.target.value); setReviewed(false) }} />
          <p className={styles.muted}>Este é o mês usado nos filtros e gráficos. Sugerimos o mês com mais compras no PDF; ajuste se necessário.</p>
          <label className="label" htmlFor="card-label">Nome do cartão · final {invoice.cardLastFour}</label>
          <input id="card-label" className="input" value={label} maxLength={80} onChange={event => setLabel(event.target.value)} disabled={pending} />
          {invoice.previousPayments.length > 0 && <p className={styles.muted}>{invoice.previousPayments.length} pagamento(s) histórico(s) identificado(s) no PDF. Não são compras nem comprovam a quitação desta fatura.</p>}
          {invoice.warnings.map((warning, i) => <p className={styles.notice} role="alert" key={i}>{warning}</p>)}
          <div className={styles.itemList}>
            {invoice.items.slice(page * 10, page * 10 + 10).map((item, offset) => { const index = page * 10 + offset; return <div key={index} className={styles.item}>
              <div><strong>{item.description}</strong><p className={styles.muted}>{formatDate(item.date)} · final {item.cardLastFour} · {formatCurrency(item.amountCents / 100)}{item.amountCents < 0 ? ' · estorno/crédito' : ''}</p></div>
              <label className="label" htmlFor={`import-category-${index}`}>Categoria sugerida</label>
              <ExpenseCategorySelect id={`import-category-${index}`} categories={purchaseCategories} value={categoryIds[index] ?? ''} disabled={pending} showManageLink={false} onChange={value => {
                setReviewed(false)
                setCategoryIds(current => current.map((id, i) => i === index ? value : id))
              }} />
            </div>})}
          </div>
          <div className={styles.row}>
            <button className="btn-ghost" disabled={pending || page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
            <span>Itens {page * 10 + 1}–{Math.min((page + 1) * 10, invoice.items.length)} de {invoice.items.length}</span>
            <button className="btn-ghost" disabled={pending || (page + 1) * 10 >= invoice.items.length} onClick={() => setPage(page + 1)}>Próxima</button>
          </div>
          <div className={styles.reviewFooter}>
          <label className={styles.check}><input type="checkbox" checked={reviewed} disabled={pending || invoice.warnings.length > 0} onChange={event => setReviewed(event.target.checked)} />Conferi o mês, o vencimento, os lançamentos e o total.</label>
          <button className="btn-primary" type="button" disabled={pending || !reviewed || !label.trim() || !month || invoice.warnings.length > 0} onClick={save}>Importar {invoice.items.length} itens</button>
          </div>
        </>}
      </div>
    </FormModal>
  )
}
