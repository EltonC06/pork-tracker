import type { Metadata } from 'next'
import './globals.css'
import { cookies } from 'next/headers'
import ThemeProvider from '@/components/theme/ThemeProvider'
import { parseThemePreference, THEME_COOKIE } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'Pork Tracker — Planejamento Financeiro Pessoal',
  description: 'Acompanhe seu patrimônio, investimentos e evolução financeira de forma inteligente.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const preference = parseThemePreference((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html lang="pt-BR" data-theme={preference}>
      <body>
        <ThemeProvider initialPreference={preference}>{children}</ThemeProvider>
      </body>
    </html>
  )
}
