import { Shell } from '@/components/app/shell'
import { Recorder } from '@/components/app/recorder'
import { SetupBanner } from '@/components/app/setup-banner'
import { loadSession } from '@/lib/page-data'
import { integrationStatus } from '@/lib/config'

export const metadata = { title: 'Studio — Reword' }
export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  const { user, profile, pendingSuggestions } = await loadSession()
  const status = integrationStatus()

  return (
    <Shell profile={profile} email={user.email ?? null} pendingSuggestions={pendingSuggestions}>
      <main className="animate-in-page mx-auto w-full max-w-5xl px-6 py-8 lg:p-12">
        <SetupBanner status={status} />

        <div className="mb-10">
          <p className="text-sm font-semibold text-primary">Create something worth sharing</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
            Capture a thought<span className="text-primary">.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Record naturally, upload an audio file, or start from a transcript. You’ll review every word before
            generation.
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
      </main>
    </Shell>
  )
}
