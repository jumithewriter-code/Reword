'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Spinner } from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

export function AuthForm({
  mode: initialMode,
  configured,
  bare = false,
}: {
  mode: 'login' | 'signup'
  configured: boolean
  /** Render without the centred card, for embedding in another layout (the landing page). */
  bare?: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/studio'

  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'email' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const isSignup = mode === 'signup'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy('email')
    try {
      const supabase = createClient()
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim() || undefined },
            emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
          },
        })
        if (error) throw error
        // With email confirmation disabled, Supabase returns a session immediately.
        if (data.session) {
          router.push('/onboarding')
          router.refresh()
          return
        }
        setSent(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(next)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  async function onGoogle() {
    setError(null)
    setBusy('google')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in is not available')
      setBusy(null)
    }
  }

  if (sent) {
    return (
      <Shell bare={bare}>
        <div className="text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Mail size={22} />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Check your email</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it to finish creating
            your account.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell bare={bare}>
      <div className="mb-8">
        <p className="text-sm font-semibold text-primary">{isSignup ? 'Start creating' : 'Welcome back'}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">
          {isSignup ? 'Create your account' : 'Sign in to Reword'}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isSignup ? 'Build your voice profile in a few minutes.' : 'Your ideas are waiting.'}
        </p>
      </div>

      {!configured && (
        <div className="mb-5 flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs leading-5 text-destructive">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p>
            Supabase is not configured yet. Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{' '}
            <code className="font-mono">.env.local</code>.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {isSignup && (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              autoComplete="name"
              placeholder="Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!configured}
            />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!configured}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!configured}
          />
        </div>

        {error && (
          <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button type="submit" disabled={!configured || busy !== null} className="mt-2 h-12 w-full rounded-xl text-sm">
          {busy === 'email' ? <Spinner /> : isSignup ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onGoogle}
        disabled={!configured || busy !== null}
        className="h-12 w-full gap-2.5 rounded-xl text-sm"
      >
        {busy === 'google' ? <Spinner /> : <GoogleMark />}
        Continue with Google
      </Button>

      {bare ? (
        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? 'login' : 'signup')
            setError(null)
          }}
          className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          {isSignup ? 'Already have an account? Sign in' : 'New to Reword? Create an account'}
        </button>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? 'Already have an account? ' : 'New to Reword? '}
          <Link href={isSignup ? '/login' : '/signup'} className="text-primary hover:underline">
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      )}
    </Shell>
  )
}

function Shell({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  if (bare) return <div className="animate-in-page w-full">{children}</div>
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="mb-9">
        <Logo />
      </Link>
      <div className="animate-in-page w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-xl">
        {children}
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
