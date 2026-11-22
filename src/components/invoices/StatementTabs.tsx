import Link from 'next/link'
import type { StatementSource } from '@/lib/statements'
import styles from './invoices.module.css'

export default function StatementTabs({ active }: { active: StatementSource }) {
  return <nav className={styles.tabs} aria-label="Extratos">
    {([
      ['general', '/dashboard/statement', 'Geral'],
      ['bank', '/dashboard/transactions', 'Banco'],
      ['card', '/dashboard/invoices', 'Cartão'],
    ] as const).map(([key, href, label]) => <Link key={key} href={href} aria-current={active === key ? 'page' : undefined} className={active === key ? styles.activeTab : styles.tab}>{label}</Link>)}
  </nav>
}
