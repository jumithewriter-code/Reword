import { notFound } from 'next/navigation'
import { Shell } from '@/components/app/shell'
import { ProjectWorkspace } from '@/components/app/project-workspace'
import { loadSession } from '@/lib/page-data'
import { integrationStatus } from '@/lib/config'
import type { MemorySuggestion, Output, Project } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, profile, pendingSuggestions } = await loadSession()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!project) notFound()

  const [{ data: outputs }, { data: suggestions }] = await Promise.all([
    supabase.from('outputs').select('*').eq('project_id', id).eq('user_id', user.id),
    supabase
      .from('memory_suggestions')
      .select('*')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const status = integrationStatus()

  return (
    <Shell profile={profile} email={user.email ?? null} pendingSuggestions={pendingSuggestions}>
      <ProjectWorkspace
        project={project as Project}
        outputs={(outputs ?? []) as Output[]}
        suggestions={(suggestions ?? []) as MemorySuggestion[]}
        canGenerate={status.generation}
        generateBlockedReason={status.generation ? undefined : 'Add ANTHROPIC_API_KEY or GEMINI_API_KEY to .env.local to generate content.'}
      />
    </Shell>
  )
}
