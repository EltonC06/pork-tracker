'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, KeyRound, Mail, Send } from 'lucide-react'
import { requestPasswordReset } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await requestPasswordReset(formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }
      setMessage({ type: 'success', text: result.success ?? 'Se existir uma conta com este e-mail, enviaremos instruções para redefinir a senha.' })
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <KeyRound size={42} color="var(--brand-400)" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Redefinir senha</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Enviaremos um link seguro para o seu e-mail.</p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="email" name="email" type="email" className="input" placeholder="seu@email.com" autoComplete="email" required style={{ paddingLeft: '2.75rem' }} />
              </div>
            </div>

            {message && (
              <p role="alert" style={{ color: message.type === 'error' ? 'var(--danger-400)' : 'var(--success-400)', fontSize: '0.875rem' }}>
                {message.text}
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={isPending} style={{ width: '100%', justifyContent: 'center' }}>
              {isPending ? 'Enviando...' : <>Enviar link <Send size={16} /></>}
            </button>
          </form>

          <div className="divider" />
          <Link href="/login" className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
            <ArrowLeft size={16} /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
