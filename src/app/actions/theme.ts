'use server'

import { cookies } from 'next/headers'
import { isThemePreference, THEME_COOKIE, type ThemePreference } from '@/lib/theme'

// This action only changes the caller's browser preference; it accesses no account data.
export async function saveThemePreference(preference: ThemePreference) {
  if (!isThemePreference(preference)) throw new Error('Tema inválido.')

  const cookieStore = await cookies()
  cookieStore.set(THEME_COOKIE, preference, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}
