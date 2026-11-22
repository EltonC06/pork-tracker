import { suggestCategory } from './ofxParser'

export interface InvoiceItemInput {
  date: string
  description: string
  cardLastFour: string
  amountCents: number // Positive expense; negative refund. Payments are separate.
  category: string
  installment: number | null
  installments: number | null
}

export interface InterInvoice {
  dueDate: string
  cardLastFour: string
  totalCents: number
  items: InvoiceItemInput[]
  previousPayments: { date: string; amountCents: number }[]
  warnings: string[]
}

const months: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}

export function brlCents(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  const amount = Number(cleaned)
  if (!Number.isFinite(amount)) throw new Error('Valor inválido na fatura.')
  return Math.round(amount * 100)
}

export function validISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

function invoiceCategory(description: string): string {
  if (/iof|juros|multa|anuidade/i.test(description)) return 'Taxas e Impostos'
  if (/99food/i.test(description)) return 'Alimentação'
  if (/tembici|blablacar|uber|99\s*(?:ride|l2l)/i.test(description)) return 'Transporte'
  if (/openai|anthropic|aws|google/i.test(description)) return 'Tecnologia e Assinaturas'
  if (/wellhub/i.test(description)) return 'Saúde'
  return suggestCategory(description, '', 'expense')
}

/** Reads only the dated expense tables; never the offers, totals or next bill. */
export function parseInterInvoice(text: string): InterInvoice {
  const lines = text.normalize('NFKC').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const header = lines.slice(0, 55).join('\n')
  if (!/Total da sua fatura/i.test(header) || !/Despesas da fatura/i.test(text)) {
    throw new Error('PDF fora do modelo de fatura Inter suportado. Nenhum dado foi importado.')
  }
  const due = header.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  // The cover places credit limit and bill total at different baselines. Prefer the
  // explicit summary row, so the credit limit can never become the bill amount.
  const total = text.match(/^\s*Fatura atual\s+R\$\s*([\d.]+,\d{2})/im) ??
    (!/Limite de cr[ée]dito/i.test(header) ? header.match(/Total da sua fatura\s+R\$\s*([\d.]+,\d{2})/i) : null)
  const primaryCard = text.match(/^\s*\d{4}[*\uE000-\uF8FF]{4}(\d{4})\s+\d{2}\/\d{2}\/\d{4}/m) ??
    text.match(/CART[ÃA]O\s+\d{4}\*{4}(\d{4})/i)
  if (!due || !total || !primaryCard) throw new Error('Não foi possível identificar vencimento, total e cartão.')
  const dueDate = `${due[3]}-${due[2]}-${due[1]}`
  if (!validISODate(dueDate)) throw new Error('Vencimento inválido.')

  const result: InterInvoice = {
    dueDate, cardLastFour: primaryCard[1], totalCents: brlCents(total[1]),
    items: [], previousPayments: [], warnings: [],
  }
  let inExpenses = false
  let cardLastFour = ''
  let pending = ''
  for (const line of lines) {
    if (/^Despesas da fatura$/i.test(line)) { inExpenses = true; continue }
    if (/Pr[óo]xima fatura/i.test(line)) { inExpenses = false; continue }
    if (!inExpenses) continue
    const card = line.match(/^CART[ÃA]O\s+\d{4}\*{4}(\d{4})/i)
    if (card) { cardLastFour = card[1]; continue }
    if (/^\d{1,2}\s+de\s+[a-zç]{3}\.?\s+\d{4}/i.test(line)) {
      if (pending) result.warnings.push('Lançamento sem valor reconhecido: ' + pending)
      pending = line
    } else if (pending && !/^Total CART/i.test(line)) {
      pending += ' ' + line
    }
    if (!pending) continue
    const row = pending.match(/^(\d{1,2})\s+de\s+([a-zç]{3})\.?\s+(\d{4})\s+(.+?)\s+([+-]?)\s*R\$\s*([\d.]+,\d{2})\s*$/i)
    if (!row) continue
    const month = months[row[2].toLowerCase()]
    const date = `${row[3]}-${String(month).padStart(2, '0')}-${row[1].padStart(2, '0')}`
    const description = row[4].replace(/\s+-\s*$/, '').replace(/\s+/g, ' ').trim()
    if (!month || !validISODate(date) || !cardLastFour) {
      result.warnings.push('Data ou cartão não reconhecido em um lançamento.')
      pending = ''; continue
    }
    const amountCents = brlCents(row[6])
    if (date > dueDate) result.warnings.push('Um lançamento tem data posterior ao vencimento. Confira o modelo do PDF.')
    if (/^PAGAMENTO/i.test(description.replace(/\s/g, ''))) {
      result.previousPayments.push({ date, amountCents })
    } else {
      const installment = description.match(/\(Parcela\s+(\d+)\s+de\s+(\d+)\)/i)
      result.items.push({
        date, description, cardLastFour,
        amountCents: row[5] === '+' ? -amountCents : amountCents,
        category: invoiceCategory(description),
        installment: installment ? Number(installment[1]) : null,
        installments: installment ? Number(installment[2]) : null,
      })
    }
    pending = ''
  }
  if (pending) result.warnings.push('Lançamento incompleto no PDF: ' + pending)
  if (!result.items.length) throw new Error('Nenhuma compra reconhecida. PDFs digitalizados não são suportados.')
  const sum = result.items.reduce((value, item) => value + item.amountCents, 0)
  if (sum !== result.totalCents) {
    result.warnings.push('A soma dos itens difere do total. Esta versão não importa faturas com saldo anterior ou antecipações sem composição conferida.')
  }
  return result
}
