'use client'

import ReimbursementBadge from '@/components/ui/ReimbursementBadge'
import { reimbursementFor } from '@/lib/reimbursements'
import type { Reimbursement } from '@/types/reimbursements'
import ExpenseCategorySelect from '@/components/ui/ExpenseCategorySelect'
import type { ExpenseCategoryOption } from '@/types/database'
import { isInvoicePayment } from '@/lib/statements'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateInvoiceCategory } from '@/app/actions/invoices'
import type { CardInvoiceItem } from '@/types/invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from './invoices.module.css'

interface InvoiceItemsProps { items: CardInvoiceItem[]; categories: ExpenseCategoryOption[]; reimbursements?: Reimbursement[] }

export default function InvoiceItems({ items, categories, reimbursements = [] }: InvoiceItemsProps) {
  const [page, setPage] = useState(0)
  const [pending, startTransition] = useTransition()
  const pageCount = Math.ceil(items.length / 20)
  return <section className={styles.stack}>
    <h3>Compras e encargos · {items.length} itens</h3>
    <p className={styles.muted}>Cada parcela aparece pelo valor lançado nesta fatura. O total da compra parcelada não é lançado novamente.</p>
    {items.slice(page * 20, page * 20 + 20).map(item => <article key={item.id} className={styles.item}>
      <div className={styles.between}><strong>{item.description}</strong><strong>{formatCurrency(item.amount_cents / 100)}</strong></div>
      <p className={styles.muted}>{formatDate(item.date)} · final {item.card_last_four}{item.installment ? ` · parcela ${item.installment}/${item.installments}` : ''}{item.amount_cents < 0 ? ' · estorno/crédito' : ''}</p>
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
    {pageCount > 1 && <div className={styles.row}>
      <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
      <span>Página {page + 1} de {pageCount}</span>
      <button className="btn-ghost" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Próxima</button>
    </div>}
  </section>
}
