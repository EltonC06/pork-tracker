import Link from 'next/link'
import { buildStatement, statementSummary } from '@/lib/statements'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types/database'
import type { InvoiceData } from '@/types/invoices'
import styles from './invoices.module.css'

interface SpendingSummaryProps { transactions: Transaction[]; data: InvoiceData; start: string; end: string }

export default function SpendingSummary({ transactions, data, start, end }: SpendingSummaryProps) {
  const entries = buildStatement('general', transactions, data.invoices, data.items).filter(entry => entry.date >= start && entry.date <= end)
  const summary = statementSummary(entries, [])
  return <section className={`glass-card ${styles.panel}`} aria-label="Despesas do extrato geral">
    <h2 className={styles.title}>Despesas do extrato geral</h2>
    <p className={styles.muted}>Banco + cartão. A categoria “Pagamento de fatura” não entra neste total.</p>
    <dl className={styles.stats}>
      <div><dt>Banco sem faturas</dt><dd>{formatCurrency(summary.bankCents / 100)}</dd></div>
      <div><dt>Compras do cartão</dt><dd>{formatCurrency(summary.cardCents / 100)}</dd></div>
      <div><dt>Total no período</dt><dd>{formatCurrency(summary.totalCents / 100)}</dd></div>
    </dl>
    {!data.available && <p className={styles.notice}>Faturas indisponíveis até aplicar a nova migração; total somente do banco.</p>}
    <Link href="/dashboard/statement" className={styles.link}>Abrir extrato geral e gráficos por categoria</Link>
  </section>
}
