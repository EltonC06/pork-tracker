'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { register } from '@/app/actions/auth'
import { TrendingUp, Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await register(formData)
      if (result?.error) setError(result.error)
      if (result?.success) setSuccess(result.success)
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 70% 20%, rgba(99,102,241,0.08) 0%, transparent 60%), var(--bg-base)',
      padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'linear-gradient(135deg, var(--brand-600), var(--brand-400))',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
          }}>
            <TrendingUp size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            Criar conta no <span className="gradient-text">FinTrack</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Comece a acompanhar seu patrimônio hoje
          </p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle size={48} color="var(--success-400)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--success-400)', fontWeight: 600, marginBottom: '0.5rem' }}>Conta criada!</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{success}</p>
              <Link href="/login" className="btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
                Ir para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {error && (
                <div style={{
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  color: 'var(--danger-400)',
                  fontSize: '0.875rem',
                }}>
                  {error}
                </div>
              )}

              <div>
                <label className="label" htmlFor="email">E-mail</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{
                    position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className="input"
                    style={{ paddingLeft: '2.75rem' }}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">Senha</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{
                    position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }} />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    className="input"
                    style={{ paddingLeft: '2.75rem' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isPending}
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              >
                {isPending ? 'Criando conta...' : (
                  <>Criar conta <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}

          {!success && (
            <>
              <div className="divider" />
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Já tem conta?{' '}
                <Link href="/login" style={{ color: 'var(--brand-400)', textDecoration: 'none', fontWeight: 600 }}>
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
