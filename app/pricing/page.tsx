import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '@/components/logo'
import { PricingTable } from '@/components/app/pricing-table'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata = { title: 'Plans and pricing — Reword' }
export const dynamic = 'force-dynamic'

export default async function PricingPage() {
  let plan: string | null = null
  let signedIn = false

  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      signedIn = true
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle()
      plan = data?.plan ?? 'free'
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between px-5 py-5 md:px-9">
        <Link href={signedIn ? '/studio' : '/'} className="flex items-center gap-3">
          <ArrowLeft size={16} className="text-muted-foreground" />
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="animate-in-page mx-auto w-full max-w-5xl px-5 py-10 md:px-9 md:py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-medium tracking-tight md:text-5xl">
            Plans<span className="text-primary">.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Start free. Move up when publishing becomes a habit rather than an experiment.
          </p>
        </div>

        <PricingTable currentPlan={plan} signedIn={signedIn} />

        <p className="mx-auto mt-10 max-w-xl text-center text-xs leading-6 text-muted-foreground">
          Scheduling and direct publishing are not part of this release. Reword exports and copies your content so you
          stay in control of where it goes.
        </p>
      </main>
    </div>
  )
}
