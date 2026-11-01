import { redirect } from 'next/navigation'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

/**
 * Shared loader for every signed-in page: resolves the user, their profile and
 * the pending-suggestion count used by the OneVoice badge. Sends users who have
 * not finished onboarding to /onboarding (scope 3.1).
 */
export async function loadSession({ requireOnboarded = true } = {}) {
  // Without credentials there is no session to load; the login page explains why.
  if (!isSupabaseConfigured()) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()

  if (requireOnboarded && !profile?.onboarded) redirect('/onboarding')

  const { count } = await supabase
    .from('memory_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pending')

  return {
    supabase,
    user,
    profile: (profile ?? null) as Profile | null,
    pendingSuggestions: count ?? 0,
  }
}
