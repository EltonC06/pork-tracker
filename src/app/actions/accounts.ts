'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Account Types ────────────────────────────────────────────────

export async function createAccountType(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  const icon = formData.get('icon') as string
  const color = formData.get('color') as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('account_types').insert({
    user_id: user.id,
    name,
    icon: icon || '💰',
    color: color || '#6366f1',
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/accounts')
}

export async function updateAccountType(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  const icon = formData.get('icon') as string
  const color = formData.get('color') as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('account_types')
    .update({ name, icon, color })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/accounts')
}

export async function deleteAccountType(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('account_types')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/accounts')
}

// ── Account Snapshots ────────────────────────────────────────────

export async function createSnapshot(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const account_type_id = formData.get('account_type_id') as string
  const balance = parseFloat(formData.get('balance') as string)
  const snapshot_date = formData.get('snapshot_date') as string
  const notes = formData.get('notes') as string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('account_snapshots').insert({
    user_id: user.id,
    account_type_id,
    balance,
    snapshot_date,
    notes: notes || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}

export async function deleteSnapshot(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('account_snapshots')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}
