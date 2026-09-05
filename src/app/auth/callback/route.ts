import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const destination = next === '/reset-password' ? next : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth_callback', request.url))
    }
  }

  const response = NextResponse.redirect(new URL(destination, request.url))
  if (destination === '/reset-password') {
    response.cookies.set('password_recovery', '1', {
      httpOnly: true,
      maxAge: 600,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }
  return response
}
