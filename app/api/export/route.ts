import { NextResponse } from 'next/server'
import { isResponse, requireUser } from '@/lib/api'

/** Settings > Data & Privacy: download a copy of everything (scope 5). */
export async function GET() {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx

  const [profile, projects, outputs, memories] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('projects').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('outputs').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('memories').select('*').eq('user_id', userId).order('created_at'),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile.data ?? null,
    projects: projects.data ?? [],
    outputs: outputs.data ?? [],
    memories: memories.data ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="reword-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
