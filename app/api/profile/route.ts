import { NextResponse } from 'next/server'
import { bad, errorMessage, isResponse, requireUser } from '@/lib/api'
import { seedOnboardingMemories } from '@/lib/onevoice'

const TEXT_FIELDS = ['name', 'niche', 'audience', 'tone', 'writing_sample', 'theme', 'language'] as const

export async function GET() {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { data, error } = await ctx.supabase.from('profiles').select('*').eq('id', ctx.userId).maybeSingle()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ profile: data })
}

/**
 * Handles onboarding (scope 3.1) and later profile edits. Completing onboarding
 * also publishes the useful context as visible OneVoice memories.
 */
export async function PATCH(request: Request) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx

  const body = await request.json().catch(() => null)
  if (!body) return bad('Expected a JSON body')

  const patch: Record<string, unknown> = {}
  for (const field of TEXT_FIELDS) {
    if (typeof body[field] === 'string') patch[field] = body[field].trim().slice(0, 5000)
  }
  if (typeof body.onboarded === 'boolean') patch.onboarded = body.onboarded
  if (body.plan === 'free' || body.plan === 'creator' || body.plan === 'studio') patch.plan = body.plan
  if (!Object.keys(patch).length) return bad('Nothing to update')
  patch.updated_at = new Date().toISOString()

  try {
    // Upsert covers the case where the auth trigger has not been installed.
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...patch }, { onConflict: 'id' })
      .select()
      .single()
    if (error) return bad(error.message, 500)

    let seeded: unknown[] = []
    if (body.onboarded === true) {
      seeded = await seedOnboardingMemories(supabase, userId, profile)
    }

    return NextResponse.json({ profile, seededMemories: seeded })
  } catch (err) {
    return bad(errorMessage(err), 500)
  }
}
