import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { AuthForm } from '@/components/auth/auth-form'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Landing page, carried over from the original Reword app: hero on the left, sign-up on the right. */
export default async function LandingPage() {
  const configured = isSupabaseConfigured()
  if (configured) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) redirect('/studio')
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative hidden overflow-hidden bg-[#0c0d0f] p-12 text-white lg:flex lg:flex-col">
        <Logo className="text-white" />
        <div className="relative z-10 my-auto max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-primary">Your voice, everywhere</p>
          <h1 className="text-6xl font-semibold leading-[1.02] tracking-[-.055em]">
            Speak once.
            <br />
            Show up everywhere.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-white/55">
            Turn a single recording into platform-ready content that still sounds unmistakably like you.
          </p>
          <div className="mt-10 flex gap-5 text-sm text-white/55">
            <span>4 formats</span>
            <span>•</span>
            <span>OneVoice memory</span>
            <span>•</span>
            <span>You stay in control</span>
          </div>
        </div>
        <div className="absolute -bottom-40 -right-28 size-[34rem] rounded-full bg-primary/25 blur-[110px]" />
      </section>

      <main className="relative flex items-center justify-center p-6 sm:p-12">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <Suspense>
            <AuthForm mode="signup" configured={configured} bare />
          </Suspense>
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms and Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
