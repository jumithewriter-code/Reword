import { NextResponse } from 'next/server'
import { bad, errorMessage, isResponse, requireUser } from '@/lib/api'
import { createMemory } from '@/lib/onevoice'

type Params = { params: Promise<{ id: string }> }

/**
 * The approval gate required by AI-5. An edit-derived suggestion becomes a
 * memory here and nowhere else.
 */
export async function POST(request: Request, { params }: Params) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx
  const { id } = await params

  const body = await request.json().catch(() => null)
  const action = body?.action
  if (action !== 'approve' && action !== 'reject') return bad('action must be approve or reject')

  const { data: suggestion, error } = await supabase
    .from('memory_suggestions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (error || !suggestion) return bad('Suggestion not found', 404)
  if (suggestion.status !== 'pending') return bad('That suggestion was already handled')

  try {
    let memory = null
    if (action === 'approve') {
      memory = await createMemory(supabase, userId, suggestion.content, 'approved_suggestion')
    }
    await supabase
      .from('memory_suggestions')
      .update({ status: action === 'approve' ? 'approved' : 'rejected' })
      .eq('id', id)
      .eq('user_id', userId)

    return NextResponse.json({ ok: true, memory })
  } catch (err) {
    return bad(errorMessage(err), 500)
  }
}
