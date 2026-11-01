import { NextResponse } from 'next/server'
import { bad, isResponse, requireUser } from '@/lib/api'

/**
 * Settings > Data & Privacy: clear generated content history (scope 5).
 * Deletes projects and their outputs. OneVoice memories are deliberately kept —
 * they are managed separately on the OneVoice page.
 */
export async function DELETE() {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx

  const { data: projects } = await supabase.from('projects').select('audio_path').eq('user_id', userId)
  const paths = (projects ?? []).map((p) => p.audio_path).filter((p): p is string => Boolean(p))

  const { error } = await supabase.from('projects').delete().eq('user_id', userId)
  if (error) return bad(error.message, 500)

  if (paths.length) await supabase.storage.from('audio').remove(paths)
  return NextResponse.json({ ok: true, deleted: projects?.length ?? 0 })
}
