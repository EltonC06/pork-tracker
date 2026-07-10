'use client'

import type { ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
}

export default function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            className={`tab-bar-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
