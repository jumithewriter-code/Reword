'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Mic, Square, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/field'
import { MAX_AUDIO_BYTES } from '@/lib/transcribe'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'recording' | 'ready' | 'working' | 'paste'

/** Record inside Reword, or upload an existing file (scope 3.2). */
export function Recorder({ disabled, disabledReason }: { disabled?: boolean; disabledReason?: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState<number[]>(Array(28).fill(4))
  const [clip, setClip] = useState<{ file: File; url: string; source: 'record' | 'upload' } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (tickRef.current) clearInterval(tickRef.current)
    rafRef.current = null
    tickRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
  }, [])

  useEffect(() => () => teardown(), [teardown])

  async function startRecording() {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support in-app recording. Upload an audio file instead.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m),
      )
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        const ext = type.includes('mp4') ? 'm4a' : 'webm'
        const file = new File([blob], `recording.${ext}`, { type: type.split(';')[0] })
        setClip({ file, url: URL.createObjectURL(blob), source: 'record' })
        setPhase('ready')
        teardown()
      }
      recorder.start(250)
      recorderRef.current = recorder

      // Live level meter so the user can see the mic is actually working.
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      ctx.createMediaStreamSource(stream).connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      const draw = () => {
        analyser.getByteFrequencyData(buf)
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length
        setLevels((prev) => [...prev.slice(1), Math.max(4, Math.min(40, (avg / 255) * 52 + 4))])
        rafRef.current = requestAnimationFrame(draw)
      }
      draw()

      setSeconds(0)
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      setPhase('recording')
    } catch {
      setError('Microphone access was blocked. Allow it in your browser, or upload a file instead.')
    }
  }

  function stopRecording() {
    recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop()
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    if (file.size > MAX_AUDIO_BYTES) {
      setError('That file is larger than 25 MB. Try a shorter clip.')
      return
    }
    setClip({ file, url: URL.createObjectURL(file), source: 'upload' })
    setSeconds(0)
    setPhase('ready')
  }

  function discard() {
    if (clip) URL.revokeObjectURL(clip.url)
    setClip(null)
    setSeconds(0)
    setPhase('idle')
    setError(null)
  }

  async function submit() {
    if (!clip) return
    setPhase('working')
    setError(null)
    try {
      const form = new FormData()
      form.append('audio', clip.file)
      form.append('source', clip.source)
      if (seconds) form.append('duration', String(seconds))

      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Transcription failed')

      toast.success('Transcript ready — review it before generating.')
      router.push(`/projects/${json.project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('ready')
    }
  }

  async function submitPasted() {
    setPhase('working')
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: pasted }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not create the project')
      router.push(`/projects/${json.project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setPhase('paste')
    }
  }

  if (disabled) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Mic size={22} />
        </div>
        <p className="text-sm font-medium">Recording is not available yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{disabledReason}</p>
      </div>
    )
  }

  const errorBox = error && (
    <div className={cn('mt-5 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive')}>
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <p>{error}</p>
    </div>
  )

  if (phase === 'idle') {
    return (
      <div>
        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={startRecording}
            className="min-h-64 rounded-3xl border border-border bg-card p-7 text-left transition hover:-translate-y-1 hover:border-primary/50"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Mic size={21} />
            </span>
            <h2 className="mt-16 text-2xl font-semibold">Record in Reword</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Live browser transcription keeps the flow immediate.
            </p>
          </button>
          <label className="min-h-64 cursor-pointer rounded-3xl border border-dashed border-border bg-card p-7 transition hover:-translate-y-1 hover:border-primary">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Upload size={21} />
            </span>
            <h2 className="mt-16 text-2xl font-semibold">Upload audio</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              MP3, M4A, WAV, WebM, or another common audio format.
            </p>
            <input type="file" accept="audio/*,video/mp4" className="sr-only" onChange={onUpload} />
          </label>
          <button
            onClick={() => {
              setError(null)
              setPhase('paste')
            }}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground md:col-span-2"
          >
            Already have a transcript? Paste it instead
          </button>
        </div>
        {errorBox}
      </div>
    )
  }

  if (phase === 'paste' || (phase === 'working' && !clip)) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
        <p className="text-sm font-semibold">Paste your transcript</p>
        <p className="mt-1 text-xs text-muted-foreground">You can edit it again before generating.</p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste or type what you said."
          className="mt-5 min-h-72 w-full rounded-2xl border border-border bg-background p-4 text-sm leading-6 outline-none focus:border-primary"
        />
        <Button
          onClick={submitPasted}
          disabled={phase === 'working' || !pasted.trim()}
          className="mt-5 h-11 w-full gap-2 rounded-xl"
        >
          {phase === 'working' ? <Spinner /> : 'Create project'}
        </Button>
        <button
          onClick={() => setPhase('idle')}
          disabled={phase === 'working'}
          className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Choose another source
        </button>
        {errorBox}
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 md:p-8">

      {phase === 'recording' && (
        <div className="text-center">
          <div className="mb-6 flex h-14 items-end justify-center gap-1">
            {levels.map((h, i) => (
              <i key={i} style={{ height: h }} className="w-1.5 rounded-full bg-primary transition-all duration-75" />
            ))}
          </div>
          <p className="font-mono text-3xl tabular-nums">{formatTime(seconds)}</p>
          <p className="mt-2 text-sm text-muted-foreground">Recording — take your time.</p>
          <Button onClick={stopRecording} className="mt-6 h-11 gap-2 rounded-xl px-5">
            <Square size={15} fill="currentColor" /> Stop recording
          </Button>
        </div>
      )}

      {(phase === 'ready' || phase === 'working') && clip && (
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              {clip.source === 'upload' ? <Upload size={18} /> : <Mic size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{clip.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {clip.source === 'upload' ? 'Uploaded file' : `Recorded · ${formatTime(seconds)}`} ·{' '}
                {(clip.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={discard}
              disabled={phase === 'working'}
              aria-label="Discard audio"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <audio src={clip.url} controls className="mt-4 w-full" />

          <Button onClick={submit} disabled={phase === 'working'} className="mt-5 h-11 w-full gap-2 rounded-xl">
            {phase === 'working' ? (
              <>
                <Spinner /> Transcribing…
              </>
            ) : (
              'Transcribe and continue'
            )}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            You will review the transcript before anything is generated.
          </p>
        </div>
      )}

      {errorBox}
    </div>
  )
}

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
