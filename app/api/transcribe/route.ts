import { NextResponse } from 'next/server'
import { bad, errorMessage, isResponse, requireUser } from '@/lib/api'
import { ACCEPTED_AUDIO, MAX_AUDIO_BYTES, isTranscriptionConfigured, transcribe } from '@/lib/transcribe'

export const maxDuration = 300

/**
 * Record or upload (scope 3.2). Stores the audio, transcribes it, and creates an
 * unsaved project — it does not enter the Library until the user saves (scope 3.5).
 */
export async function POST(request: Request) {
  const ctx = await requireUser()
  if (isResponse(ctx)) return ctx
  const { supabase, userId } = ctx

  if (!isTranscriptionConfigured()) {
    return bad('No transcription provider is configured. Set GROQ_API_KEY, DEEPGRAM_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY.', 503)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return bad('Expected multipart form data')
  }

  const file = form.get('audio')
  const sourceType = form.get('source') === 'upload' ? 'upload' : 'record'
  const durationRaw = form.get('duration')
  const language = typeof form.get('language') === 'string' ? String(form.get('language')) : undefined

  if (!(file instanceof File)) return bad('No audio file supplied')
  if (file.size === 0) return bad('The audio file is empty')
  if (file.size > MAX_AUDIO_BYTES) return bad('Audio must be 25 MB or smaller')

  const type = (file.type || '').split(';')[0]
  if (type && !ACCEPTED_AUDIO.includes(type)) {
    return bad(`Unsupported audio type: ${type}`)
  }

  try {
    // Audio is stored under the user id, which is what the storage policy checks.
    const ext = (file.name?.split('.').pop() || 'webm').toLowerCase().slice(0, 5)
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(path, file, { contentType: file.type || 'audio/webm', upsert: false })

    // Storage problems must not block the flow; transcription is the critical part.
    const audioPath = uploadError ? null : path

    const { text } = await transcribe(file, language)
    if (!text) return bad('We could not hear anything in that audio. Try again with a clearer recording.')

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: 'Untitled project',
        source_type: sourceType,
        audio_path: audioPath,
        duration_sec: durationRaw ? Math.round(Number(durationRaw)) || null : null,
        transcript: text,
        saved: false,
      })
      .select()
      .single()

    if (error) return bad(error.message, 500)
    return NextResponse.json({ project, storageWarning: uploadError?.message ?? null })
  } catch (err) {
    return bad(errorMessage(err), 502)
  }
}
