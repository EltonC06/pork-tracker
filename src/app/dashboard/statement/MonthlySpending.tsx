import Link from 'next/link'
import { statementSummary, type StatementEntry } from '@/lib/statements'
import { formatCurrency } from '@/lib/utils'
import type { ExpenseCategoryOption } from '@/types/database'
import styles from './statement.module.css'

interface MonthlySpendingProps {
  entries: StatementEntry[]
  categories: ExpenseCategoryOption[]
  month: string
  invoicesAvailable: boolean
}

export default function MonthlySpending({ entries, categories, month, invoicesAvailable }: MonthlySpendingProps) {
  const period = entries.filter(entry => entry.date.startsWith(month))
  const summary = statementSummary(period, categories)
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return <section className={`glass-card ${styles.spending}`} aria-labelledby="monthly-spending-title">
    <div className={styles.heading}>
      <div>
        <h2 id="monthly-spending-title">Gasto do mês</h2>
        <p>{monthLabel} · Real brasileiro (BRL)</p>
      </div>
      <Link href="/dashboard/planning" className={styles.link}>Projeções e PDF</Link>
    </div>
    <strong className={styles.amount}>{formatCurrency(summary.totalCents / 100)}</strong>
    {!invoicesAvailable && <p role="status">Total parcial: as faturas estão indisponíveis. Inclui somente movimentações.</p>}
    <dl className={styles.breakdown}>
      <div><dt>Movimentações</dt><dd>{formatCurrency(summary.bankCents / 100)}</dd></div>
      <div><dt>Compras nas faturas</dt><dd>{formatCurrency(summary.cardCents / 100)}</dd></div>
      <div><dt>Receitas registradas</dt><dd>{formatCurrency(summary.incomeCents / 100)}</dd></div>
    </dl>
    <p>Movimentações pela data do lançamento + compras pelo mês de referência da fatura importada. Pagamentos de fatura e transferências próprias identificadas ficam fora; estornos reduzem o gasto.</p>
    <p>O total considera todas as categorias do mês, mesmo com filtros na lista. Marcar um gasto como reembolsado não altera seu valor; recebimentos registrados continuam como receita.</p>
    <p>Para identificar uma transferência própria, edite sua descrição em Movimentações, por exemplo: “Transferência entre minhas contas”. Pix e transferências genéricas continuam no cálculo.</p>
    <Link href="/dashboard/transactions" className={styles.link}>Ver Pix, débito e demais movimentações</Link>
  </section>
}
