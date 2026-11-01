import { NextResponse } from 'next/server'
import { bad, errorMessage, isResponse, requireUser } from '@/lib/api'
import { createMemory, listMemories, listPendingSuggestions } from '@/lib/onevoice'

export async function GET() {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  try {
    const [memories, suggestions] = await Promise.all([
      listMemories(ctx.supabase, ctx.userId),
      listPendingSuggestions(ctx.supabase, ctx.userId),
    ])
    return NextResponse.json({ memories, suggestions })
  } catch (err) {
    return bad(errorMessage(err), 500)
  }
}

/** Explicit "Remember this preference" and manual additions (scope 3.4). */
export async function POST(request: Request) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx

  const body = await request.json().catch(() => null)
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) return bad('content is required')
  if (content.length > 500) return bad('Keep a memory under 500 characters')

  const source = body?.source === 'explicit' ? 'explicit' : 'manual'
  try {
    const memory = await createMemory(ctx.supabase, ctx.userId, content, source)
    return NextResponse.json({ memory })
  } catch (err) {
    return bad(errorMessage(err), 500)
  }
}
