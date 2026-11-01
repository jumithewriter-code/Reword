import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata = { title: 'Sign in — Reword' }

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" configured={isSupabaseConfigured()} />
    </Suspense>
  )
}
