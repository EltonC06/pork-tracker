'use client'

import { useId } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { currentMonth, shiftMonth } from '@/lib/months'
import styles from './MonthPicker.module.css'

interface MonthPickerProps {
  value: string
  onChange: (month: string) => void
  label?: string
  months?: string[]
  disabled?: boolean
}

const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString('pt-BR', { month: 'long' }))

export default function MonthPicker({ value, onChange, label = 'Período', months = [], disabled = false }: MonthPickerProps) {
  const id = useId()
  const selectedYear = Number(value.slice(0, 4))
  const nowYear = Number(currentMonth().slice(0, 4))
  const years = [...new Set([selectedYear, ...months.map(month => Number(month.slice(0, 4))), ...Array.from({ length: 12 }, (_, i) => nowYear - 10 + i)])].sort((a, b) => b - a)
  return <fieldset className={styles.picker} disabled={disabled}>
    <legend className={styles.legend}><CalendarDays size={14} />{label}</legend>
    <div className={styles.controls}>
      <button type="button" className={styles.arrow} aria-label={`${label}: mês anterior`} disabled={value <= '1900-01'} onClick={() => onChange(shiftMonth(value, -1))}><ChevronLeft size={18} /></button>
      <div className={styles.fields}>
        <div><label htmlFor={`${id}-month`}>Mês</label><select id={`${id}-month`} className="input" value={value.slice(5, 7)} onChange={event => onChange(`${value.slice(0, 4)}-${event.target.value}`)}>{monthNames.map((name, i) => <option key={name} value={String(i + 1).padStart(2, '0')}>{name.charAt(0).toUpperCase() + name.slice(1)}</option>)}</select></div>
        <div><label htmlFor={`${id}-year`}>Ano</label><select id={`${id}-year`} className="input" value={selectedYear} onChange={event => onChange(`${event.target.value}-${value.slice(5, 7)}`)}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></div>
      </div>
      <button type="button" className={styles.arrow} aria-label={`${label}: próximo mês`} disabled={value >= '9999-12'} onClick={() => onChange(shiftMonth(value, 1))}><ChevronRight size={18} /></button>
    </div>
    <button type="button" className={styles.today} disabled={value === currentMonth()} onClick={() => onChange(currentMonth())}>Mês atual</button>
  </fieldset>
}
