import { NextResponse } from 'next/server'
import { bad, isResponse, requireUser } from '@/lib/api'
import { suggestMemoriesFromEdit } from '@/lib/claude'
import { listMemories } from '@/lib/onevoice'

type Params = { params: Promise<{ id: string }> }

/**
 * Saves a user edit to one output (scope 3.3) and compares it with what Claude
 * originally wrote to propose a durable preference (scope 3.4).
 *
 * MEMORY CONTROL RULE: the comparison only ever writes to memory_suggestions
 * with status 'pending'. Nothing reaches the memories table without the user
 * approving it through /api/suggestions/[id].
 */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx
  const { id } = await params

  const body = await request.json().catch(() => null)
  if (typeof body?.content !== 'string') return bad('content is required')

  const { data: existing, error: readError } = await supabase
    .from('outputs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()
  if (readError || !existing) return bad('Output not found', 404)

  const content = body.content
  const edited = content.trim() !== existing.generated_content.trim()

  const { data: output, error } = await supabase
    .from('outputs')
    .update({ content, edited })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) return bad(error.message, 500)

  let suggestions: unknown[] = []
  if (body.analyze !== false && edited && existing.generated_content.trim()) {
    try {
      const memories = await listMemories(supabase, userId)
      const proposed = await suggestMemoriesFromEdit({
        format: existing.format,
        generated: existing.generated_content,
        edited: content,
        existingMemories: memories.map((m) => m.content),
      })

      if (proposed.length) {
        const { data: pending } = await supabase
          .from('memory_suggestions')
          .select('content')
          .eq('user_id', userId)
          .eq('status', 'pending')
        const seen = new Set((pending ?? []).map((p) => p.content.toLowerCase()))
        const fresh = proposed.filter((p) => !seen.has(p.content.toLowerCase()))

        if (fresh.length) {
          const { data } = await supabase
            .from('memory_suggestions')
            .insert(
              fresh.map((p) => ({
                user_id: userId,
                project_id: existing.project_id,
                format: existing.format,
                content: p.content,
                rationale: p.rationale,
                status: 'pending' as const,
              })),
            )
            .select()
          suggestions = data ?? []
        }
      }
    } catch {
      // A failed analysis must never lose the edit the user just made.
    }
  }

  return NextResponse.json({ output, suggestions })
}
