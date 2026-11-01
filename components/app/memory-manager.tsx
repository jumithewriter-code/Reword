'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lightbulb, Pencil, Plus, Trash2, WandSparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { Memory, MemorySuggestion, MemorySource } from '@/lib/types'
import { cn } from '@/lib/utils'

const SOURCE_LABEL: Record<MemorySource, string> = {
  onboarding: 'From onboarding',
  explicit: 'You saved this',
  approved_suggestion: 'You approved this',
  manual: 'Added by you',
}

/** Full memory management: view, add, edit, delete (scope 3.4). */
export function MemoryManager({
  memories: initialMemories,
  suggestions: initialSuggestions,
  mindsConnected,
}: {
  memories: Memory[]
  suggestions: MemorySuggestion[]
  mindsConnected: boolean
}) {
  const router = useRouter()
  const [memories, setMemories] = useState(initialMemories)
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<Memory | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [deleting, setDeleting] = useState<Memory | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function add() {
    const content = draft.trim()
    if (!content) return
    setBusy('new')
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMemories((prev) => [json.memory, ...prev])
      setDraft('')
      setAdding(false)
      toast.success('Added to OneVoice')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add that memory')
    } finally {
      setBusy(null)
    }
  }

  async function saveEdit() {
    if (!editing) return
    const target = editing
    const content = editDraft.trim()
    setEditing(null)
    setBusy(target.id)
    try {
      const res = await fetch(`/api/memories/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setMemories((prev) => prev.map((m) => (m.id === target.id ? json.memory : m)))
      toast.success('Updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update that memory')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    setBusy(target.id)
    try {
      const res = await fetch(`/api/memories/${target.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setMemories((prev) => prev.filter((m) => m.id !== target.id))
      toast.success('Removed from OneVoice')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete that memory')
    } finally {
      setBusy(null)
    }
  }

  async function resolve(id: string, action: 'approve' | 'reject') {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (json.memory) setMemories((prev) => [json.memory, ...prev])
      toast.success(action === 'approve' ? 'Saved to OneVoice' : 'Dismissed')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update that suggestion')
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
        <span
          className={cn('size-2 shrink-0 rounded-full', mindsConnected ? 'bg-accent' : 'bg-muted-foreground/40')}
          aria-hidden
        />
        <span className="text-muted-foreground">
          {mindsConnected
            ? 'Minds is connected — your memories are stored and retrieved through your own isolated profile.'
            : 'Minds is not connected. Memories still work, but retrieval falls back to your database.'}
        </span>
      </div>

      {/* --------------------------------------------------- pending review */}
      {suggestions.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Lightbulb size={15} className="text-primary" />
            Waiting for your approval
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {suggestions.length}
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm leading-6">{s.content}</p>
                {s.rationale && <p className="mt-1 text-xs leading-5 text-muted-foreground">{s.rationale}</p>}
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => resolve(s.id, 'approve')} className="h-8 gap-1.5 rounded-lg text-xs">
                    <Check size={13} /> Approve
                  </Button>
                  <Button variant="outline" onClick={() => resolve(s.id, 'reject')} className="h-8 gap-1.5 rounded-lg text-xs">
                    <X size={13} /> Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- add new */}
      {adding ? (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            autoFocus
            maxLength={500}
            placeholder="Write it as a standing instruction, e.g. Keep my LinkedIn posts under 200 words."
            aria-label="New memory"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAdding(false)
                setDraft('')
              }}
              className="h-9 rounded-xl"
            >
              Cancel
            </Button>
            <Button onClick={add} disabled={!draft.trim() || busy === 'new'} className="h-9 gap-2 rounded-xl">
              {busy === 'new' ? <Spinner /> : <Plus size={15} />} Add memory
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setAdding(true)} variant="outline" className="mb-5 h-10 gap-2 rounded-xl">
          <Plus size={16} /> Add a memory
        </Button>
      )}

      {/* ---------------------------------------------------------- the list */}
      {memories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-4 grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
            <WandSparkles size={20} />
          </div>
          <p className="text-sm font-medium">OneVoice has nothing to work from yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Add a preference here, or save one from the workspace while you are editing.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {memories.map((memory) => (
            <li
              key={memory.id}
              className={cn(
                'flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition',
                busy === memory.id && 'opacity-60',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6">{memory.content}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{SOURCE_LABEL[memory.source]}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  aria-label="Edit memory"
                  onClick={() => {
                    setEditing(memory)
                    setEditDraft(memory.content)
                  }}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Pencil size={15} />
                </button>
                <button
                  aria-label="Delete memory"
                  onClick={() => setDeleting(memory)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit memory">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveEdit()
          }}
        >
          <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={3} autoFocus maxLength={500} aria-label="Memory" />
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)} className="h-9 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={!editDraft.trim()} className="h-9 rounded-xl">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete memory"
        description="OneVoice will stop applying this preference to new content."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)} className="h-9 rounded-xl">
            Cancel
          </Button>
          <Button variant="destructive" onClick={remove} className="h-9 rounded-xl">
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}
