import { NextResponse } from 'next/server'
import { bad, isResponse, requireUser } from '@/lib/api'

/** Start a project from a pasted transcript instead of audio. */
export async function POST(request: Request) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx

  const body = await request.json().catch(() => null)
  const transcript = typeof body?.transcript === 'string' ? body.transcript.trim() : ''
  if (!transcript) return bad('Paste a transcript first')
  const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : 'Untitled project'

  // The schema only allows 'record' | 'upload'; a pasted transcript has no audio, so it is filed as an upload.
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, title, source_type: 'upload', transcript, saved: false })
    .select()
    .single()

  if (error) return bad(error.message, 500)
  return NextResponse.json({ project })
}
