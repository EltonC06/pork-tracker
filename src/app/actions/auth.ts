'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const emailSchema = z.string().trim().email()

const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número.')

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' }
  }

  redirect('/dashboard')
}

export async function register(formData: FormData) {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const validEmail = emailSchema.safeParse(email)
  const validPassword = passwordSchema.safeParse(password)
  if (!validEmail.success) return { error: 'Informe um e-mail válido.' }
  if (!validPassword.success) return { error: validPassword.error.issues[0]?.message ?? 'Senha inválida.' }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    return { error: 'Não foi possível criar a conta. Verifique os dados e tente novamente.' }
  }

  if (data.session) redirect('/dashboard')

  return { success: 'Conta criada. Verifique seu e-mail para confirmar o cadastro.' }
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '')

  if (!emailSchema.safeParse(email).success) {
    return { error: 'Informe um e-mail válido.' }
  }

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  })

  return {
    success: 'Se existir uma conta com este e-mail, enviaremos instruções para redefinir a senha.',
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Sua sessão expirou. Solicite um novo link de recuperação.' }

  const currentPassword = String(formData.get('currentPassword') ?? '')
  const newPassword = String(formData.get('newPassword') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  const cookieStore = await cookies()
  const isRecovery = cookieStore.get('password_recovery')?.value === '1'

  const validPassword = passwordSchema.safeParse(newPassword)
  if (!validPassword.success) {
    return { error: validPassword.error.issues[0]?.message ?? 'Senha inválida.' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'A confirmação da nova senha não confere.' }
  }

  if (!isRecovery && !currentPassword) {
    return { error: 'Informe sua senha atual para continuar.' }
  }

  if (currentPassword && currentPassword === newPassword) {
    return { error: 'A nova senha deve ser diferente da senha atual.' }
  }

  if (currentPassword) {
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email ?? '',
      password: currentPassword,
    })

    if (error) return { error: 'A senha atual está incorreta.' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: 'Não foi possível atualizar a senha. Tente novamente.' }

  await supabase.auth.signOut({ scope: 'others' })
  if (isRecovery) cookieStore.delete('password_recovery')
  return { success: 'Senha atualizada com sucesso.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
