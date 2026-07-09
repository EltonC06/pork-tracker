import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Pork Tracker — Planejamento Financeiro Pessoal',
  description: 'Acompanhe seu patrimônio, investimentos e evolução financeira de forma inteligente.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              border: '1px solid var(--bg-border)',
              color: 'var(--text-primary)',
            },
          }}
        />
      </body>
    </html>
  )
}
