import { Suspense } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata = { title: 'Create your account — Reword' }

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm mode="signup" configured={isSupabaseConfigured()} />
    </Suspense>
  )
}
