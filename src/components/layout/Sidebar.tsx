'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import GlobalExportBtn from './GlobalExportBtn'
import {
  TrendingUp,
  LayoutDashboard,
  Wallet,
  LineChart,
  BarChart3,
  LogOut,
  Home,
  Calendar,
  Receipt,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/accounts', label: 'Contas', icon: Wallet },
  { href: '/dashboard/transactions', label: 'Extrato', icon: Receipt },
  { href: '/dashboard/stocks', label: 'Ações', icon: TrendingUp },
  { href: '/dashboard/planning', label: 'Resumo', icon: Calendar },
  { href: '/dashboard/charts', label: 'Gráficos', icon: BarChart3 },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [showVersion, setShowVersion] = useState(false)

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30, backdropFilter: 'blur(4px)'
          }}
          onClick={onClose}
        />
      )}
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem 1.25rem',
        borderBottom: '1px solid var(--bg-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
            flexShrink: 0,
          }}>
            <LineChart size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.0625rem', lineHeight: 1.2 }}>
              <span className="gradient-text">Pork</span> Tracker
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Patrimônio Pessoal
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
        <p style={{
          fontSize: '0.6875rem', fontWeight: 600,
          color: 'var(--text-muted)', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: '0.5rem',
          padding: '0 0.25rem',
        }}>
          Módulos
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: logout & version */}
      <div style={{
        padding: '1rem 0.75rem',
        borderTop: '1px solid var(--bg-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}>
        
        <GlobalExportBtn />

        <Link
          href="/dashboard/settings"
          className={`nav-item ${pathname.startsWith('/dashboard/settings') ? 'active' : ''}`}
          onClick={onClose}
        >
          <Settings size={18} />
          Configurações
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="nav-item btn-ghost"
            style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'transparent' }}
          >
            <LogOut size={18} />
            Sair
          </button>
        </form>

        <div style={{ padding: '0 0.5rem', marginTop: '0.5rem' }}>
          <div 
            style={{ position: 'relative', display: 'inline-flex', cursor: 'help', alignItems: 'center' }}
            onMouseEnter={() => setShowVersion(true)}
            onMouseLeave={() => setShowVersion(false)}
          >
            <span style={{ 
              fontSize: '0.6875rem', 
              color: 'var(--text-muted)', 
              fontWeight: 600,
              background: 'var(--bg-card)',
              padding: '0.125rem 0.375rem',
              borderRadius: '4px',
              border: '1px solid var(--bg-border)'
            }}>
              v2.3
            </span>
            
            {showVersion && (
              <div style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--bg-border)',
                borderRadius: '8px',
                padding: '0.75rem',
                width: 'max-content',
                maxWidth: '280px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 50,
                pointerEvents: 'none',
              }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                  v2.3 (Atual)
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                  <li style={{ marginBottom: '0.25rem', position: 'relative', paddingLeft: '0.75rem', lineHeight: 1.4 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--brand-400)' }}>•</span> Importador de Extrato OFX: leitura e upload de arquivos bancários em lote.
                  </li>
                  <li style={{ marginBottom: '0.25rem', position: 'relative', paddingLeft: '0.75rem', lineHeight: 1.4 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--brand-400)' }}>•</span> Identificação inteligente de banco e prevenção de lançamentos duplicados.
                  </li>
                  <li style={{ marginBottom: '0.25rem', position: 'relative', paddingLeft: '0.75rem', lineHeight: 1.4 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--brand-400)' }}>•</span> Motor de sugestão automática de categorias por palavras-chave.
                  </li>
                  <li style={{ marginBottom: 0, position: 'relative', paddingLeft: '0.75rem', lineHeight: 1.4 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--brand-400)' }}>•</span> Quick Add FAB (Ctrl+N) e Extrato Global unificado (v2.1).
                  </li>
                  <li style={{ marginBottom: 0, position: 'relative', paddingLeft: '0.75rem', lineHeight: 1.4 }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--brand-400)' }}>•</span> Configurações de usuário e recuperação segura de senha.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
    </>
  )
}
