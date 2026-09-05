export interface OfxTransaction {
  id: string // Generated temporary client ID
  fitid: string
  date: string // YYYY-MM-DD
  amount: number // Positive number
  type: 'income' | 'expense'
  name: string
  memo: string
  description: string
  suggestedCategory: string
  isDuplicate?: boolean
  selected: boolean
}

export interface OfxBankInfo {
  org?: string
  fid?: string
  bankId?: string
  branchId?: string
  acctId?: string
  acctType?: string
}

export interface OfxParseResult {
  bank: OfxBankInfo
  period: {
    start: string // YYYY-MM-DD
    end: string // YYYY-MM-DD
  }
  transactions: OfxTransaction[]
  summary: {
    totalCount: number
    incomeCount: number
    expenseCount: number
    totalIncome: number
    totalExpense: number
  }
}

// Known Brazilian Banks dictionary for smart matching
export const BRAZILIAN_BANKS = [
  { code: '077', aliases: ['inter', 'banco inter', 'intermedium', 'inter pj', 'banco intermedium'] },
  { code: '260', aliases: ['nu', 'nubank', 'nu pagamentos', 'nuconta'] },
  { code: '001', aliases: ['bb', 'banco do brasil', 'brasil'] },
  { code: '237', aliases: ['bradesco', 'banco bradesco', 'next'] },
  { code: '341', aliases: ['itau', 'itaú', 'banco itau', 'iti'] },
  { code: '033', aliases: ['santander', 'banco santander'] },
  { code: '104', aliases: ['caixa', 'cef', 'caixa economica', 'caixa econômica federal'] },
  { code: '336', aliases: ['c6', 'c6 bank'] },
  { code: '290', aliases: ['pagbank', 'pagseguro'] },
  { code: '380', aliases: ['picpay'] },
  { code: '212', aliases: ['banco original', 'original'] },
  { code: '655', aliases: ['neon', 'banco neon'] },
  { code: '756', aliases: ['sicoob', 'bancoob'] },
  { code: '748', aliases: ['sicredi'] },
]

/**
 * Smart Category Suggestion based on keywords in description/memo
 */
export function suggestCategory(
  description: string,
  memo: string,
  type: 'income' | 'expense'
): string {
  const text = `${description} ${memo}`.toLowerCase()

  if (type === 'income') {
    if (/sal[aá]rio|remunera[cç][aã]o|pagamento de salario/i.test(text)) return 'Salário'
    if (/rendimento|dividend|juros|aplicacao|invest/i.test(text)) return 'Investimento'
    if (/reembolso|estorno|devoluc/i.test(text)) return 'Reembolso'
    if (/ted recebida|doc recebida|deposito|dep[oó]sito/i.test(text)) return 'Transferência'
    if (/pix recebido/i.test(text)) return 'Receita Pix'
    return 'Outras Receitas'
  }

  // Expenses rules
  // Alimentação / Mercado / Restaurantes
  if (/food|ifood|aiqfome|restaurante|lanchonete|padaria|mercado|supermercado|hipermercado|acougue|açougue|hortifruti|churrascaria|pizzaria|hamburg|bar|cafe|cafeteria|subway|mcdonald|burger/i.test(text)) {
    return 'Alimentação'
  }

  // Transporte / Mobilidade
  if (/uber|99|99app|bilhetagem|transporte|metro|metrô|onibus|ônibus|posto|combustivel|combustível|gasolina|etanol|estacionamento|pedagio|pedágio|veloe|sem parar|conectcar/i.test(text)) {
    return 'Transporte'
  }

  // Moradia / Contas Fixas
  if (/aluguel|condominio|condomínio|energia|eletric|celpe|enel|cemig|copel|light|agua|água|sanepar|sabesp|comgas|internet|claro|vivo|tim|oi|gas|gás/i.test(text)) {
    return 'Moradia'
  }

  // Compras / E-commerce / Livros
  if (/amazon|shopee|aliexpress|mercado livre|magalu|magazine|casas bahia|livraria|loja|vestuario|calcado|calçado|roupa|zara|renner|riachuelo/i.test(text)) {
    return 'Compras'
  }

  // Saúde / Drogaria
  if (/farmacia|farmácia|drogaria|drogasil|pague menos|raia|medic|hospital|clinica|clínica|laboratorio|laboratório|consulta|dentista|odonto|psicolog/i.test(text)) {
    return 'Saúde'
  }

  // Lazer / Streaming / Assinaturas
  if (/netflix|spotify|disney|hbo|prime video|youtube|cinema|teatro|show|steam|playstation|xbox|nintendo|game|clube|hotel|pousada|viagem|airbnb/i.test(text)) {
    return 'Lazer'
  }

  // Educação
  if (/curso|faculdade|escola|universidade|udemy|alura|mensalidade|educacao|educação/i.test(text)) {
    return 'Educação'
  }

  // Serviços Financeiros / Tarifas / Impostos
  if (/iof|tarifa|anuidade|juros|multa|darf|das|tributo|imposto|seguro/i.test(text)) {
    return 'Taxas e Impostos'
  }

  return 'Outros'
}

/**
 * Format raw OFX date string (YYYYMMDD...) to YYYY-MM-DD
 */
function formatOfxDate(rawDate?: string): string {
  if (!rawDate) return new Date().toISOString().split('T')[0]
  const cleaned = rawDate.trim()
  if (cleaned.length >= 8) {
    const y = cleaned.substring(0, 4)
    const m = cleaned.substring(4, 6)
    const d = cleaned.substring(6, 8)
    return `${y}-${m}-${d}`
  }
  return new Date().toISOString().split('T')[0]
}

/**
 * Pure parser for OFX 1.02 (SGML) and OFX 2.x (XML)
 */
export function parseOfx(rawContent: string): OfxParseResult {
  // Extract Financial Institution info
  const orgMatch = rawContent.match(/<ORG>(.*?)(?:<\/ORG>|\r?\n)/i)
  const fidMatch = rawContent.match(/<FID>(.*?)(?:<\/FID>|\r?\n)/i)
  const bankIdMatch = rawContent.match(/<BANKID>(.*?)(?:<\/BANKID>|\r?\n)/i)
  const branchIdMatch = rawContent.match(/<BRANCHID>(.*?)(?:<\/BRANCHID>|\r?\n)/i)
  const acctIdMatch = rawContent.match(/<ACCTID>(.*?)(?:<\/ACCTID>|\r?\n)/i)
  const acctTypeMatch = rawContent.match(/<ACCTTYPE>(.*?)(?:<\/ACCTTYPE>|\r?\n)/i)

  const dtStartMatch = rawContent.match(/<DTSTART>(.*?)(?:<\/DTSTART>|\r?\n)/i)
  const dtEndMatch = rawContent.match(/<DTEND>(.*?)(?:<\/DTEND>|\r?\n)/i)

  const bankInfo: OfxBankInfo = {
    org: orgMatch?.[1]?.trim(),
    fid: fidMatch?.[1]?.trim(),
    bankId: bankIdMatch?.[1]?.trim(),
    branchId: branchIdMatch?.[1]?.trim(),
    acctId: acctIdMatch?.[1]?.trim(),
    acctType: acctTypeMatch?.[1]?.trim(),
  }

  const period = {
    start: formatOfxDate(dtStartMatch?.[1]),
    end: formatOfxDate(dtEndMatch?.[1]),
  }

  const transactions: OfxTransaction[] = []
  let totalIncome = 0
  let totalExpense = 0
  let incomeCount = 0
  let expenseCount = 0

  // Match all <STMTTRN>...</STMTTRN> blocks
  const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null
  let index = 0

  while ((match = stmtRegex.exec(rawContent)) !== null) {
    const block = match[1]
    index++

    const trnAmt = block.match(/<TRNAMT>(.*?)(?:<\/TRNAMT>|\r?\n)/i)?.[1]?.trim()
    const dtPosted = block.match(/<DTPOSTED>(.*?)(?:<\/DTPOSTED>|\r?\n)/i)?.[1]?.trim()
    const fitid = block.match(/<FITID>(.*?)(?:<\/FITID>|\r?\n)/i)?.[1]?.trim() || `tx-${index}`
    const name = block.match(/<NAME>(.*?)(?:<\/NAME>|\r?\n)/i)?.[1]?.trim() || ''
    const memo = block.match(/<MEMO>(.*?)(?:<\/MEMO>|\r?\n)/i)?.[1]?.trim() || ''

    const rawAmount = parseFloat((trnAmt || '0').replace(',', '.'))
    const type: 'income' | 'expense' = rawAmount >= 0 ? 'income' : 'expense'
    const amount = Math.abs(rawAmount)

    // Clean human-readable description: prefer NAME, fallback to MEMO
    const cleanDescription = (name || memo || 'Lançamento sem descrição').trim()
    const suggestedCat = suggestCategory(cleanDescription, memo, type)

    if (type === 'income') {
      totalIncome += amount
      incomeCount++
    } else {
      totalExpense += amount
      expenseCount++
    }

    transactions.push({
      id: `ofx-${Date.now()}-${index}`,
      fitid,
      date: formatOfxDate(dtPosted),
      amount,
      type,
      name,
      memo,
      description: cleanDescription,
      suggestedCategory: suggestedCat,
      selected: true,
    })
  }

  return {
    bank: bankInfo,
    period,
    transactions,
    summary: {
      totalCount: transactions.length,
      incomeCount,
      expenseCount,
      totalIncome,
      totalExpense,
    },
  }
}

/**
 * Intelligent account matcher: finds best matching user account
 * based on bank code or institution name
 */
export function matchAccount<T extends { id: string; name: string }>(
  bankInfo: OfxBankInfo,
  userAccounts: T[]
): T | null {
  if (!userAccounts || userAccounts.length === 0) return null

  const code = (bankInfo.bankId || bankInfo.fid || '').trim()
  const org = (bankInfo.org || '').toLowerCase()

  // 1. Check known bank aliases by code
  if (code) {
    const bankDef = BRAZILIAN_BANKS.find(b => b.code === code)
    if (bankDef) {
      for (const alias of bankDef.aliases) {
        const found = userAccounts.find(acc => acc.name.toLowerCase().includes(alias))
        if (found) return found
      }
    }
  }

  // 2. Check if account name is inside org or vice-versa
  if (org) {
    for (const acc of userAccounts) {
      const accName = acc.name.toLowerCase()
      if (org.includes(accName) || accName.includes(org)) {
        return acc
      }
    }
  }

  // 3. Check keywords in account name against known aliases
  for (const bankDef of BRAZILIAN_BANKS) {
    if (bankDef.aliases.some(alias => org.includes(alias))) {
      const found = userAccounts.find(acc =>
        bankDef.aliases.some(alias => acc.name.toLowerCase().includes(alias))
      )
      if (found) return found
    }
  }

  // Default to first account if available
  return userAccounts[0] || null
}
