/**
 * Transcription (scope AI-1). The provider is the developer's choice and must
 * not change the user-facing flow (scope 10), so all three adapters return the
 * same shape and the provider is picked from whichever key is present.
 */
import { GEMINI_MODEL, audioPart, geminiGenerate, isGeminiConfigured } from '@/lib/gemini'

export type TranscriptionProvider = 'groq' | 'deepgram' | 'openai' | 'gemini'

export class TranscriptionError extends Error {}

export function activeProvider(): TranscriptionProvider | null {
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.DEEPGRAM_API_KEY) return 'deepgram'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (isGeminiConfigured()) return 'gemini'
  return null
}

export function isTranscriptionConfigured() {
  return activeProvider() !== null
}

export async function transcribe(file: File, language?: string): Promise<{ text: string; provider: TranscriptionProvider }> {
  const provider = activeProvider()
  if (!provider) throw new TranscriptionError('No transcription provider configured')

  switch (provider) {
    case 'groq':
      return { text: await viaOpenAiCompatible(file, language, 'https://api.groq.com/openai/v1/audio/transcriptions', process.env.GROQ_API_KEY!, process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo'), provider }
    case 'openai':
      return { text: await viaOpenAiCompatible(file, language, 'https://api.openai.com/v1/audio/transcriptions', process.env.OPENAI_API_KEY!, process.env.OPENAI_STT_MODEL || 'whisper-1'), provider }
    case 'deepgram':
      return { text: await viaDeepgram(file, language), provider }
    case 'gemini':
      return { text: await viaGemini(file, language), provider }
  }
}

async function viaOpenAiCompatible(file: File, language: string | undefined, url: string, key: string, model: string) {
  const form = new FormData()
  form.append('file', file, file.name || 'audio.webm')
  form.append('model', model)
  form.append('response_format', 'json')
  if (language && language !== 'auto') form.append('language', language)

  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
  const text = await res.text()
  if (!res.ok) throw new TranscriptionError(`Transcription failed (${res.status}): ${text.slice(0, 300)}`)
  try {
    const json = JSON.parse(text)
    return String(json.text ?? '').trim()
  } catch {
    throw new TranscriptionError('Transcription returned an unreadable response')
  }
}

async function viaDeepgram(file: File, language?: string) {
  const params = new URLSearchParams({ model: 'nova-3', smart_format: 'true', punctuate: 'true' })
  if (language && language !== 'auto') params.set('language', language)

  const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY!}`,
      'Content-Type': file.type || 'audio/webm',
    },
    body: await file.arrayBuffer(),
  })
  const text = await res.text()
  if (!res.ok) throw new TranscriptionError(`Transcription failed (${res.status}): ${text.slice(0, 300)}`)
  try {
    const json = JSON.parse(text)
    return String(json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '').trim()
  } catch {
    throw new TranscriptionError('Transcription returned an unreadable response')
  }
}

async function viaGemini(file: File, language?: string) {
  const hint = language && language !== 'auto' ? ` The audio is in language code "${language}".` : ''
  try {
    return await geminiGenerate({
      system:
        'You are a speech-to-text engine. Transcribe the audio verbatim with normal punctuation and paragraph breaks. ' +
        'Output only the transcript: no timestamps, speaker labels, headings or commentary. If there is no speech, output nothing.',
      parts: [await audioPart(file), { text: `Transcribe this recording.${hint}` }],
      maxTokens: 8000,
    })
  } catch (err) {
    throw new TranscriptionError(`Transcription failed (${GEMINI_MODEL}): ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024
export const ACCEPTED_AUDIO = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'video/mp4', 'video/webm']
