'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { saveThemePreference } from '@/app/actions/theme'
import type { ThemePreference } from '@/lib/theme'

interface ThemeContextValue {
  preference: ThemePreference
  changePreference: (preference: ThemePreference) => Promise<void>
}

interface ThemeProviderProps {
  initialPreference: ThemePreference
  children: ReactNode
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useThemePreference() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('ThemePreference requer ThemeProvider.')
  return context
}

export default function ThemeProvider({ initialPreference, children }: ThemeProviderProps) {
  const [preference, setPreference] = useState(initialPreference)

  async function changePreference(nextPreference: ThemePreference) {
    await saveThemePreference(nextPreference)
    document.documentElement.dataset.theme = nextPreference
    setPreference(nextPreference)
  }

  return (
    <ThemeContext.Provider value={{ preference, changePreference }}>
      {children}
      <Toaster
        theme={preference}
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            border: '1px solid var(--bg-border)',
            color: 'var(--text-primary)',
          },
        }}
      />
    </ThemeContext.Provider>
  )
}
