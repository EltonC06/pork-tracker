'use client'

import { buildStatement, isInvoicePaymentTransaction, isOwnAccountTransfer } from '@/lib/statements'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { fetchAllUserData } from '@/app/actions/export'

export default function GlobalExportBtn() {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const data = await fetchAllUserData()
      
      const wb = XLSX.utils.book_new()

      // Sheet 1: Contas
      const accountsSheet = XLSX.utils.json_to_sheet(data.accounts.map(a => ({
        ID: a.id,
        Nome: a.name,
        CriadoEm: new Date(a.created_at).toLocaleDateString()
      })))
      XLSX.utils.book_append_sheet(wb, accountsSheet, 'Contas')

      // Sheet 2: Saldos (Snapshots)
      const snapshotsSheet = XLSX.utils.json_to_sheet(data.snapshots.map(s => {
        const account = data.accounts.find(a => a.id === s.account_type_id)
        return {
          Data: new Date(s.snapshot_date).toLocaleDateString(),
          Conta: account?.name || 'Desconhecida',
          Saldo: s.balance,
          Notas: s.notes || ''
        }
      }))
      XLSX.utils.book_append_sheet(wb, snapshotsSheet, 'Saldos')

      // Sheet 3: Transações
      const txSheet = XLSX.utils.json_to_sheet(data.transactions.map(t => {
        const account = data.accounts.find(a => a.id === t.account_type_id)
        return {
          Data: new Date(t.date).toLocaleDateString(),
          Conta: account?.name || 'Desconhecida',
          Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
          Categoria: t.category || '',
          Valor: t.amount,
          ForaDoExtratoGeral: isInvoicePaymentTransaction(t) || isOwnAccountTransfer(t),
          Descricao: t.description || ''
        }
      }))
      XLSX.utils.book_append_sheet(wb, txSheet, 'Transações')

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.invoiceData.invoices), 'Faturas')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.invoiceData.items), 'Itens_Cartão')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buildStatement('general', data.transactions, data.invoiceData.invoices, data.invoiceData.items).map(entry => ({
        Origem: entry.source === 'card' ? 'Cartão' : 'Banco', MesReferencia: entry.date.slice(0, 7), DataOriginal: entry.originalDate, Descricao: entry.description, Categoria: entry.category, Tipo: entry.type, Valor: entry.amount,
      }))), 'Extrato_Geral')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { Regra: 'Extrato_Geral combina banco e cartão e exclui pagamentos de fatura e transferências próprias explicitamente identificadas.' },
        { Regra: 'Compras do cartão usam statement_month; transações bancárias usam a data do lançamento.' },
        { Regra: 'Valores _cents estão em centavos; estornos reduzem despesas. Somente faturas importadas entram no geral.' },
      ]), 'Como_Interpretar')

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.reimbursementData.records), 'Reembolsos')

      // Sheet 4: Ações (Posições)
      const stocksSheet = XLSX.utils.json_to_sheet(data.positions.map(p => ({
        Ticker: p.ticker,
        Quantidade: p.quantity,
        PreçoMedio: p.avg_price,
        TotalInvestido: p.quantity * p.avg_price
      })))
      XLSX.utils.book_append_sheet(wb, stocksSheet, 'Ações_Carteira')

      XLSX.writeFile(wb, 'Backup_PorkTracker.xlsx')
      toast.success('Download concluído!')
    } catch (err: any) {
      toast.error('Erro ao exportar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="nav-item btn-ghost"
      style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', display: 'flex' }}
    >
      <Download size={18} />
      {loading ? 'Gerando...' : 'Exportar Backup (Excel)'}
    </button>
  )
}
