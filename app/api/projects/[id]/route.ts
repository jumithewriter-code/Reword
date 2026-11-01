import { NextResponse } from 'next/server'
import { bad, isResponse, requireUser } from '@/lib/api'

type Params = { params: Promise<{ id: string }> }

/** Library actions: rename, save, edit transcript (scope 3.5). */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (!body) return bad('Expected a JSON body')

  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string') {
    const title = body.title.trim().slice(0, 120)
    if (!title) return bad('Title cannot be empty')
    patch.title = title
  }
  if (typeof body.transcript === 'string') patch.transcript = body.transcript
  if (typeof body.saved === 'boolean') patch.saved = body.saved
  if (!Object.keys(patch).length) return bad('Nothing to update')

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ project: data })
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx
  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('audio_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', userId)
  if (error) return bad(error.message, 500)

  if (project?.audio_path) {
    await supabase.storage.from('audio').remove([project.audio_path])
  }
  return NextResponse.json({ ok: true })
}
