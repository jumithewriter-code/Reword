import { Shell } from '@/components/app/shell'
import { MemoryManager } from '@/components/app/memory-manager'
import { loadSession } from '@/lib/page-data'
import { integrationStatus } from '@/lib/config'
import type { Memory, MemorySuggestion } from '@/lib/types'

export const metadata = { title: 'OneVoice — Reword' }
export const dynamic = 'force-dynamic'

export default async function OneVoicePage() {
  const { supabase, user, profile, pendingSuggestions } = await loadSession()

  const [{ data: memories }, { data: suggestions }] = await Promise.all([
    supabase.from('memories').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase
      .from('memory_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return (
    <Shell profile={profile} email={user.email ?? null} pendingSuggestions={pendingSuggestions}>
      <main className="animate-in-page mx-auto w-full max-w-3xl px-5 py-8 md:px-9 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            OneVoice<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            The preferences that make your content sound like you. Reword learns when you tell it to — and asks before
            it saves anything it noticed on its own.
          </p>
        </div>

        <MemoryManager
          memories={(memories ?? []) as Memory[]}
          suggestions={(suggestions ?? []) as MemorySuggestion[]}
          mindsConnected={integrationStatus().minds}
        />
      </main>
    </Shell>
  )
}
