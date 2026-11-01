'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Library,
  LogOut,
  Settings,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/types'

const NAV = [
  { href: '/studio', label: 'Studio', icon: LayoutDashboard },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/onevoice', label: 'OneVoice', icon: WandSparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Shell({
  profile,
  email,
  pendingSuggestions = 0,
  children,
}: {
  profile: Partial<Profile> | null
  email: string | null
  pendingSuggestions?: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const current = NAV.find((n) => pathname.startsWith(n.href))?.label ?? 'Studio'
  const initials = getInitials(profile?.name, email)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ------------------------------------------------------- sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card p-5 md:flex">
        <Link href="/studio" aria-label="Reword home">
          <Logo />
        </Link>

        <Link
          href="/studio"
          className="mt-9 flex h-11 items-center justify-center gap-2.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Sparkles size={16} fill="currentColor" /> New project
        </Link>

        <nav className="mt-7 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                  active
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <Icon size={17} className={active ? 'text-primary' : ''} />
                {label}
                {label === 'OneVoice' && pendingSuggestions > 0 && (
                  <span className="ml-auto grid size-5 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {pendingSuggestions}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <Link
            href="/pricing"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <CircleHelp size={17} /> Plans &amp; pricing
          </Link>

          <div className="mt-3 flex items-center gap-3 border-t border-border pt-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{profile?.name || email || 'Your account'}</span>
              <span className="block truncate text-xs capitalize text-muted-foreground">
                {profile?.plan ?? 'free'} plan
              </span>
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                aria-label="Sign out"
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------------- main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4 md:px-9">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            Workspace <span className="px-2">/</span> <span className="text-foreground">{current}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary md:hidden">
              {initials}
            </span>
          </div>
        </header>

        {/* Mobile nav: a real disclosure, usable without hover. */}
        <div className="relative border-b border-border px-5 py-3 md:hidden">
          <button
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl bg-muted px-4 py-3 text-left text-sm"
          >
            <span>{current}</span>
            <ChevronDown size={16} className={cn('transition-transform', menuOpen && 'rotate-180')} />
          </button>
          {menuOpen && (
            <nav
              aria-label="Workspace"
              className="absolute left-5 right-5 top-[calc(100%-4px)] z-20 flex flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-2xl"
            >
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'rounded-xl px-3 py-2.5 text-sm transition',
                    pathname.startsWith(href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/pricing"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Plans &amp; pricing
              </Link>
              <form action="/auth/signout" method="post" className="contents">
                <button type="submit" className="rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted">
                  Sign out
                </button>
              </form>
            </nav>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split('@')[0] || 'You'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2)
  return letters.toUpperCase()
}
