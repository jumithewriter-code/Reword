import { Shell } from '@/components/app/shell'
import { LibraryList, type LibraryProject } from '@/components/app/library-list'
import { loadSession } from '@/lib/page-data'

export const metadata = { title: 'Library — Reword' }
export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const { supabase, user, profile, pendingSuggestions } = await loadSession()

  // Only saved projects belong here (scope 3.5).
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, updated_at, source_type, transcript, outputs(id)')
    .eq('user_id', user.id)
    .eq('saved', true)
    .order('updated_at', { ascending: false })

  const list: LibraryProject[] = (projects ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    updated_at: p.updated_at,
    source_type: p.source_type,
    transcript: p.transcript,
    outputCount: Array.isArray(p.outputs) ? p.outputs.length : 0,
  }))

  return (
    <Shell profile={profile} email={user.email ?? null} pendingSuggestions={pendingSuggestions}>
      <main className="animate-in-page mx-auto w-full max-w-3xl px-5 py-8 md:px-9 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
            Library<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Everything you have saved. Open, rename, duplicate, regenerate or delete a project from its menu.
          </p>
        </div>

        <LibraryList projects={list} />
      </main>
    </Shell>
  )
}
