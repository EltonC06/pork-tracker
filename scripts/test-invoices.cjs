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
const { summarizeSpending } = require('../src/lib/spending.ts')

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
  { id: 'payment', amount: 180, type: 'expense', date: '2027-01-12', category: 'Outros' },
  { id: 'pix', amount: 20, type: 'expense', date: '2026-12-12', category: 'Alimentação' },
]
const links = [{ transaction_id: 'payment', amount_cents: 18000 }]
const items = parsed.items.map(item => ({ ...item, amount_cents: item.amountCents }))
assert.equal(summarizeSpending(txs, items, links, '2026-12-01', '2026-12-31').totalCents, 20000)
assert.equal(summarizeSpending(txs, items, links, '2027-01-01', '2027-01-31').totalCents, 0)
assert.equal(summarizeSpending(txs, items, [{ ...links[0], amount_cents: 8000 }], '2027-01-01', '2027-01-31').totalCents, 10000)
assert.equal(summarizeSpending(txs, items, [], '2027-01-01', '2027-01-31').totalCents, 18000)
console.log('Parser e consumo: casos sintéticos passaram.')

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
