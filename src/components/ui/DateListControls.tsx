'use client'

import { useId, type ReactNode } from 'react'
import type { GroupByMode, ListOrder, PeriodPreset } from '@/lib/dateList'
import styles from './DateListControls.module.css'

interface DateListControlsProps {
  search: string; onSearch: (value: string) => void
  period: PeriodPreset; onPeriod: (value: PeriodPreset) => void
  start: string; end: string; onStart: (value: string) => void; onEnd: (value: string) => void
  group: GroupByMode; onGroup: (value: GroupByMode) => void
  order: ListOrder; onOrder: (value: ListOrder) => void
  onClear: () => void; children?: ReactNode; dateLabel?: string
}

export default function DateListControls(props: DateListControlsProps) {
  const id = useId()
  return <div className={`filter-bar ${styles.controls}`}>
    <div className={styles.fields}>
      <label className={styles.field}>Buscar<input className="input" type="search" placeholder="Descrição, categoria…" value={props.search} onChange={event => props.onSearch(event.target.value)} /></label>
      {props.children}
      <label className={styles.field}>Ordenar<select className="input" value={props.order} onChange={event => props.onOrder(event.target.value as ListOrder)}>
        <option value="date_desc">Mais recentes</option><option value="date_asc">Mais antigos</option><option value="amount_desc">Maior valor</option><option value="amount_asc">Menor valor</option><option value="description">Descrição A–Z</option>
      </select></label>
    </div>
    <div className="filter-chip-group" role="group" aria-label={props.dateLabel ?? 'Período'}>
      <span className={styles.caption}>{props.dateLabel ?? 'Período'}:</span>
      {([['month', 'Mês selecionado'], ['last_30_days', '30 dias'], ['last_90_days', '90 dias'], ['this_year', 'Este ano'], ['all', 'Tudo'], ['custom', 'Personalizado']] as [PeriodPreset, string][]).map(([value, label]) => <button type="button" key={value} className={`filter-chip ${props.period === value ? 'active' : ''}`} aria-pressed={props.period === value} onClick={() => props.onPeriod(value)}>{label}</button>)}
    </div>
    {props.period === 'custom' && <div className={styles.fields}>
      <label className={styles.field} htmlFor={`${id}-start`}>De<input id={`${id}-start`} type="date" className="input" value={props.start} onChange={event => props.onStart(event.target.value)} /></label>
      <label className={styles.field} htmlFor={`${id}-end`}>Até<input id={`${id}-end`} type="date" className="input" value={props.end} onChange={event => props.onEnd(event.target.value)} /></label>
      {props.start && props.end && props.start > props.end && <p role="status">A data inicial deve ser anterior à final.</p>}
    </div>}
    <div className={styles.bottom}>
      <div className="filter-chip-group" role="group" aria-label="Agrupar por data">
        <span className={styles.caption}>Agrupar:</span>
        {([['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês'], ['none', 'Nenhum']] as [GroupByMode, string][]).map(([value, label]) => <button type="button" key={value} className={`filter-chip ${props.group === value ? 'active' : ''}`} aria-pressed={props.group === value} onClick={() => props.onGroup(value)}>{label}</button>)}
      </div>
      <button className="btn-ghost" type="button" onClick={props.onClear}>Limpar filtros</button>
    </div>
    <p className={styles.caption}>Ao agrupar, a ordenação por valor ou descrição vale dentro de cada grupo.</p>
  </div>
}
