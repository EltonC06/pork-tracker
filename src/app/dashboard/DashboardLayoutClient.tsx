'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'

interface Props {
  children: React.ReactNode
}

export default function DashboardLayoutClient({ children }: Props) {
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
    </div>
  )
}
