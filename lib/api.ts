import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Ctx = { supabase: SupabaseClient; userId: string }

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Resolves the caller, or returns a 401 response to hand straight back. */
export async function requireUser(): Promise<Ctx | NextResponse> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return bad('Supabase is not configured on the server', 503)
  }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return bad('Not signed in', 401)
  return { supabase, userId: data.user.id }
}

export function isResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}

export function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  return 'Unexpected error'
}
