/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS harness registers a TypeScript loader for the pure modules under test. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}
const { parseInterInvoice } = require('../src/lib/interInvoice.ts')
const { pdfTextLines } = require('../src/lib/pdfLines.ts')
const { buildStatement, statementSummary, suggestedStatementMonth, isInvoicePayment } = require('../src/lib/statements.ts')

const sample = `Resumo da fatura
Total da sua fatura
R$ 180,00
Data de Vencimento 12/01/2027
Despesas da fatura
CARTÃO 1111****1234
10 de dez. 2026 PAGAMENTO ON LINE - + R$ 500,00
Total CARTÃO 1111****1234 R$ 0,00
CARTÃO 1111****5678
11 de dez. 2026 Mercado - R$ 100,00
12 de dez. 2026 Uber (Parcela 01 de 03) - R$ 45,00
12 de dez. 2026 Uber - R$ 45,00
13 de dez. 2026 ESTORNO Mercado - + R$ 10,00
Total CARTÃO 1111****5678 R$ 180,00
Próxima fatura
Uber (Parcela 02 de 03) R$ 45,00`
const parsed = parseInterInvoice(sample)
assert.equal(parsed.dueDate, '2027-01-12')
assert.equal(parsed.items.length, 4)
assert.equal(parsed.items[1].installment, 1)
assert.equal(parsed.items[1].installments, 3)
assert.equal(parsed.items[3].amountCents, -1000)
assert.equal(parsed.previousPayments.length, 1)
assert.equal(parsed.warnings.length, 0)
assert.equal(parsed.items.reduce((sum, row) => sum + row.amountCents, 0), 18000)
assert.equal(parseInterInvoice(sample.replace('PAGAMENTO ON LINE', 'P AGAMENTO ON LINE')).previousPayments.length, 1)
const coverLayout = sample.replace('Total da sua fatura\nR$ 180,00', 'Limite de crédito total\nTotal da sua fatura\nR$ 2.500,00\nR$ 180,00')
  .replace('Despesas da fatura', 'Fatura atual R$ 180,00\n1111****9999 12/01/2027 R$ 180,00\nDespesas da fatura')
assert.equal(parseInterInvoice(coverLayout).totalCents, 18000)
assert.equal(parseInterInvoice(coverLayout).cardLastFour, '9999')
assert.equal(parseInterInvoice(sample.replace('R$ 180,00', 'R$ 181,00')).warnings.length, 1)
assert.throws(() => parseInterInvoice('PDF desconhecido'))
assert.equal(parseInterInvoice(sample.replace('11 de dez.', '31 de fev.')).warnings.length > 0, true)
const duplicate = parseInterInvoice(sample.replace('12 de dez. 2026 Uber - R$ 45,00', '12 de dez. 2026 Uber (Parcela 01 de 03) - R$ 45,00'))
assert.equal(duplicate.items.filter(item => item.amountCents === 4500).length, 2)

const txs = [
  { id: 'payment', amount: 180, type: 'expense', date: '2027-01-12', category: 'Pagamento de fatura', category_id: 'payment-category' },
  { id: 'pix', amount: 20, type: 'expense', date: '2026-12-12', category: 'Alimentação', category_id: null },
  { id: 'income', amount: 1000, type: 'income', date: '2026-12-12', category: '', category_id: null },
]
const invoices = [{ id: 'bill', statement_month: '2026-12-01' }]
const items = parsed.items.map((item, i) => ({ ...item, id: String(i), invoice_id: 'bill', amount_cents: item.amountCents, category_id: null }))
const general = buildStatement('general', txs, invoices, items)
assert.equal(statementSummary(general, []).totalCents, 20000)
assert.equal(statementSummary(general, []).incomeCents, 100000)
assert.equal(statementSummary(buildStatement('bank', txs, invoices, items), []).totalCents, 20000)
assert.equal(statementSummary(buildStatement('card', txs, invoices, items), []).totalCents, 18000)
assert.equal(general.some(entry => entry.id === 'bank:payment'), false)
assert.equal(buildStatement('general', txs, [], []).length, 2) // Exclusion is independent of PDF coverage.
assert.equal(buildStatement('general', [{ ...txs[0], category: 'Outros' }], [], []).length, 1) // No description heuristics.
assert.equal(buildStatement('general', [{ ...txs[0], category: 'Outros' }], [], [], [{ id: 'payment-category', name: 'Pagamento de fatura' }]).length, 0)
assert.equal(suggestedStatementMonth(parsed.items, parsed.dueDate), '2026-12')
assert.equal(isInvoicePayment('  PAGAMENTO DE FATURA '), true)
const reperiod = buildStatement('card', [], [{ id: 'bill', statement_month: '2027-02-01' }], items)
assert.equal(reperiod.every(entry => entry.date === '2027-02-01'), true)
assert.equal(reperiod[0].originalDate.startsWith('2026-12'), true)
const refunds = statementSummary(buildStatement('card', [], invoices, [{ ...items[0], amount_cents: -100 }]), [])
assert.equal(refunds.totalCents, -100)
assert.equal(refunds.rows[0].percent, 0)
console.log('Parser e extratos: separação, categoria de pagamento, estornos e mês de referência passaram.')

async function checkPdf(filename) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({ data: new Uint8Array(fs.readFileSync(filename)) })
  try {
    const pdf = await task.promise
    const pages = []
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const content = await page.getTextContent()
      pages.push(pdfTextLines(content.items.filter(item => 'str' in item)))
    }
    const result = parseInterInvoice(pages.join('\n'))
    // No PDF contents, merchant names, account numbers or personal information are logged.
    console.log('PDF real: conferido.', JSON.stringify({
      pages: pdf.numPages, items: result.items.length, totalCents: result.totalCents,
      dueDate: result.dueDate, previousPayments: result.previousPayments.length,
      installments: result.items.filter(item => item.installment).length,
      itemTotalCents: result.items.reduce((sum, row) => sum + row.amountCents, 0),
      warningCount: result.warnings.length,
    }))
    assert.equal(result.warnings.length, 0)
    assert.equal(result.totalCents, result.items.reduce((sum, row) => sum + row.amountCents, 0))
  } finally { await task.destroy() }
}
if (process.argv[2]) checkPdf(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1 })
