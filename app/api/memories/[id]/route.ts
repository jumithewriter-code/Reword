import { NextResponse } from 'next/server'
import { bad, errorMessage, isResponse, requireUser } from '@/lib/api'
import { deleteMemory, updateMemory } from '@/lib/onevoice'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { id } = await params

  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) return bad('content is required')

  try {
    // Ownership is enforced by RLS; this check turns a silent no-op into a 404.
    const { data: owned } = await ctx.supabase
      .from('memories')
      .select('id')
      .eq('id', id)
      .eq('user_id', ctx.userId)
      .maybeSingle()
    if (!owned) return bad('Memory not found', 404)
    return NextResponse.json({ memory: await updateMemory(ctx.supabase, id, content) })
  } catch (err) {
    return bad(errorMessage(err), 500)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { id } = await params
  try {
    await deleteMemory(ctx.supabase, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return bad(errorMessage(err), 500)
  }
}
