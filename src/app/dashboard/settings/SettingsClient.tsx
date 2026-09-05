'use client'

import { useState, useTransition } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { updatePassword } from '@/app/actions/auth'

interface SettingsClientProps {
  email: string
}

export default function SettingsClient({ email }: SettingsClientProps) {
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
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--brand-400)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Conta
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Configurações</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Gerencie seus dados de acesso e mantenha sua conta protegida.</p>
      </div>

      <section className="glass-card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <ShieldCheck size={20} color="var(--success-400)" />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Dados da conta</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>E-mail usado para entrar no Pork Tracker.</p>
          </div>
        </div>
        <label className="label" htmlFor="account-email">E-mail</label>
        <input id="account-email" className="input" value={email} readOnly aria-readonly="true" />
      </section>

      <section className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <KeyRound size={20} color="var(--brand-400)" />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Alterar senha</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Confirme sua senha atual antes de definir uma nova.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label" htmlFor="current-password">Senha atual</label>
            <input id="current-password" name="currentPassword" type="password" className="input" autoComplete="current-password" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="label" htmlFor="new-password">Nova senha</label>
              <input id="new-password" name="newPassword" type="password" className="input" autoComplete="new-password" minLength={8} required />
            </div>
            <div>
              <label className="label" htmlFor="confirm-password">Confirmar nova senha</label>
              <input id="confirm-password" name="confirmPassword" type="password" className="input" autoComplete="new-password" minLength={8} required />
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Use pelo menos 8 caracteres, incluindo uma letra e um número.</p>

          {message && (
            <p role="alert" style={{ color: message.type === 'error' ? 'var(--danger-400)' : 'var(--success-400)', fontSize: '0.875rem' }}>
              {message.text}
            </p>
          )}

          <button type="submit" className="btn-primary" disabled={isPending} style={{ alignSelf: 'flex-start' }}>
            {isPending ? 'Atualizando...' : 'Atualizar senha'}
          </button>
        </form>
      </section>
    </div>
  )
}
