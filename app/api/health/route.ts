import { NextResponse } from 'next/server'
import { getAiProvider } from '@/lib/ai'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await query(() => true)
    return NextResponse.json({
      ok: true,
      ai: getAiProvider(),
      persistence: process.env.DATABASE_URL ? 'postgres' : 'file',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
