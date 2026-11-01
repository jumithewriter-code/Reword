import { Shell } from '@/components/app/shell'
import { SettingsPanel } from '@/components/app/settings-panel'
import { loadSession } from '@/lib/page-data'
import { integrationStatus } from '@/lib/config'

export const metadata = { title: 'Settings — Reword' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const { user, profile, pendingSuggestions } = await loadSession()
  const status = integrationStatus()

  return (
    <Shell profile={profile} email={user.email ?? null} pendingSuggestions={pendingSuggestions}>
      <main className="animate-in-page mx-auto w-full max-w-3xl px-5 py-8 md:px-9 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            Settings<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Your account, how Reword looks, and what happens to your data.
          </p>
        </div>

        <SettingsPanel
          profile={profile}
          email={user.email ?? null}
          integrations={{ generation: status.generation, minds: status.minds, transcription: status.transcription }}
        />
      </main>
    </Shell>
  )
}
