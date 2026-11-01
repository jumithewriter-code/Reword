import Link from 'next/link'
import { ArrowUpRight, FileAudio, Sparkles } from 'lucide-react'
import { Shell } from '@/components/app/shell'
import { Recorder } from '@/components/app/recorder'
import { SetupBanner } from '@/components/app/setup-banner'
import { loadSession } from '@/lib/page-data'
import { integrationStatus } from '@/lib/config'

export const metadata = { title: 'Studio — Reword' }
export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  const { supabase, user, profile, pendingSuggestions } = await loadSession()
  const status = integrationStatus()

  const { data: recent } = await supabase
    .from('projects')
    .select('id, title, saved, updated_at, source_type')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(3)

  const { count: savedCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('saved', true)

  const firstName = profile?.name?.split(' ')[0] || 'there'

  return (
    <Shell profile={profile} email={user.email ?? null} pendingSuggestions={pendingSuggestions}>
      <main className="animate-in-page mx-auto w-full max-w-4xl px-5 py-8 md:px-9 md:py-12">
        <SetupBanner status={status} />

        <div className="mb-9">
          <p className="mb-3 text-sm text-primary">{today()}</p>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            {greeting()}, {firstName}
            <span className="text-primary">.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Turn the things you know into content people want to hear.
          </p>
        </div>

        <Recorder
          disabled={!status.transcription || !status.supabase}
          disabledReason={
            !status.supabase
              ? 'Connect Supabase to store your projects, then reload this page.'
              : 'Add a transcription API key to .env.local, then restart the dev server.'
          }
        />

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          <Stat label="Saved projects" value={String(savedCount ?? 0)} />
          <Stat label="Plan" value={(profile?.plan ?? 'free').replace(/^./, (c) => c.toUpperCase())} />
          <Stat label="Output formats" value="4" hint="LinkedIn · X · Instagram · TikTok" />
        </section>

        {recent && recent.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Pick up where you left off</h2>
              <Link href="/library" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                Library <ArrowUpRight size={14} />
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                      <FileAudio size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.saved ? 'In your library' : 'Not saved yet'} · {relative(p.updated_at)}
                      </span>
                    </span>
                    <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(!recent || recent.length === 0) && (
          <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles size={15} className="text-primary" />
            Your first project will appear here once you record something.
          </p>
        )}
      </main>
    </Shell>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-medium">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function today() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
