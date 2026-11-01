/**
 * Minimal Gemini REST client, used for generation and transcription when no
 * Anthropic / Whisper-style key is present. Plain fetch, no SDK dependency.
 */

const BASE = 'https://generativelanguage.googleapis.com'

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export class GeminiError extends Error {}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

function key() {
  const k = process.env.GEMINI_API_KEY
  if (!k) throw new GeminiError('GEMINI_API_KEY is not set')
  return k
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } } | { file_data: { mime_type: string; file_uri: string } }

export async function geminiGenerate(opts: { system?: string; parts: Part[]; maxTokens: number }): Promise<string> {
  const res = await fetch(`${BASE}/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents: [{ role: 'user', parts: opts.parts }],
      // Thinking models spend output tokens on reasoning, so leave headroom above the visible budget.
      generationConfig: { maxOutputTokens: opts.maxTokens + 8192 },
    }),
  })
  const raw = await res.text()
  if (!res.ok) throw new GeminiError(`Gemini request failed (${res.status}): ${raw.slice(0, 300)}`)

  let json: any
  try {
    json = JSON.parse(raw)
  } catch {
    throw new GeminiError('Gemini returned an unreadable response')
  }
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? []
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim()
}

// Inline requests are capped at 20 MB including base64 overhead; larger audio goes through the Files API.
const INLINE_LIMIT = 14 * 1024 * 1024

export async function audioPart(file: File): Promise<Part> {
  const mime = (file.type || 'audio/webm').split(';')[0]
  const bytes = await file.arrayBuffer()
  if (bytes.byteLength <= INLINE_LIMIT) {
    return { inline_data: { mime_type: mime, data: Buffer.from(bytes).toString('base64') } }
  }

  const start = await fetch(`${BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key(),
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Header-Content-Type': mime,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: file.name || 'audio' } }),
  })
  const uploadUrl = start.headers.get('x-goog-upload-url')
  if (!start.ok || !uploadUrl) throw new GeminiError(`Gemini file upload could not start (${start.status})`)

  const done = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: bytes,
  })
  const json = await done.json().catch(() => null)
  const uri = json?.file?.uri
  if (!done.ok || !uri) throw new GeminiError(`Gemini file upload failed (${done.status})`)
  return { file_data: { mime_type: json.file.mimeType || mime, file_uri: uri } }
}
