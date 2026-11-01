import { NextResponse } from 'next/server'
import { bad, errorMessage, isResponse, requireUser } from '@/lib/api'
import { generateOutput, isGenerationConfigured, titleForTranscript } from '@/lib/claude'
import { FORMAT_IDS, isFormatId, type FormatId } from '@/lib/formats'
import { retrieveVoiceContext } from '@/lib/onevoice'
import { FREE_MONTHLY_GENERATIONS } from '@/lib/config'

export const maxDuration = 300

/**
 * Generates the four confirmed formats, or regenerates exactly one of them
 * without touching the others (scope 3.3 / AI-2).
 */
export async function POST(request: Request) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx

  if (!isGenerationConfigured()) {
    return bad('No generation key is set (ANTHROPIC_API_KEY or GEMINI_API_KEY), so content cannot be generated yet.', 503)
  }

  const body = await request.json().catch(() => null)
  const projectId = body?.projectId
  if (typeof projectId !== 'string') return bad('projectId is required')

  const only = body?.format
  if (only !== undefined && !isFormatId(only)) return bad(`Unknown format: ${only}`)
  const targets: FormatId[] = only ? [only] : [...FORMAT_IDS]

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  if (projectError || !project) return bad('Project not found', 404)
  if (!project.transcript?.trim()) return bad('Add a transcript before generating')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  // Free-plan ceiling. Regenerating a single format is not charged again.
  if ((profile?.plan ?? 'free') === 'free' && !only) {
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString())
    if ((count ?? 0) > FREE_MONTHLY_GENERATIONS) {
      return bad(`You have used all ${FREE_MONTHLY_GENERATIONS} generations on the Free plan this month.`, 402)
    }
  }

  try {
    const voice = await retrieveVoiceContext(supabase, userId, project.transcript)

    const results = await Promise.all(
      targets.map(async (format) => {
        const content = await generateOutput({
          format,
          transcript: project.transcript,
          profile: profile ?? null,
          memories: voice.memories,
        })
        return { format, content }
      }),
    )

    const rows = results.map((r) => ({
      project_id: project.id,
      user_id: userId,
      format: r.format,
      content: r.content,
      generated_content: r.content,
      edited: false,
      updated_at: new Date().toISOString(),
    }))

    const { data: outputs, error: upsertError } = await supabase
      .from('outputs')
      .upsert(rows, { onConflict: 'project_id,format' })
      .select()
    if (upsertError) return bad(upsertError.message, 500)

    // Name the project on its first full generation.
    if (!only && (!project.title || project.title === 'Untitled project')) {
      const title = await titleForTranscript(project.transcript)
      await supabase.from('projects').update({ title }).eq('id', project.id)
      project.title = title
    }

    return NextResponse.json({
      outputs,
      project,
      voice: { source: voice.source, applied: voice.memories.length, note: voice.note ?? null },
    })
  } catch (err) {
    return bad(errorMessage(err), 502)
  }
}
