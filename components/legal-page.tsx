import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/app/theme-toggle'

/** Contact address shown on the Privacy Policy and Terms. */
export const LEGAL_CONTACT = 'jumithewriter@gmail.com'
export const LEGAL_UPDATED = '2 November 2026'

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-5 py-5 md:px-9">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft size={16} className="text-muted-foreground" />
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="animate-in-page mx-auto w-full max-w-2xl px-5 py-10 md:py-16">
        <h1 className="text-3xl font-semibold tracking-[-.04em] md:text-5xl">
          {title}
          <span className="text-primary">.</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 leading-7 text-muted-foreground">{intro}</p>

        <div className="mt-10 space-y-10 leading-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-2 [&_p]:mt-3 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground [&_a]:text-primary [&_a]:underline">
          {children}
        </div>

        <footer className="mt-16 flex gap-5 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms and Conditions
          </Link>
        </footer>
      </main>
    </div>
  )
}
