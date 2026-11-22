'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateInvoiceCategory } from '@/app/actions/invoices'
import type { CardInvoiceItem } from '@/types/invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from './invoices.module.css'

interface InvoiceItemsProps { items: CardInvoiceItem[] }

export default function InvoiceItems({ items }: InvoiceItemsProps) {
  const [page, setPage] = useState(0)
  const [pending, startTransition] = useTransition()
  const pageCount = Math.ceil(items.length / 20)
  const categories = new Map<string, number>()
  for (const item of items) categories.set(item.category || 'Sem categoria', (categories.get(item.category || 'Sem categoria') ?? 0) + item.amount_cents)
  return <section className={styles.stack}>
    <h3>Categorias desta fatura</h3>
    <ul className={styles.categoryList}>
      {[...categories].sort((a, b) => b[1] - a[1]).map(([category, amount]) => <li key={category}><span>{category}</span><strong>{formatCurrency(amount / 100)}</strong></li>)}
    </ul>
    <h3>Compras e encargos · {items.length} itens</h3>
    <p className={styles.muted}>Cada parcela aparece pelo valor lançado nesta fatura. O total da compra parcelada não é lançado novamente.</p>
    {items.slice(page * 20, page * 20 + 20).map(item => <article key={item.id} className={styles.item}>
      <div className={styles.between}><strong>{item.description}</strong><strong>{formatCurrency(item.amount_cents / 100)}</strong></div>
      <p className={styles.muted}>{formatDate(item.date)} · final {item.card_last_four}{item.installment ? ` · parcela ${item.installment}/${item.installments}` : ''}{item.amount_cents < 0 ? ' · estorno/crédito' : ''}</p>
      <form className={styles.row} onSubmit={event => {
        event.preventDefault()
        const category = String(new FormData(event.currentTarget).get('category') ?? '')
        startTransition(async () => {
          try { await updateInvoiceCategory(item.id, category); toast.success('Categoria atualizada.') }
          catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao atualizar.') }
        })
      }}>
        <label className={styles.grow}>Categoria<input name="category" className="input" defaultValue={item.category} maxLength={100} disabled={pending} /></label>
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
