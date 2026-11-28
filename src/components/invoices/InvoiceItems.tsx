'use client'

import ReimbursementBadge from '@/components/ui/ReimbursementBadge'
import { reimbursementFor } from '@/lib/reimbursements'
import type { Reimbursement } from '@/types/reimbursements'
import ExpenseCategorySelect from '@/components/ui/ExpenseCategorySelect'
import type { ExpenseCategoryOption } from '@/types/database'
import { isInvoicePayment } from '@/lib/statements'
import { useState, useTransition } from 'react'
import DateListControls from '@/components/ui/DateListControls'
import MonthPicker from '@/components/ui/MonthPicker'
import { currentMonth } from '@/lib/months'
import { categoryKey } from '@/lib/categoryAnalytics'
import { periodRange, matchesListSearch, sortDateItems, groupDateItems, paginateItems, type PeriodPreset, type GroupByMode, type ListOrder } from '@/lib/dateList'
import { toast } from 'sonner'
import { updateInvoiceCategory } from '@/app/actions/invoices'
import type { CardInvoiceItem } from '@/types/invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from './invoices.module.css'

interface InvoiceItemsProps { items: CardInvoiceItem[]; categories: ExpenseCategoryOption[]; reimbursements?: Reimbursement[]; invoiceLabels?: Record<string, string> }

export default function InvoiceItems({ items, categories, reimbursements = [], invoiceLabels = {} }: InvoiceItemsProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [period, setPeriod] = useState<PeriodPreset>('all')
  const [purchaseMonth, setPurchaseMonth] = useState(currentMonth)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [group, setGroup] = useState<GroupByMode>('day')
  const [order, setOrder] = useState<ListOrder>('date_desc')
  const [pagination, setPagination] = useState({ signature: '', page: 0 })
  const [pending, startTransition] = useTransition()
  const itemCategory = (item: CardInvoiceItem) => categoryKey({ ...item, amount: item.amount_cents / 100 }, categories)
  const categoryOptions = [...new Map(items.map(item => { const category = itemCategory(item); return [category.key, category] })).values()].filter(category => !isInvoicePayment(category.name))
  const range = periodRange(period, purchaseMonth, start, end)
  const filtered = sortDateItems(items.filter(item => item.date >= range.start && item.date <= range.end && (category === 'all' || itemCategory(item).key === category) && matchesListSearch(search, item.description, itemCategory(item).name, item.card_last_four, invoiceLabels[item.invoice_id])), order, item => item.amount_cents)
  const signature = JSON.stringify([search, category, period, purchaseMonth, start, end, group, order, filtered.map(item => item.id)])
  const visible = paginateItems(filtered, signature === pagination.signature ? pagination.page : 0)
  const { page, pageCount } = visible
  const setPage = (page: number) => setPagination({ signature, page })
  const sections = groupDateItems(visible.items, group, order)
  const total = filtered.reduce((sum, item) => sum + item.amount_cents, 0)
  const visibleTotal = visible.items.reduce((sum, item) => sum + item.amount_cents, 0)
  return <section className={styles.stack}>
    <h3>Compras e encargos · {filtered.length} de {items.length} itens</h3>
    <DateListControls search={search} onSearch={setSearch} period={period} onPeriod={setPeriod} start={start} end={end} onStart={setStart} onEnd={setEnd} group={group} onGroup={setGroup} order={order} onOrder={setOrder} dateLabel="Data da compra" onClear={() => { setSearch(''); setCategory('all'); setPeriod('all'); setStart(''); setEnd(''); setOrder('date_desc') }}>
      <label className="label">Categoria<select className="input" value={category} onChange={event => setCategory(event.target.value)}><option value="all">Todas as categorias</option>{categoryOptions.map(category => <option key={category.key} value={category.key}>{category.name}</option>)}</select></label>
    </DateListControls>
    {period === 'month' && <MonthPicker label="Mês da compra" value={purchaseMonth} months={items.map(item => item.date.slice(0, 7))} onChange={setPurchaseMonth} />}
    <p className={styles.muted}>Total dos itens filtrados: <strong>{formatCurrency(total / 100)}</strong> · Esta página: <strong>{formatCurrency(visibleTotal / 100)}</strong>. Os filtros e grupos usam a data original da compra; a referência da fatura permanece selecionada acima.</p>
    {!filtered.length && <p role="status" className={styles.notice}>Nenhuma compra corresponde aos filtros.</p>}
    <p className={styles.muted}>Cada parcela aparece pelo valor lançado nesta fatura. O total da compra parcelada não é lançado novamente.</p>
    {sections.map(section => <section key={section.key} className={styles.stack}>
      <div className="tx-group-header"><div className="tx-group-title">{section.title}<span className="tx-group-count">{section.items.length} itens nesta página</span></div><div className="tx-group-subtotal">Subtotal visível: {formatCurrency(section.items.reduce((sum, item) => sum + item.amount_cents, 0) / 100)}</div></div>
      {section.items.map(item => <article key={item.id} className={styles.item}>
      <div className={styles.between}><strong>{item.description}</strong><strong>{formatCurrency(item.amount_cents / 100)}</strong></div>
      <p className={styles.muted}>{formatDate(item.date)} · {invoiceLabels[item.invoice_id] ? `${invoiceLabels[item.invoice_id]} · ` : ''}final {item.card_last_four}{item.installment ? ` · parcela ${item.installment}/${item.installments}` : ''}{item.amount_cents < 0 ? ' · estorno/crédito' : ''}</p>
      <ReimbursementBadge record={reimbursementFor(reimbursements, 'card', item.id)} />
      <form className={styles.row} onSubmit={event => {
        event.preventDefault()
        const category = String(new FormData(event.currentTarget).get('category_id') ?? '')
        startTransition(async () => {
          try { await updateInvoiceCategory(item.id, category); toast.success('Categoria atualizada.') }
          catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao atualizar.') }
        })
      }}>
        <div className={styles.grow}><label className="label" htmlFor={`category-${item.id}`}>Categoria</label><ExpenseCategorySelect id={`category-${item.id}`} categories={categories.filter(category => !isInvoicePayment(category.name))} defaultValue={item.category_id ?? ''} disabled={pending} showManageLink={false} /></div>
        <button type="submit" className="btn-ghost" disabled={pending}>Salvar categoria</button>
      </form>
    </article>)}
    </section>)}
    {pageCount > 1 && <div className={styles.row}>
      <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
      <span>Página {page + 1} de {pageCount}</span>
      <button className="btn-ghost" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Próxima</button>
    </div>}
  </section>
}
