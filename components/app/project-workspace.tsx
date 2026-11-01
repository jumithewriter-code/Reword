'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookmarkCheck,
  Check,
  Copy,
  Download,
  Lightbulb,
  Pencil,
  RefreshCw,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Spinner, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { FORMATS, type FormatId } from '@/lib/formats'
import type { MemorySuggestion, Output, Project } from '@/lib/types'
import { cn } from '@/lib/utils'

type OutputMap = Partial<Record<FormatId, Output>>

export function ProjectWorkspace({
  project: initialProject,
  outputs: initialOutputs,
  suggestions: initialSuggestions,
  canGenerate,
  generateBlockedReason,
}: {
  project: Project
  outputs: Output[]
  suggestions: MemorySuggestion[]
  canGenerate: boolean
  generateBlockedReason?: string
}) {
  const router = useRouter()

  const [project, setProject] = useState(initialProject)
  const [transcript, setTranscript] = useState(initialProject.transcript)
  const [outputs, setOutputs] = useState<OutputMap>(() => toMap(initialOutputs))
  const [suggestions, setSuggestions] = useState<MemorySuggestion[]>(initialSuggestions)

  const [active, setActive] = useState<FormatId>(FORMATS[0].id)
  const [busy, setBusy] = useState<'all' | FormatId | null>(null)
  const [savingTranscript, setSavingTranscript] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState(initialProject.title)
  const [rememberOpen, setRememberOpen] = useState(false)
  const [voiceNote, setVoiceNote] = useState<string | null>(null)

  const hasOutputs = Object.keys(outputs).length > 0
  const transcriptDirty = transcript !== project.transcript

  // ------------------------------------------------------------- transcript
  const persistTranscript = useCallback(async () => {
    if (transcript === project.transcript) return
    setSavingTranscript(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setProject(json.project)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the transcript')
    } finally {
      setSavingTranscript(false)
    }
  }, [transcript, project.id, project.transcript])

  // Autosave the transcript so an edit is never lost on navigation.
  useEffect(() => {
    if (!transcriptDirty) return
    const t = setTimeout(persistTranscript, 1200)
    return () => clearTimeout(t)
  }, [transcriptDirty, persistTranscript])

  // -------------------------------------------------------------- generate
  async function generate(format?: FormatId) {
    if (!canGenerate) {
      toast.error(generateBlockedReason || 'Generation is not available')
      return
    }
    if (!transcript.trim()) {
      toast.error('Add a transcript first')
      return
    }
    await persistTranscript()

    setBusy(format ?? 'all')
    setVoiceNote(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, ...(format ? { format } : {}) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Generation failed')

      setOutputs((prev) => ({ ...prev, ...toMap(json.outputs) }))
      if (json.project) setProject((p) => ({ ...p, title: json.project.title ?? p.title }))
      if (!format) setActive(FORMATS[0].id)

      const applied = json.voice?.applied ?? 0
      setVoiceNote(
        applied > 0
          ? `OneVoice applied ${applied} ${applied === 1 ? 'memory' : 'memories'}${
              json.voice?.source === 'minds' ? ' (selected by Minds)' : ''
            }.`
          : null,
      )
      toast.success(format ? 'Regenerated.' : 'Your four formats are ready.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setBusy(null)
    }
  }

  // --------------------------------------------------------- output editing
  async function saveOutput(format: FormatId, content: string) {
    const output = outputs[format]
    if (!output) return
    setOutputs((prev) => ({ ...prev, [format]: { ...output, content } }))

    try {
      const res = await fetch(`/api/outputs/${output.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setOutputs((prev) => ({ ...prev, [format]: json.output }))
      if (json.suggestions?.length) {
        setSuggestions((prev) => [...json.suggestions, ...prev])
        toast.info('OneVoice noticed a pattern in your edit.', { description: 'Review it below to decide.' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your edit')
    }
  }

  // ------------------------------------------------------------ suggestions
  async function resolveSuggestion(id: string, action: 'approve' | 'reject') {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(action === 'approve' ? 'Saved to OneVoice.' : 'Dismissed.')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update that suggestion')
    }
  }

  async function rememberPreference(content: string) {
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source: 'explicit' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('OneVoice will remember that.')
      setRememberOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that preference')
    }
  }

  // ------------------------------------------------------------- meta edits
  async function patchProject(patch: Record<string, unknown>, successMessage?: string) {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setProject(json.project)
      if (successMessage) toast.success(successMessage)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  return (
    <main className="animate-in-page mx-auto w-full max-w-6xl px-5 py-8 md:px-9 md:py-10">
      {/* ------------------------------------------------------------ head */}
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-medium tracking-tight md:text-3xl">{project.title}</h1>
            <button
              onClick={() => {
                setTitleDraft(project.title)
                setRenaming(true)
              }}
              aria-label="Rename project"
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Pencil size={15} />
            </button>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {project.saved ? 'Saved to your library' : 'Not in your library yet'}
            {savingTranscript && ' · saving…'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setRememberOpen(true)} className="h-9 gap-2 rounded-xl">
            <Lightbulb size={15} /> Remember a preference
          </Button>
          <Button
            onClick={() => patchProject({ saved: !project.saved }, project.saved ? 'Removed from library' : 'Saved to your library')}
            variant={project.saved ? 'outline' : 'default'}
            className="h-9 gap-2 rounded-xl"
          >
            {project.saved ? <><BookmarkCheck size={15} /> Saved</> : 'Save to library'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* ------------------------------------------------------ transcript */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Transcript</h2>
            <span className="text-xs text-muted-foreground">{wordCount(transcript)} words</span>
          </div>
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onBlur={persistTranscript}
            rows={16}
            aria-label="Transcript"
            placeholder="Your transcript will appear here."
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Edit anything that came out wrong before generating — the outputs are built from this text.
          </p>

          <Button
            onClick={() => generate()}
            disabled={busy !== null || !transcript.trim()}
            className="mt-4 h-11 w-full gap-2 rounded-xl"
          >
            {busy === 'all' ? <><Spinner /> Generating four formats…</> : <><Sparkles size={16} fill="currentColor" /> {hasOutputs ? 'Regenerate all four' : 'Generate content'}</>}
          </Button>
          {!canGenerate && generateBlockedReason && (
            <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">{generateBlockedReason}</p>
          )}
          {voiceNote && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary">
              <WandSparkles size={13} /> {voiceNote}
            </p>
          )}
        </section>

        {/* --------------------------------------------------------- outputs */}
        <section className="min-w-0">
          {!hasOutputs ? (
            <div className="grid h-full min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <div>
                <div className="mx-auto mb-4 grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Sparkles size={20} />
                </div>
                <p className="text-sm font-medium">Four formats, one recording</p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  LinkedIn/Blog, an X thread, an Instagram/Facebook caption, and a TikTok/Reels script.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Output formats" className="mb-3 flex flex-wrap gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    role="tab"
                    aria-selected={active === f.id}
                    onClick={() => setActive(f.id)}
                    className={cn(
                      'rounded-xl px-3 py-2 text-xs font-medium transition',
                      active === f.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f.label}
                    {outputs[f.id]?.edited && <span className="ml-1.5 opacity-70">·edited</span>}
                  </button>
                ))}
              </div>

              {FORMATS.map((f) =>
                active === f.id ? (
                  <OutputPanel
                    key={f.id}
                    format={f}
                    output={outputs[f.id]}
                    busy={busy === f.id}
                    disabled={busy !== null}
                    projectTitle={project.title}
                    onSave={(content) => saveOutput(f.id, content)}
                    onRegenerate={() => generate(f.id)}
                  />
                ) : null,
              )}
            </>
          )}

          {suggestions.length > 0 && (
            <div className="mt-5 flex flex-col gap-3">
              {suggestions.map((s) => (
                <SuggestionCard key={s.id} suggestion={s} onResolve={resolveSuggestion} />
              ))}
            </div>
          )}
        </section>
      </div>

      <RenameModal
        open={renaming}
        value={titleDraft}
        onChange={setTitleDraft}
        onClose={() => setRenaming(false)}
        onSubmit={async () => {
          setRenaming(false)
          await patchProject({ title: titleDraft }, 'Renamed')
        }}
      />

      <RememberModal open={rememberOpen} onClose={() => setRememberOpen(false)} onSubmit={rememberPreference} />
    </main>
  )
}

// ---------------------------------------------------------------- sub-views
function OutputPanel({
  format,
  output,
  busy,
  disabled,
  projectTitle,
  onSave,
  onRegenerate,
}: {
  format: (typeof FORMATS)[number]
  output?: Output
  busy: boolean
  disabled: boolean
  projectTitle: string
  onSave: (content: string) => void
  onRegenerate: () => void
}) {
  const [draft, setDraft] = useState(output?.content ?? '')
  const [copied, setCopied] = useState(false)
  const lastSynced = useRef(output?.content ?? '')

  // Pull in server updates (a regeneration) without clobbering an active edit.
  useEffect(() => {
    const incoming = output?.content ?? ''
    if (incoming !== lastSynced.current) {
      setDraft(incoming)
      lastSynced.current = incoming
    }
  }, [output?.content])

  const dirty = draft !== (output?.content ?? '')

  async function copy() {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Your browser blocked clipboard access')
    }
  }

  function exportFile() {
    const blob = new Blob([draft], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug(projectTitle)}-${format.id}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  if (!output) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        <p>{format.label} has not been generated yet.</p>
        <Button onClick={onRegenerate} disabled={disabled} variant="outline" className="mt-4 h-9 gap-2 rounded-xl">
          {busy ? <Spinner /> : <RefreshCw size={14} />} Generate {format.short}
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{format.label}</h3>
          <p className="text-xs text-muted-foreground">{format.hint}</p>
        </div>
        <div className="flex items-center gap-1">
          <IconAction label="Copy" onClick={copy} icon={copied ? Check : Copy} />
          <IconAction label="Export as Markdown" onClick={exportFile} icon={Download} />
          <IconAction label={`Regenerate ${format.short}`} onClick={onRegenerate} icon={RefreshCw} busy={busy} disabled={disabled} />
        </div>
      </div>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => dirty && onSave(draft)}
        rows={18}
        aria-label={`${format.label} content`}
        className="font-normal"
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {charCount(draft)} characters{output.edited && ' · you edited this'}
        </p>
        {dirty && (
          <Button onClick={() => onSave(draft)} className="h-8 rounded-lg text-xs">
            Save edit
          </Button>
        )}
      </div>
    </div>
  )
}

function SuggestionCard({
  suggestion,
  onResolve,
}: {
  suggestion: MemorySuggestion
  onResolve: (id: string, action: 'approve' | 'reject') => void
}) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Lightbulb size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">OneVoice suggestion</p>
          <p className="mt-1.5 text-sm leading-6">{suggestion.content}</p>
          {suggestion.rationale && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestion.rationale}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing is saved until you approve it.
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => onResolve(suggestion.id, 'approve')} className="h-8 gap-1.5 rounded-lg text-xs">
              <Check size={13} /> Remember this
            </Button>
            <Button
              variant="outline"
              onClick={() => onResolve(suggestion.id, 'reject')}
              className="h-8 gap-1.5 rounded-lg text-xs"
            >
              <X size={13} /> No thanks
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function IconAction({
  label,
  onClick,
  icon: Icon,
  busy,
  disabled,
}: {
  label: string
  onClick: () => void
  icon: typeof Copy
  busy?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
    >
      {busy ? <Spinner className="size-3.5" /> : <Icon size={15} />}
    </button>
  )
}

function RenameModal({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean
  value: string
  onChange: (v: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Rename project">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <Input value={value} onChange={(e) => onChange(e.target.value)} autoFocus maxLength={120} aria-label="Project title" />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 rounded-xl">
            Cancel
          </Button>
          <Button type="submit" disabled={!value.trim()} className="h-9 rounded-xl">
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function RememberModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (content: string) => void
}) {
  const [value, setValue] = useState('')
  useEffect(() => {
    if (open) setValue('')
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remember this preference"
      description="Write it as a standing instruction. OneVoice will apply it to everything you generate from now on."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(value.trim())
        }}
      >
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          autoFocus
          maxLength={500}
          placeholder="Never use emoji in my LinkedIn posts."
          aria-label="Preference"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="h-9 rounded-xl">
            Cancel
          </Button>
          <Button type="submit" disabled={!value.trim()} className="h-9 rounded-xl">
            Save to OneVoice
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// -------------------------------------------------------------------- utils
function toMap(list: Output[]): OutputMap {
  return Object.fromEntries(list.map((o) => [o.format, o])) as OutputMap
}
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)
const charCount = (s: string) => s.length.toLocaleString()
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'reword'
