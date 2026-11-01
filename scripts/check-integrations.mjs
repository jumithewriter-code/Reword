#!/usr/bin/env node
/**
 * Verifies every external integration with a real call, so a bad key is caught
 * here rather than halfway through the creation flow.
 *
 *   node scripts/check-integrations.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Minimal .env.local loader (no dependency on Next's runtime).
try {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
} catch {
  console.log('No .env.local found — reading from the environment only.\n')
}

const results = []
const record = (name, ok, detail) => results.push({ name, ok, detail })

// ------------------------------------------------------------------ supabase
async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return record('Supabase', false, 'NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY not set')

  try {
    const health = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, { headers: { apikey: key } })
    if (!health.ok) return record('Supabase', false, `auth health returned ${health.status}`)

    // Confirm the schema has actually been applied.
    const tableRes = await fetch(`${url.replace(/\/$/, '')}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (tableRes.status === 404) {
      return record('Supabase', false, 'Reachable, but the schema is missing — run supabase/schema.sql')
    }
    record('Supabase', true, 'reachable, schema present')
  } catch (err) {
    record('Supabase', false, err.message)
  }
}

// -------------------------------------------------------------------- claude
async function checkClaude() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    if (process.env.GEMINI_API_KEY) return checkGemini('Generation (Gemini)')
    return record('Claude', false, 'ANTHROPIC_API_KEY not set (and no GEMINI_API_KEY fallback)')
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
      }),
    })
    const json = await res.json()
    if (!res.ok) return record('Claude', false, json?.error?.message || `HTTP ${res.status}`)
    const text = (json.content ?? []).map((b) => b.text).join('').trim()
    record('Claude', true, `${model} responded "${text}"`)
  } catch (err) {
    record('Claude', false, err.message)
  }
}

// --------------------------------------------------------------------- minds
async function checkMinds() {
  const key = process.env.MINDS_API_KEY
  if (!key) return record('MindsHub (OneVoice)', false, 'MINDS_API_KEY not set')

  const base = (process.env.MINDS_BASE_URL || 'https://api.mindshub.ai/v1').replace(/\/+$/, '')
  try {
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    })
    const text = await res.text()
    if (!res.ok) return record('MindsHub (OneVoice)', false, `models HTTP ${res.status}: ${text.slice(0, 120)}`)

    let models = []
    try {
      models = JSON.parse(text).data ?? []
    } catch {
      return record('MindsHub (OneVoice)', false, `non-JSON from ${base} — check MINDS_BASE_URL`)
    }

    const enabled = models.filter((m) => m.enabled && (m.kind ?? 'chat') === 'chat')
    if (!enabled.length) {
      return record('MindsHub (OneVoice)', false, `reachable, but no model is enabled on this account (${models.length} listed)`)
    }

    // A live completion is the only proof that retrieval will actually work.
    const model = process.env.MINDS_MODEL || enabled[0].id
    const chat = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
        stream: false,
      }),
    })
    const chatJson = await chat.json().catch(() => null)
    if (!chat.ok) {
      return record('MindsHub (OneVoice)', false, `${model}: ${chatJson?.error?.message ?? `HTTP ${chat.status}`}`)
    }
    const reply = chatJson?.choices?.[0]?.message?.content?.trim() ?? ''
    record('MindsHub (OneVoice)', true, `${model} responded "${reply}"`)
  } catch (err) {
    record('MindsHub (OneVoice)', false, err.message)
  }
}

// -------------------------------------------------------------------- gemini
async function checkGemini(name) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word: ok' }] }] }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) return record(name, false, json?.error?.message || `HTTP ${res.status}`)
    const text = (json?.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim()
    record(name, true, `${model} responded "${text}"`)
  } catch (err) {
    record(name, false, err.message)
  }
}

// ------------------------------------------------------------- transcription
async function checkTranscription() {
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      })
      if (!res.ok) return record('Transcription (Groq)', false, `HTTP ${res.status}`)
      const json = await res.json()
      const has = (json.data ?? []).some((m) => m.id?.includes('whisper'))
      return record('Transcription (Groq)', true, has ? 'whisper model available' : 'connected')
    } catch (err) {
      return record('Transcription (Groq)', false, err.message)
    }
  }

  if (process.env.DEEPGRAM_API_KEY) {
    try {
      const res = await fetch('https://api.deepgram.com/v1/projects', {
        headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
      })
      return record('Transcription (Deepgram)', res.ok, res.ok ? 'connected' : `HTTP ${res.status}`)
    } catch (err) {
      return record('Transcription (Deepgram)', false, err.message)
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      })
      return record('Transcription (OpenAI)', res.ok, res.ok ? 'connected' : `HTTP ${res.status}`)
    } catch (err) {
      return record('Transcription (OpenAI)', false, err.message)
    }
  }

  if (process.env.GEMINI_API_KEY) return checkGemini('Transcription (Gemini)')

  record('Transcription', false, 'no GROQ_API_KEY / DEEPGRAM_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY set')
}

await Promise.all([checkSupabase(), checkClaude(), checkMinds(), checkTranscription()])

console.log('Integration check\n')
for (const { name, ok, detail } of results) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(24)} ${detail}`)
}
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} integrations ready.`)
process.exit(failed.length ? 1 : 0)
