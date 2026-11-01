'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, FileAudio, MoreHorizontal, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Spinner } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

export type LibraryProject = {
  id: string
  title: string
  updated_at: string
  source_type: 'record' | 'upload'
  transcript: string
  outputCount: number
}

/** All five Library actions are required by scope 3.5 and acceptance criteria 7. */
export function LibraryList({ projects: initial }: { projects: LibraryProject[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState(initial)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [renameFor, setRenameFor] = useState<LibraryProject | null>(null)
  const [deleteFor, setDeleteFor] = useState<LibraryProject | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  async function rename() {
    if (!renameFor) return
    const target = renameFor
    setRenameFor(null)
    setBusy(target.id)
    try {
      const res = await fetch(`/api/projects/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleDraft }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setProjects((prev) => prev.map((p) => (p.id === target.id ? { ...p, title: json.project.title } : p)))
      toast.success('Renamed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed')
    } finally {
      setBusy(null)
    }
  }

  async function duplicate(project: LibraryProject) {
    setOpenMenu(null)
    setBusy(project.id)
    try {
      const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Duplicated')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Duplicate failed')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!deleteFor) return
    const target = deleteFor
    setDeleteFor(null)
    setBusy(target.id)
    try {
      const res = await fetch(`/api/projects/${target.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setProjects((prev) => prev.filter((p) => p.id !== target.id))
      toast.success('Deleted')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(null)
    }
  }

  async function regenerate(project: LibraryProject) {
    setOpenMenu(null)
    setBusy(project.id)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Regenerated with your current OneVoice memories.')
      router.push(`/projects/${project.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Regeneration failed')
    } finally {
      setBusy(null)
    }
  }

  if (!projects.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
        <div className="mx-auto mb-4 grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
          <FileAudio size={20} />
        </div>
        <p className="text-sm font-medium">Your library is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          Projects appear here once you select <span className="text-foreground">Save to library</span> in the workspace.
        </p>
        <Link href="/studio">
          <Button className="mt-5 h-10 rounded-xl">Start a project</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <ul className="grid gap-3">
        {projects.map((project) => (
          <li
            key={project.id}
            className={cn(
              'relative rounded-2xl border border-border bg-card transition',
              busy === project.id && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-3 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <FileAudio size={17} />
              </span>

              <Link href={`/projects/${project.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{project.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {project.outputCount} of 4 formats · {relative(project.updated_at)}
                </span>
              </Link>

              {busy === project.id ? (
                <Spinner className="text-muted-foreground" />
              ) : (
                <div className="relative">
                  <button
                    aria-label={`Actions for ${project.title}`}
                    aria-expanded={openMenu === project.id}
                    onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal size={17} />
                  </button>

                  {openMenu === project.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden />
                      <div
                        role="menu"
                        className="absolute right-0 top-[calc(100%+4px)] z-20 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-2xl"
                      >
                        <MenuItem href={`/projects/${project.id}`} icon={FileAudio} label="Open" />
                        <MenuItem
                          icon={Pencil}
                          label="Rename"
                          onClick={() => {
                            setTitleDraft(project.title)
                            setRenameFor(project)
                            setOpenMenu(null)
                          }}
                        />
                        <MenuItem icon={Copy} label="Duplicate" onClick={() => duplicate(project)} />
                        <MenuItem icon={RefreshCw} label="Regenerate" onClick={() => regenerate(project)} />
                        <MenuItem
                          icon={Trash2}
                          label="Delete"
                          destructive
                          onClick={() => {
                            setDeleteFor(project)
                            setOpenMenu(null)
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <Modal open={Boolean(renameFor)} onClose={() => setRenameFor(null)} title="Rename project">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            rename()
          }}
        >
          <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} autoFocus maxLength={120} aria-label="Project title" />
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRenameFor(null)} className="h-9 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={!titleDraft.trim()} className="h-9 rounded-xl">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteFor)}
        onClose={() => setDeleteFor(null)}
        title="Delete project"
        description={`"${deleteFor?.title}" and its generated content will be permanently removed. This cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteFor(null)} className="h-9 rounded-xl">
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

function MenuItem({
  icon: Icon,
  label,
  onClick,
  href,
  destructive,
}: {
  icon: typeof Copy
  label: string
  onClick?: () => void
  href?: string
  destructive?: boolean
}) {
  const className = cn(
    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-muted',
    destructive ? 'text-destructive' : 'text-foreground',
  )
  if (href) {
    return (
      <Link href={href} role="menuitem" className={className}>
        <Icon size={15} /> {label}
      </Link>
    )
  }
  return (
    <button role="menuitem" onClick={onClick} className={className}>
      <Icon size={15} /> {label}
    </button>
  )
}

function relative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
