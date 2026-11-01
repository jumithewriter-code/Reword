'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Mic, Square, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/field'
import { MAX_AUDIO_BYTES } from '@/lib/transcribe'
import { cn } from '@/lib/utils'

type Phase = 'idle' | 'recording' | 'ready' | 'working'

/** Record inside Reword, or upload an existing file (scope 3.2). */
export function Recorder({ disabled, disabledReason }: { disabled?: boolean; disabledReason?: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [seconds, setSeconds] = useState(0)
  const [levels, setLevels] = useState<number[]>(Array(28).fill(4))
  const [clip, setClip] = useState<{ file: File; url: string; source: 'record' | 'upload' } | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
      {phase === 'idle' && (
        <div className="text-center">
          <button
            onClick={startRecording}
            className="group relative mx-auto grid size-20 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-105"
            aria-label="Start recording"
          >
            <span className="absolute inset-0 rounded-full bg-primary/40 opacity-0 transition group-hover:animate-pulse-ring group-hover:opacity-100" />
            <Mic size={28} />
          </button>
          <p className="mt-5 text-lg font-medium">Capture a thought</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Talk it through the way you would to a friend. Reword handles the shaping.
          </p>

          <div className="mx-auto my-6 flex max-w-xs items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <label className="mx-auto flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm transition hover:bg-muted">
            <Upload size={16} />
            Upload an audio file
            <input type="file" accept="audio/*,video/mp4" className="sr-only" onChange={onUpload} />
          </label>
        </div>
      )}

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

      {error && (
        <div className={cn('mt-5 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive')}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
