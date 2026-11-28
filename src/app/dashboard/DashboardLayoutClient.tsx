'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'

import QuickAddFab, { type QuickAddAccount } from '@/components/ui/QuickAddFab'
import type { ExpenseCategoryOption } from '@/types/database'

interface Props {
  children: React.ReactNode
  accounts?: QuickAddAccount[]
  categories?: ExpenseCategoryOption[]
}

export default function DashboardLayoutClient({ children, accounts = [], categories = [] }: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="dashboard-shell">
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      
      <div className="dashboard-body">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        <main className="main-content">
          {children}
        </main>
      </div>

      <QuickAddFab accounts={accounts} categories={categories} />
    </div>
  )
}
