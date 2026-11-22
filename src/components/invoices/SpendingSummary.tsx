import { summarizeSpending } from '@/lib/spending'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types/database'
import type { InvoiceData } from '@/types/invoices'
import styles from './invoices.module.css'

interface SpendingSummaryProps {
  transactions: Transaction[]
  data: InvoiceData
  start: string
  end: string
}

export default function SpendingSummary({ transactions, data, start, end }: SpendingSummaryProps) {
  const summary = summarizeSpending(transactions, data.items, data.payments, start, end)
  const unlinked = data.invoices.filter(invoice => !data.payments.some(payment => payment.invoice_id === invoice.id)).length
  return (
    <section className={`glass-card ${styles.panel}`} aria-label="Consumo por categoria">
      <h2 className={styles.title}>Consumo por categoria</h2>
      <p className={styles.muted}>Gastos da conta e do cartão, sem repetir os pagamentos conciliados das faturas.</p>
      <dl className={styles.stats}>
        <div><dt>Despesas diretas</dt><dd>{formatCurrency(summary.directCents / 100)}</dd></div>
        <div><dt>Itens do cartão</dt><dd>{formatCurrency(summary.cardCents / 100)}</dd></div>
        <div><dt>{unlinked > 0 || summary.unlinkedPossiblePayments > 0 ? 'Total provisório' : 'Total no período'}</dt><dd>{formatCurrency(summary.totalCents / 100)}</dd></div>
      </dl>
      {!data.available && <p role="status" className={styles.notice}>Importação de faturas ainda não ativada neste ambiente.</p>}
      {(unlinked > 0 || summary.unlinkedPossiblePayments > 0) && (
        <p role="status" className={styles.notice}>Conciliação pendente: {unlinked} fatura(s) sem vínculo e {summary.unlinkedPossiblePayments} possível(is) pagamento(s) no período. O total é provisório até a revisão dos vínculos.</p>
      )}
      <details className={styles.muted}>
        <summary>Como este total é calculado</summary>
        <p>Compras seguem a data informada no PDF; em parcelas, ela pode ser a da compra original. Só faturas importadas têm detalhamento. Pagamentos sem vínculo continuam nas despesas diretas e podem sobrepor compras até serem conciliados. O fluxo de caixa usa a data do pagamento e é um indicador separado.</p>
      </details>
      <ul className={styles.categoryList}>
        {summary.categories.map(row => <li key={row.category}><span>{row.category}</span><strong>{formatCurrency(row.amountCents / 100)}</strong></li>)}
      </ul>
      {summary.categories.length === 0 && <p className={styles.muted}>Nenhum gasto no período selecionado.</p>}
    </section>
  )
}
