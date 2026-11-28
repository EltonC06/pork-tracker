'use client'

import ReimbursementBadge from '@/components/ui/ReimbursementBadge'
import { reimbursementFor } from '@/lib/reimbursements'
import type { Reimbursement } from '@/types/reimbursements'
import { isInvoicePaymentTransaction } from '@/lib/invoicePayments'
import { useState } from 'react'
import Link from 'next/link'
import MonthPicker from '@/components/ui/MonthPicker'
import StatementTabs from '@/components/invoices/StatementTabs'
import StatementAnalysis from '@/components/invoices/StatementAnalysis'
import StatementViewSwitch from '@/components/invoices/StatementViewSwitch'
import { buildStatement, isOwnAccountTransfer } from '@/lib/statements'
import { currentMonth } from '@/lib/months'
import MonthlySpending from './MonthlySpending'
import { categoryKey } from '@/lib/categoryAnalytics'
import type { ExpenseCategoryOption, Transaction } from '@/types/database'
import type { InvoiceData } from '@/types/invoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from '@/components/invoices/invoices.module.css'

interface StatementClientProps { data: InvoiceData; transactions: Transaction[]; categories: ExpenseCategoryOption[]; reimbursements?: Reimbursement[] }

export default function StatementClient({ data, transactions, categories, reimbursements = [] }: StatementClientProps) {
  const entries = buildStatement('general', transactions, data.invoices, data.items, categories)
  const [month, setMonth] = useState(currentMonth)
  const excluded = transactions.filter(tx => tx.date.startsWith(month) && isInvoicePaymentTransaction(tx, categories))
  const transfers = transactions.filter(tx => tx.date.startsWith(month) && isOwnAccountTransfer(tx))
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [analysis, setAnalysis] = useState(false)
  const categoryOptions = [...new Map(entries.filter(entry => entry.type === 'expense').map(entry => { const row = categoryKey(entry, categories); return [row.key, row] })).values()].sort((a, b) => a.name.localeCompare(b.name))
  const filtered = entries.filter(entry => entry.date.startsWith(month) && (!category || categoryKey(entry, categories).key === category) && entry.description.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  return <div className={styles.stack}>
    <header><h1 className={styles.heading}>Extrato</h1><p className={styles.muted}>Gastos, movimentações e faturas em um só lugar.</p></header>
    <StatementTabs active="general" />
    <section className={`glass-card ${styles.panel} ${styles.row}`}>
      <div className={styles.grow}><MonthPicker label="Extrato geral" value={month} months={entries.map(entry => entry.date.slice(0, 7))} onChange={value => { setMonth(value); setPage(0) }} /></div>
      <div className={styles.grow}><label htmlFor="statement-category">Categoria</label><select id="statement-category" className="input" value={category} onChange={event => { setCategory(event.target.value); setPage(0) }}><option value="">Todas as categorias</option>{categoryOptions.map(row => <option key={row.key} value={row.key}>{row.name}</option>)}</select></div>
    </section>
    <MonthlySpending entries={entries} categories={categories} month={month} invoicesAvailable={data.available} />
    <p className={styles.muted}>O banco usa a data do lançamento. As compras do cartão usam o mês de referência da fatura. Somente faturas importadas entram no total.</p>
    {excluded.length > 0 && <details className={`glass-card ${styles.panel}`}>
      <summary className={styles.link}>Pagamentos de fatura fora do geral · {excluded.length} · {formatCurrency(excluded.reduce((sum, tx) => sum + Math.round(Number(tx.amount) * 100), 0) / 100)}</summary>
      <p className={styles.muted}>Identificados pela categoria de fatura ou descrição explícita. Continuam no banco, sem repetir as compras do cartão aqui.</p>
      <ul className={styles.categoryList}>{excluded.map(tx => <li key={tx.id}><span>{formatDate(tx.date)} · {tx.description}</span><strong>{formatCurrency(Number(tx.amount))}</strong></li>)}</ul>
    </details>}
    {transfers.length > 0 && <details className={`glass-card ${styles.panel}`}>
      <summary className={styles.link}>Transferências próprias fora do geral · {transfers.length}</summary>
      <p className={styles.muted}>Somente descrições explícitas de contas próprias ou mesma titularidade são reconhecidas. Os lançamentos permanecem em Movimentações.</p>
      <ul className={styles.categoryList}>{transfers.map(tx => <li key={tx.id}><span>{formatDate(tx.date)} · {tx.description}</span><strong>{formatCurrency(Number(tx.amount))}</strong></li>)}</ul>
    </details>}
    <StatementViewSwitch analysis={analysis} onChange={setAnalysis} />
    <StatementAnalysis entries={entries} categories={categories} month={month} category={category} showDetails={analysis} />
    {!analysis && <section className={`glass-card ${styles.panel} ${styles.stack}`}>
      <h2 className={styles.title}>Lançamentos · {filtered.length}</h2>
      <label className="label" htmlFor="statement-search">Buscar descrição</label><input id="statement-search" className="input" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} />
      <p className={styles.muted}>A busca filtra a lista. Os gráficos seguem o mês e a categoria selecionados.</p>
      {filtered.slice(page * 20, page * 20 + 20).map(entry => <article key={entry.id} className={styles.item}>
        <div className={styles.between}><strong>{entry.description}</strong><strong>{entry.type === 'income' || entry.amount < 0 ? '+ ' : '− '}{formatCurrency(Math.abs(entry.amount))}</strong></div>
        <p className={styles.muted}>{formatDate(entry.originalDate)} · {entry.source === 'card' ? 'Cartão' : 'Banco'} · {entry.type === 'income' ? 'Receita' : categoryKey(entry, categories).name}</p>
        <ReimbursementBadge record={reimbursementFor(reimbursements, entry.source, entry.id.slice(5))} />
        <Link className={styles.link} href={entry.source === 'card' ? `/dashboard/invoices?month=${entry.date.slice(0, 7)}&invoice=${entry.invoiceId}` : '/dashboard/transactions'}>{entry.source === 'card' ? 'Ver fatura' : 'Editar no banco'}</Link>
      </article>)}
      {!filtered.length && <p className={styles.muted}>Nenhum lançamento para os filtros selecionados.</p>}
      {filtered.length > 20 && <div className={styles.row}><button className="btn-ghost" disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1} de {Math.ceil(filtered.length / 20)}</span><button className="btn-ghost" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Próxima</button></div>}
    </section>}
  </div>
}
