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

const { isInvoicePaymentDescription, isInvoicePaymentTransaction } = require('../src/lib/invoicePayments.ts')
const { shiftMonth, monthBounds } = require('../src/lib/months.ts')
const { reimbursementCandidates, reimbursementSummary, reimbursementFor } = require('../src/lib/reimbursements.ts')
for (const description of ['Pagamento Fatura - TITULAR', 'Automático: Pagamento de fatura', 'PGTO. DA FATURA', 'Fatura banco inter', 'Fatura cartão', 'Pagamento cartão de crédito', 'Fatura cartÃ£o Inter']) {
  assert.equal(isInvoicePaymentDescription(description), true, description)
  assert.equal(isInvoicePaymentTransaction({ type: 'expense', category: 'Lazer', description }), true)
}
for (const description of ['Pagamento Pix', 'Compra de cartão de memória', 'Fatura de energia', 'Mercado', 'Oferta da próxima fatura']) assert.equal(isInvoicePaymentDescription(description), false, description)
assert.equal(isInvoicePaymentTransaction({ type: 'expense', category: 'Fatura', description: 'Banco' }), true)
assert.equal(isInvoicePaymentTransaction({ type: 'income', category: 'Fatura', description: 'Pagamento Fatura' }), false)
const legacyPayments = [
  { ...txs[0], category: 'Fatura', description: 'Pagamento Fatura - TITULAR' },
  { ...txs[0], id: 'older', category: 'Lazer', description: 'Automático: Pagamento de fatura' },
]
assert.equal(buildStatement('general', legacyPayments, [], []).length, 0)
assert.equal(buildStatement('bank', legacyPayments, [], []).length, 2)
assert.equal(statementSummary(buildStatement('general', [...legacyPayments, txs[1]], invoices, items), []).totalCents, 20000)
assert.equal(shiftMonth('2026-12', 1), '2027-01')
assert.equal(shiftMonth('2026-01', -1), '2025-12')
assert.equal(monthBounds('2024-02').end, '2024-02-29')
assert.equal(monthBounds('2026-02').end, '2026-02-28')
const records = [
  { id: 'r1', source: 'bank', transaction_id: 'pix', invoice_item_id: null, amount_cents: 2000, status: 'to_claim', due_date: '2026-12-01' },
  { id: 'r2', source: 'card', transaction_id: null, invoice_item_id: '0', amount_cents: 10000, status: 'reimbursed', due_date: '2026-12-01' },
  { id: 'r3', source: 'card', transaction_id: null, invoice_item_id: '1', amount_cents: 4500, status: 'not_reimbursed', due_date: '2026-12-01' },
]
const candidates = reimbursementCandidates([...txs, ...legacyPayments], items, [], records)
assert.equal(candidates.some(row => ['payment', 'pix', 'older', 'income', '0', '1'].includes(row.id)), false)
assert.equal(candidates.every(row => row.amountCents > 0), true)
const reimbursementTotals = reimbursementSummary(records, '2026-12-15')
assert.equal(reimbursementTotals.pending.length, 2)
assert.equal(reimbursementTotals.received.length, 1)
assert.equal(reimbursementTotals.overdue, 1)
assert.equal(reimbursementTotals.pendingCents, 6500)
assert.equal(reimbursementFor(records, 'bank', 'pix').id, 'r1')
assert.equal(reimbursementFor(records, 'card', 'pix'), undefined)
console.log('Pagamentos históricos, mês/ano e acompanhamento de reembolsos passaram.')

// A known reference month: R$ 180 card purchases net of refunds + R$ 20 Pix.
// Settlement, both own-account transfer legs, and reimbursement status must
// not inflate or silently reduce that consumption total.
const { isOwnAccountTransfer } = require('../src/lib/statements.ts')
const transferLegs = [
  { ...txs[1], id: 'own-out', amount: 250, description: 'Transferência entre contas próprias' },
  { ...txs[2], id: 'own-in', amount: 250, description: 'Pix mesma titularidade' },
]
for (const description of ['Transferência entre contas próprias', 'PIX ENTRE MINHAS CONTAS', 'TED mesma titularidade', 'Transf. contas próprias']) {
  assert.equal(isOwnAccountTransfer({ description }), true, description)
}
for (const description of ['Pix mercado', 'Transferência fornecedor', 'TED recebida', 'Depósito', 'Transferência entre contas', null]) {
  assert.equal(isOwnAccountTransfer({ description }), false, description)
}
const knownMonth = buildStatement('general', [...txs, ...legacyPayments, ...transferLegs], invoices, items)
  .filter(entry => entry.date.startsWith('2026-12'))
assert.equal(knownMonth.filter(entry => entry.source === 'card').length, 4)
assert.equal(statementSummary(knownMonth, []).totalCents, 20000)
assert.equal(statementSummary(knownMonth, []).incomeCents, 100000)
assert.equal(buildStatement('bank', transferLegs, [], []).length, 2)
const reimbursementReceipt = { ...txs[2], id: 'reimbursement-receipt', amount: 100, description: 'Reembolso recebido' }
const withReceipt = buildStatement('general', [...txs, ...transferLegs, reimbursementReceipt], invoices, items)
assert.equal(statementSummary(withReceipt, []).totalCents, 20000)
assert.equal(statementSummary(withReceipt, []).incomeCents, 110000)
assert.equal(statementSummary(buildStatement('general', [{ ...txs[1], description: 'Pix mercado' }], [], []), []).totalCents, 2000)
console.log('Gasto mensal conhecido: R$ 200; compras únicas, transferências próprias, estornos e reembolso conferidos.')

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
