import { NextResponse } from 'next/server'
import { bad, isResponse, requireUser } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

/** Library action: duplicate (scope 3.5). Copies the transcript and all outputs. */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx
  const { id } = await params

  const { data: source, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (error || !source) return bad('Project not found', 404)

  const { data: copy, error: insertError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: `${source.title} (copy)`.slice(0, 120),
      source_type: source.source_type,
      audio_path: source.audio_path,
      duration_sec: source.duration_sec,
      transcript: source.transcript,
      saved: source.saved,
    })
    .select()
    .single()
  if (insertError) return bad(insertError.message, 500)

  const { data: outputs } = await supabase.from('outputs').select('*').eq('project_id', id).eq('user_id', userId)
  if (outputs?.length) {
    await supabase.from('outputs').insert(
      outputs.map((o) => ({
        project_id: copy.id,
        user_id: userId,
        format: o.format,
        content: o.content,
        generated_content: o.generated_content,
        edited: o.edited,
      })),
    )
  }

  return NextResponse.json({ project: copy })
}
