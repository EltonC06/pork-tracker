'use client'

import { useId, useState, useTransition } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemePreference } from './ThemeProvider'
import type { ThemePreference as Preference } from '@/lib/theme'

const options = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const

export default function ThemePreference() {
  const labelId = useId()
  const { preference, changePreference } = useThemePreference()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function chooseTheme(value: Preference) {
    setError('')
    startTransition(async () => {
      try {
        await changePreference(value)
      } catch {
        setError('Não foi possível salvar o tema. Tente novamente.')
      }
    })
  }

  return (
    <div className="theme-preference">
      <span id={labelId} className="theme-preference-label">Aparência</span>
      <div className="theme-preference-options" role="group" aria-labelledby={labelId} aria-busy={pending}>
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={preference === value}
            disabled={pending}
            onClick={() => chooseTheme(value)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {error && <p className="theme-preference-error" role="alert">{error}</p>}
    </div>
  )
}
