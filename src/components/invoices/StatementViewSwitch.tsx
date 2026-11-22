'use client'

import styles from './invoices.module.css'

export default function StatementViewSwitch({ analysis, onChange }: { analysis: boolean; onChange: (analysis: boolean) => void }) {
  return <div className={styles.tabs} role="group" aria-label="Conteúdo do extrato">
    <button type="button" className={`${styles.viewButton} ${!analysis ? styles.activeTab : styles.tab}`} aria-pressed={!analysis} onClick={() => onChange(false)}>Lançamentos</button>
    <button type="button" className={`${styles.viewButton} ${analysis ? styles.activeTab : styles.tab}`} aria-pressed={analysis} onClick={() => onChange(true)}>Análise por categoria</button>
  </div>
}
