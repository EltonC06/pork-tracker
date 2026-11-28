'use client'

import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from '../accounts.module.css'

interface AccountTabsProps {
  accountId: string
  accountName: string
  tabs: { id: string; label: string; icon: ReactNode }[]
  activeTab: string
  onChange: (id: string) => void
}

export default function AccountTabs({ accountId, accountName, tabs, activeTab, onChange }: AccountTabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else return
    event.preventDefault()
    onChange(tabs[nextIndex].id)
    buttons.current[nextIndex]?.focus()
  }

  return (
    <div className={`tab-bar ${styles.tabs}`} role="tablist" aria-label={`Detalhes de ${accountName}`}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={node => { buttons.current[index] = node }}
          type="button"
          role="tab"
          id={`account-${accountId}-tab-${tab.id}`}
          aria-controls={`account-${accountId}-panel-${tab.id}`}
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`tab-bar-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
          onKeyDown={event => handleKeyDown(event, index)}
        >
          {tab.icon}{tab.label}
        </button>
      ))}
    </div>
  )
}
