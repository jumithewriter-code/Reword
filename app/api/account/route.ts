import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { bad, isResponse, requireUser } from '@/lib/api'

/**
 * Deletes the account and everything in it. Content and memories are removed
 * with the user's own session (RLS applies). Removing the auth record itself
 * needs the service role, so that step is skipped when the key is absent and
 * the response says so rather than pretending it happened.
 */
export async function DELETE() {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx

  const { data: projects } = await supabase.from('projects').select('audio_path').eq('user_id', userId)
  const paths = (projects ?? []).map((p) => p.audio_path).filter((p): p is string => Boolean(p))
  if (paths.length) await supabase.storage.from('audio').remove(paths)

  await supabase.from('projects').delete().eq('user_id', userId)
  await supabase.from('memory_suggestions').delete().eq('user_id', userId)
  await supabase.from('memories').delete().eq('user_id', userId)
  await supabase.from('profiles').delete().eq('id', userId)

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let authRecordDeleted = false
  if (serviceKey && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return bad(`Data removed, but the login could not be deleted: ${error.message}`, 500)
    authRecordDeleted = true
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true, authRecordDeleted })
}
