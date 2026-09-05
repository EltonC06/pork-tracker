'use client'

import { useState, useRef, useTransition, useMemo } from 'react'
import {
  UploadCloud,
  FileText,
  Check,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Loader2,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import FormModal from '@/components/ui/FormModal'
import { parseOfx, matchAccount, type OfxTransaction, type OfxParseResult } from '@/lib/ofxParser'
import { importTransactionsBatch } from '@/app/actions/ofx'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { AccountType, Transaction } from '@/types/database'

interface OfxImportModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountType[]
  existingTransactions?: Transaction[]
  initialAccountId?: string
}

export default function OfxImportModal({
  isOpen,
  onClose,
  accounts,
  existingTransactions = [],
  initialAccountId,
}: OfxImportModalProps) {
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step state
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [parseResult, setParseResult] = useState<OfxParseResult | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [items, setItems] = useState<OfxTransaction[]>([])

  // Reset state when closed or user clicks to restart
  const resetState = () => {
    setStep('upload')
    setParseResult(null)
    setSelectedAccountId('')
    setItems([])
    setIsDragging(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  // File processing
  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.ofx')) {
      toast.error('Por favor, selecione um arquivo no formato .ofx')
      return
    }

    const reader = new FileReader()

    // Read with windows-1252 to ensure Brazilian accented characters are decoded properly
    reader.onload = (e) => {
      try {
        const rawContent = e.target?.result as string
        if (!rawContent || !rawContent.includes('<OFX>')) {
          toast.error('O arquivo selecionado não parece ser um extrato OFX válido.')
          return
        }

        const parsed = parseOfx(rawContent)

        if (parsed.transactions.length === 0) {
          toast.error('Nenhuma transação foi encontrada dentro deste arquivo OFX.')
          return
        }

        // Determine target account
        let targetAccId = initialAccountId || ''
        if (!targetAccId) {
          const matched = matchAccount(parsed.bank, accounts)
          targetAccId = matched ? matched.id : accounts[0]?.id || ''
        }

        // Detect duplicates
        const processedItems = parsed.transactions.map((tx) => {
          const isDup = existingTransactions.some((ext) => {
            const sameAccount = !targetAccId || ext.account_type_id === targetAccId
            const sameDate = ext.date === tx.date
            const sameAmount = Math.abs(Number(ext.amount)) === tx.amount
            const sameType = ext.type === tx.type
            return sameAccount && sameDate && sameAmount && sameType
          })

          return {
            ...tx,
            isDuplicate: isDup,
            selected: !isDup, // unselect duplicates by default!
          }
        })

        setParseResult(parsed)
        setSelectedAccountId(targetAccId)
        setItems(processedItems)
        setStep('preview')
        toast.success(`Extrato carregado! ${parsed.transactions.length} transações encontradas.`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao processar arquivo'
        toast.error('Falha ao ler extrato: ' + msg)
      }
    }

    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo.')
    }

    reader.readAsText(file, 'windows-1252')
  }

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  // Recalculate duplicates if user changes target account in dropdown
  const handleAccountChange = (newAccountId: string) => {
    setSelectedAccountId(newAccountId)
    setItems((prev) =>
      prev.map((tx) => {
        const isDup = existingTransactions.some((ext) => {
          const sameAccount = ext.account_type_id === newAccountId
          const sameDate = ext.date === tx.date
          const sameAmount = Math.abs(Number(ext.amount)) === tx.amount
          const sameType = ext.type === tx.type
          return sameAccount && sameDate && sameAmount && sameType
        })
        return {
          ...tx,
          isDuplicate: isDup,
          selected: isDup ? false : tx.selected,
        }
      })
    )
  }

  // Row selection toggle
  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    )
  }

  // Master selection toggle
  const allSelected = items.length > 0 && items.every((i) => i.selected)
  const toggleSelectAll = () => {
    const nextVal = !allSelected
    setItems((prev) => prev.map((item) => ({ ...item, selected: nextVal })))
  }

  // Inline edits
  const updateDescription = (id: string, newDesc: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description: newDesc } : item))
    )
  }
  const updateCategory = (id: string, newCat: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, suggestedCategory: newCat } : item))
    )
  }

  // Selected totals
  const selectedStats = useMemo(() => {
    let income = 0
    let expense = 0
    let count = 0
    for (const it of items) {
      if (it.selected) {
        count++
        if (it.type === 'income') income += it.amount
        else expense += it.amount
      }
    }
    return {
      count,
      income,
      expense,
      net: income - expense,
    }
  }, [items])

  const duplicateCount = useMemo(() => items.filter((i) => i.isDuplicate).length, [items])

  // Submit action
  const handleImport = () => {
    if (!selectedAccountId) {
      toast.error('Selecione uma conta de destino para as transações.')
      return
    }

    const selectedItems = items.filter((i) => i.selected)
    if (selectedItems.length === 0) {
      toast.error('Nenhuma transação selecionada para importação.')
      return
    }

    startTransition(async () => {
      try {
        const payload = {
          account_type_id: selectedAccountId,
          transactions: selectedItems.map((tx) => ({
            amount: tx.amount,
            type: tx.type,
            category: tx.suggestedCategory || null,
            date: tx.date,
            description: tx.description,
          })),
        }

        const res = await importTransactionsBatch(payload)
        toast.success(`${res.count} lançamentos importados com sucesso!`)
        handleClose()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao importar transações'
        toast.error(msg)
      }
    })
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Extrato Bancário (OFX)"
      maxWidth="860px"
    >
      {step === 'upload' ? (
        /* STEP 1: Upload Dropzone */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Faça upload do arquivo <strong>.ofx</strong> exportado do seu internet banking ou app
            bancário. O Pork Tracker identificará a instituição, sugerirá categorias e evitará
            duplicatas.
          </p>

          <div
            className={`ofx-dropzone ${isDragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFile(e.target.files[0])
                }
              }}
            />

            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-400)',
              }}
            >
              <UploadCloud size={28} />
            </div>

            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                Clique para selecionar ou arraste o arquivo aqui
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Formatos suportados: .ofx (OFX SGML ou XML)
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              border: '1px solid var(--bg-border)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} color="var(--success-400)" />
              Bancos testados: Inter, Nubank, Itaú, Bradesco, BB, Caixa, Santander, C6
            </span>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
              onClick={handleClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        /* STEP 2: Preview & Confirmation */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Info Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {/* Bank Info Card */}
            <div className="ofx-summary-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.375rem',
                }}
              >
                <Building2 size={14} color="var(--brand-400)" />
                <span>Banco Identificado</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                {parseResult?.bank.org || 'Instituição Financeira'}
              </p>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {parseResult?.bank.fid || parseResult?.bank.bankId
                  ? `Código: ${parseResult.bank.fid || parseResult.bank.bankId}`
                  : ''}
                {parseResult?.bank.acctId ? ` • Conta: ${parseResult.bank.acctId}` : ''}
              </span>
            </div>

            {/* Target Account Selector */}
            <div className="ofx-summary-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.375rem',
                }}
              >
                <Layers size={14} color="var(--brand-400)" />
                <span>Conta de Destino no Pork</span>
              </div>
              <select
                className="input"
                style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                value={selectedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Card */}
            <div className="ofx-summary-card">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.375rem',
                }}
              >
                <Calendar size={14} color="var(--brand-400)" />
                <span>Período do Extrato</span>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                {parseResult?.period.start ? formatDate(parseResult.period.start) : '—'} até{' '}
                {parseResult?.period.end ? formatDate(parseResult.period.end) : '—'}
              </p>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {items.length} lançamentos no arquivo
              </span>
            </div>
          </div>

          {/* Duplicate warning alert if any */}
          {duplicateCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                background: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.25)',
                borderRadius: '10px',
                fontSize: '0.75rem',
                color: 'var(--warning-400)',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>
                Identificamos <strong>{duplicateCount}</strong> possível(is) lançamento(s) já
                existente(s) na conta nesta data. Eles foram <strong>desmarcados</strong>{' '}
                automaticamente para evitar duplicidade.
              </span>
            </div>
          )}

          {/* Table Controls (Select all, counters) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                onClick={toggleSelectAll}
              >
                {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <strong>{selectedStats.count}</strong> de {items.length} selecionados
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <span style={{ color: 'var(--success-400)' }}>
                +{formatCurrency(selectedStats.income)}
              </span>
              <span style={{ color: 'var(--danger-400)' }}>
                -{formatCurrency(selectedStats.expense)}
              </span>
            </div>
          </div>

          {/* Transactions Preview Table */}
          <div className="ofx-table-container">
            <table className="data-table" style={{ width: '100%', margin: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-surface)' }}>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '95px' }}>Data</th>
                  <th>Descrição</th>
                  <th style={{ width: '150px' }}>Categoria</th>
                  <th style={{ width: '130px', textAlign: 'right' }}>Valor</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => {
                  const isIncome = tx.type === 'income'
                  return (
                    <tr
                      key={tx.id}
                      style={{
                        background: tx.selected ? undefined : 'rgba(0,0,0,0.15)',
                        opacity: tx.selected ? 1 : 0.6,
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={tx.selected}
                          onChange={() => toggleItem(tx.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(tx.date)}
                      </td>

                      {/* Description (inline editable) */}
                      <td>
                        <input
                          type="text"
                          value={tx.description}
                          onChange={(e) => updateDescription(tx.id, e.target.value)}
                          className="input"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.8125rem',
                            height: 'auto',
                            border: '1px solid transparent',
                            background: 'transparent',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--brand-500)'
                            e.currentTarget.style.background = 'var(--bg-card)'
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'transparent'
                            e.currentTarget.style.background = 'transparent'
                          }}
                        />
                      </td>

                      {/* Category (inline editable) */}
                      <td>
                        <input
                          type="text"
                          value={tx.suggestedCategory}
                          onChange={(e) => updateCategory(tx.id, e.target.value)}
                          className="input"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            height: 'auto',
                          }}
                        />
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: isIncome ? 'var(--success-400)' : 'var(--danger-400)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isIncome ? '+ ' : '- '}
                        {formatCurrency(tx.amount)}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        {tx.isDuplicate ? (
                          <span className="badge-duplicate">Duplicata?</span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--success-400)',
                              fontWeight: 500,
                            }}
                          >
                            Novo
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--bg-border-subtle)',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              onClick={() => setStep('upload')}
              disabled={isPending}
            >
              <ArrowLeft size={16} />
              Outro Arquivo
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={handleImport}
                disabled={isPending || selectedStats.count === 0}
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Importar {selectedStats.count} Lançamento(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </FormModal>
  )
}
