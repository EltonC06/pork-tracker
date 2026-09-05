'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'

import QuickAddFab, { type QuickAddAccount } from '@/components/ui/QuickAddFab'

interface Props {
  children: React.ReactNode
  accounts?: QuickAddAccount[]
  categories?: string[]
}

export default function DashboardLayoutClient({ children, accounts = [], categories = [] }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <main className="main-content" style={{ flex: 1, width: '100%' }}>
          {children}
        </main>
      </div>

      <QuickAddFab accounts={accounts} initialCategories={categories} />
    </div>
  )
}
