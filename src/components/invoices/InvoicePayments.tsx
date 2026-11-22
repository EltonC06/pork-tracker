'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { linkInvoicePayment, unlinkInvoicePayment } from '@/app/actions/invoices'
import type { CardInvoice, InvoicePayment } from '@/types/invoices'
import type { AccountType, Transaction } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import styles from './invoices.module.css'

interface InvoicePaymentsProps {
  invoice: CardInvoice
  payments: InvoicePayment[]
  transactions: Transaction[]
  accounts: AccountType[]
}

export default function InvoicePayments({ invoice, payments, transactions, accounts }: InvoicePaymentsProps) {
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [amount, setAmount] = useState('')
  const links = payments.filter(payment => payment.invoice_id === invoice.id)
  const paid = links.reduce((sum, payment) => sum + payment.amount_cents, 0)
  const remaining = invoice.total_cents - paid
  const allocated = (id: string) => payments.filter(payment => payment.transaction_id === id).reduce((sum, payment) => sum + payment.amount_cents, 0)
  const candidates = transactions.filter(tx => tx.type === 'expense' && Math.round(Number(tx.amount) * 100) > allocated(tx.id) &&
    !links.some(link => link.transaction_id === tx.id) &&
    `${tx.description} ${tx.date} ${tx.amount} ${accounts.find(account => account.id === tx.account_type_id)?.name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const score = (tx: Transaction) => (Math.round(Number(tx.amount) * 100) === remaining ? 10 : 0) +
        (/fatura|cart[aã]o/i.test(tx.description ?? '') ? 5 : 0) - Math.abs(Date.parse(tx.date) - Date.parse(invoice.due_date)) / 86400000 / 100
      return score(b) - score(a)
    })

  function run(work: () => Promise<unknown>) {
    startTransition(async () => {
      try { await work(); setTransactionId(''); setAmount(''); toast.success('Conciliação atualizada.') }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao conciliar.') }
    })
  }

  return <section className={styles.stack}>
    <h3>Pagamento no extrato</h3>
    <dl className={styles.stats}>
      <div><dt>Vinculado</dt><dd>{formatCurrency(paid / 100)}</dd></div>
      <div><dt>Saldo a conciliar</dt><dd>{formatCurrency(remaining / 100)}</dd></div>
      <div><dt>Conciliação</dt><dd>{remaining === 0 ? 'Integral' : paid > 0 ? 'Parcial' : 'Não vinculada'}</dd></div>
    </dl>
    {links.map(link => {
      const tx = transactions.find(tx => tx.id === link.transaction_id)
      return <div key={link.id} className={styles.item}>
        <p>{tx ? `${formatDate(tx.date)} · ${tx.description || 'Pagamento'}` : 'Pagamento vinculado'} · {formatCurrency(link.amount_cents / 100)}</p>
        <button className="btn-ghost" disabled={pending} onClick={() => run(() => unlinkInvoicePayment(link.id))}>Desvincular pagamento</button>
      </div>
    })}
    {remaining > 0 && <form className={styles.stack} onSubmit={event => {
      event.preventDefault()
      run(() => linkInvoicePayment({ invoiceId: invoice.id, transactionId, amountCents: Math.round(Number(amount) * 100) }))
    }}>
      <p className={styles.muted}>Escolha a saída que pagou esta fatura. As sugestões usam valor, descrição e proximidade do vencimento; confira a conta e a data antes de vincular. Você pode vincular pagamentos parciais.</p>
      <label className="label" htmlFor="payment-search">Buscar no extrato (descrição, data, conta ou valor)</label>
      <input id="payment-search" type="search" className="input" value={search} onChange={event => { setSearch(event.target.value); setTransactionId(''); setAmount('') }} disabled={pending} />
      <label className="label" htmlFor="payment-transaction">Pagamento bancário</label>
      <select id="payment-transaction" className={`input ${styles.selector}`} required value={transactionId} disabled={pending} onChange={event => {
        setTransactionId(event.target.value)
        const tx = transactions.find(tx => tx.id === event.target.value)
        setAmount(tx ? (Math.min(remaining, Math.round(Number(tx.amount) * 100) - allocated(tx.id)) / 100).toFixed(2) : '')
      }}>
        <option value="">Selecione o pagamento</option>
        {candidates.map(tx => <option key={tx.id} value={tx.id}>{formatDate(tx.date)} · {accounts.find(account => account.id === tx.account_type_id)?.name ?? 'Sem conta'} · {formatCurrency(Number(tx.amount))} · {tx.description}</option>)}
      </select>
      {candidates.length === 0 && <p className={styles.notice}>Nenhuma saída disponível. Importe o extrato OFX ou registre o pagamento e volte para vincular. A fatura pode permanecer sem vínculo.</p>}
      <label className="label" htmlFor="payment-amount">Valor deste pagamento destinado à fatura (R$)</label>
      <input id="payment-amount" className="input" type="number" min="0.01" step="0.01" max={remaining / 100} value={amount} required disabled={pending} onChange={event => setAmount(event.target.value)} />
      <button type="submit" className="btn-primary" disabled={pending || !transactionId || !amount}>Confirmar vínculo do pagamento</button>
    </form>}
  </section>
}
