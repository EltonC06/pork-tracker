'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatementTabs from '@/components/invoices/StatementTabs'
import StatementAnalysis from '@/components/invoices/StatementAnalysis'
import StatementViewSwitch from '@/components/invoices/StatementViewSwitch'
import { buildStatement } from '@/lib/statements'
import { categoryKey } from '@/lib/categoryAnalytics'
import type { ExpenseCategoryOption, Transaction } from '@/types/database'
import type { InvoiceData } from '@/types/invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from '@/components/invoices/invoices.module.css'

export default function StatementClient({ data, transactions, categories }: { data: InvoiceData; transactions: Transaction[]; categories: ExpenseCategoryOption[] }) {
  const entries = buildStatement('general', transactions, data.invoices, data.items, categories)
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7))
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [analysis, setAnalysis] = useState(false)
  const categoryOptions = [...new Map(entries.filter(entry => entry.type === 'expense').map(entry => { const row = categoryKey(entry, categories); return [row.key, row] })).values()].sort((a, b) => a.name.localeCompare(b.name))
  const filtered = entries.filter(entry => entry.date.startsWith(month) && (!category || categoryKey(entry, categories).key === category) && entry.description.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  return <div className={styles.stack}>
    <header><h1 className={styles.heading}>Extrato geral</h1><p className={styles.muted}>Banco + compras das faturas. A categoria “Pagamento de fatura” fica fora desta visão.</p></header>
    <StatementTabs active="general" />
    {!data.available && <p role="status" className={styles.notice}>Faturas indisponíveis até aplicar a nova migração. Por enquanto, esta visão mostra somente o banco.</p>}
    <section className={`glass-card ${styles.panel} ${styles.row}`}>
      <label className={styles.grow}>Mês<input aria-label="Mês do extrato geral" className="input" type="month" value={month} onChange={event => { if (event.target.value) { setMonth(event.target.value); setPage(0) } }} /></label>
      <div className={styles.grow}><label htmlFor="statement-category">Categoria</label><select id="statement-category" className="input" value={category} onChange={event => { setCategory(event.target.value); setPage(0) }}><option value="">Todas as categorias</option>{categoryOptions.map(row => <option key={row.key} value={row.key}>{row.name}</option>)}</select></div>
    </section>
    <p className={styles.muted}>O banco usa a data do lançamento. As compras do cartão usam o mês de referência da fatura. Somente faturas importadas entram no total.</p>
    <StatementViewSwitch analysis={analysis} onChange={setAnalysis} />
    <StatementAnalysis entries={entries} categories={categories} month={month} category={category} showDetails={analysis} />
    {!analysis && <section className={`glass-card ${styles.panel} ${styles.stack}`}>
      <h2 className={styles.title}>Lançamentos · {filtered.length}</h2>
      <label className="label" htmlFor="statement-search">Buscar descrição</label><input id="statement-search" className="input" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
      <p className={styles.muted}>A busca filtra a lista. Os gráficos seguem o mês e a categoria selecionados.</p>
      {filtered.slice(page * 20, page * 20 + 20).map(entry => <article key={entry.id} className={styles.item}>
        <div className={styles.between}><strong>{entry.description}</strong><strong>{entry.type === 'income' || entry.amount < 0 ? '+ ' : '− '}{formatCurrency(Math.abs(entry.amount))}</strong></div>
        <p className={styles.muted}>{formatDate(entry.originalDate)} · {entry.source === 'card' ? 'Cartão' : 'Banco'} · {entry.type === 'income' ? 'Receita' : categoryKey(entry, categories).name}</p>
        <Link className={styles.link} href={entry.source === 'card' ? `/dashboard/invoices?month=${entry.date.slice(0, 7)}&invoice=${entry.invoiceId}` : '/dashboard/transactions'}>{entry.source === 'card' ? 'Ver fatura' : 'Editar no banco'}</Link>
      </article>)}
      {!filtered.length && <p className={styles.muted}>Nenhum lançamento para os filtros selecionados.</p>}
      {filtered.length > 20 && <div className={styles.row}><button className="btn-ghost" disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1} de {Math.ceil(filtered.length / 20)}</span><button className="btn-ghost" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Próxima</button></div>}
    </section>}
  </div>
}
