'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle, KeyRound } from 'lucide-react'
import { updatePassword } from '@/app/actions/auth'

export default function ResetPasswordPage() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await updatePassword(formData)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
        return
      }
      setMessage({ type: 'success', text: result.success ?? 'Senha atualizada com sucesso.' })
      form.reset()
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <KeyRound size={42} color="var(--brand-400)" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Definir nova senha</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Escolha uma senha forte para proteger sua conta.</p>
        </div>

        <div className="glass-card" style={{ padding: '2rem' }}>
          {message?.type === 'success' ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={44} color="var(--success-400)" style={{ margin: '0 auto 1rem' }} />
              <p role="alert" style={{ color: 'var(--success-400)', marginBottom: '1.25rem' }}>{message.text}</p>
              <Link href="/dashboard" className="btn-primary">Acessar painel</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label" htmlFor="new-password">Nova senha</label>
                <input id="new-password" name="newPassword" type="password" className="input" autoComplete="new-password" minLength={8} required />
              </div>
              <div>
                <label className="label" htmlFor="confirm-password">Confirmar nova senha</label>
                <input id="confirm-password" name="confirmPassword" type="password" className="input" autoComplete="new-password" minLength={8} required />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Use pelo menos 8 caracteres, incluindo uma letra e um número.</p>

              {message && <p role="alert" style={{ color: 'var(--danger-400)', fontSize: '0.875rem' }}>{message.text}</p>}

              <button type="submit" className="btn-primary" disabled={isPending} style={{ width: '100%', justifyContent: 'center' }}>
                {isPending ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
