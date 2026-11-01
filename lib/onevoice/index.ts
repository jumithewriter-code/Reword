/**
 * OneVoice — the user-facing name for the Minds-powered memory feature (scope 3.4).
 *
 * Storage model: Supabase is the system of record for memories (it enforces the
 * per-user isolation required by AI-4 and backs the management UI), and Minds is
 * the retrieval brain — it reads the user's own memory table through a mind that
 * is scoped to that user alone, and selects what is relevant for each generation.
 * If Minds is unreachable we fall back to passing the full memory list through,
 * so generation degrades in quality rather than failing.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { MindsClient, MindsError, mindNameFor } from '@/lib/onevoice/minds'
import type { Memory, MemorySource, Profile } from '@/lib/types'

export { MindsClient, MindsError, mindNameFor }

export type VoiceContext = {
  memories: string[]
  source: 'minds' | 'database' | 'none'
  note?: string
}

// ------------------------------------------------------------------ memories
export async function listMemories(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Memory[]
}

export async function createMemory(
  supabase: SupabaseClient,
  userId: string,
  content: string,
  source: MemorySource = 'manual',
) {
  const { data, error } = await supabase
    .from('memories')
    .insert({ user_id: userId, content: content.trim(), source })
    .select()
    .single()
  if (error) throw error
  return data as Memory
}

export async function updateMemory(supabase: SupabaseClient, id: string, content: string) {
  const { data, error } = await supabase
    .from('memories')
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Memory
}

export async function deleteMemory(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('memories').delete().eq('id', id)
  if (error) throw error
}

/**
 * Onboarding context becomes visible memories, not hidden profile fields
 * (scope 3.1 and 3.4: "Display relevant onboarding details as memories").
 */
export async function seedOnboardingMemories(
  supabase: SupabaseClient,
  userId: string,
  profile: Partial<Profile>,
) {
  const seeds: string[] = []
  if (profile.niche) seeds.push(`I create content about ${profile.niche}.`)
  if (profile.audience) seeds.push(`My audience is ${profile.audience}.`)
  if (profile.tone) seeds.push(`Write in a ${profile.tone} tone.`)
  if (profile.writing_sample && profile.writing_sample.trim().length > 40) {
    seeds.push('Match the rhythm and vocabulary of the writing sample I provided at onboarding.')
  }
  if (!seeds.length) return []

  const existing = await listMemories(supabase, userId)
  const have = new Set(existing.map((m) => m.content.toLowerCase()))
  const fresh = seeds.filter((s) => !have.has(s.toLowerCase()))
  if (!fresh.length) return []

  const { data, error } = await supabase
    .from('memories')
    .insert(fresh.map((content) => ({ user_id: userId, content, source: 'onboarding' as const })))
    .select()
  if (error) throw error
  return (data ?? []) as Memory[]
}

// ----------------------------------------------------------------- retrieval
/**
 * Ask the user's mind which stored preferences matter for this transcript.
 * Isolation (AI-4): the mind name is derived from the user id and the prompt
 * carries only that user's memories, so no cross-user context can be returned.
 */
export async function retrieveVoiceContext(
  supabase: SupabaseClient,
  userId: string,
  transcript: string,
): Promise<VoiceContext> {
  const stored = await listMemories(supabase, userId)
  const all = stored.map((m) => m.content)
  if (!all.length) return { memories: [], source: 'none' }

  if (!MindsClient.isConfigured()) {
    return { memories: all, source: 'database', note: 'MINDS_API_KEY not set' }
  }

  try {
    const client = new MindsClient()
    const answer = await client.completion(
      `These are the creator's saved OneVoice preferences:\n\n${all
        .map((m, i) => `${i + 1}. ${m}`)
        .join('\n')}\n\nThe creator is about to turn this transcript into written content:\n\n"""${transcript.slice(
        0,
        4000,
      )}"""\n\nReturn the numbers of the preferences that should be applied, most important first, as a bare comma-separated list (for example: 3,1,4). If all of them apply, list them all. Return nothing else.`,
      {
        system:
          `You are the OneVoice memory profile ${mindNameFor(userId)}, holding the style preferences of a single ` +
          'content creator. Answer only from the preferences given in the question, and reply with numbers only.',
        maxTokens: 200,
      },
    )

    const picked = Array.from(answer.matchAll(/\d+/g))
      .map((m) => Number(m[0]) - 1)
      .filter((i) => i >= 0 && i < all.length)
    const unique = Array.from(new Set(picked))
    if (!unique.length) return { memories: all, source: 'database', note: 'Minds returned no selection' }
    return { memories: unique.map((i) => all[i]), source: 'minds' }
  } catch (err) {
    // Never fail a generation because the memory service is down.
    const note = err instanceof MindsError ? err.message : 'Minds request failed'
    return { memories: all, source: 'database', note }
  }
}

// --------------------------------------------------------------- suggestions
export async function listPendingSuggestions(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('memory_suggestions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
