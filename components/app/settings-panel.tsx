'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock3, Download, Link2, Palette, Sparkles, Trash2, TriangleAlert, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label, Spinner, Textarea } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { PLANS } from '@/lib/config'
import type { Profile } from '@/lib/types'

export function SettingsPanel({
  profile,
  email,
  integrations,
}: {
  profile: Profile | null
  email: string | null
  integrations: { generation: boolean; minds: boolean; transcription: boolean }
}) {
  const router = useRouter()
  const [draft, setDraft] = useState({
    name: profile?.name ?? '',
    niche: profile?.niche ?? '',
    audience: profile?.audience ?? '',
    tone: profile?.tone ?? '',
    writing_sample: profile?.writing_sample ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [working, setWorking] = useState(false)

  const plan = PLANS.find((p) => p.id === (profile?.plan ?? 'free')) ?? PLANS[0]

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Profile updated')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile')
    } finally {
      setSaving(false)
    }
  }

  async function exportData() {
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error((await res.json()).error)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reword-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }

  async function clearHistory() {
    setWorking(true)
    try {
      const res = await fetch('/api/history', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setClearOpen(false)
      toast.success(`Removed ${json.deleted} project${json.deleted === 1 ? '' : 's'}.`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not clear your history')
    } finally {
      setWorking(false)
    }
  }

  async function deleteAccount() {
    setWorking(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (!json.authRecordDeleted) {
        toast.info('Your content was deleted. The login itself needs an administrator to remove.')
      }
      window.location.href = '/login'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete your account')
      setWorking(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ------------------------------------------------------------ account */}
      <Section icon={UserRound} title="Account">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-name">Name</Label>
            <Input id="s-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" value={email ?? ''} disabled readOnly />
          </div>
          <div>
            <Label htmlFor="s-niche">Niche</Label>
            <Input id="s-niche" value={draft.niche} onChange={(e) => setDraft({ ...draft, niche: e.target.value })} maxLength={120} />
          </div>
          <div>
            <Label htmlFor="s-audience">Audience</Label>
            <Input id="s-audience" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} maxLength={120} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="s-tone">Preferred tone</Label>
            <Input id="s-tone" value={draft.tone} onChange={(e) => setDraft({ ...draft, tone: e.target.value })} maxLength={120} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="s-sample">Writing sample</Label>
            <Textarea id="s-sample" rows={5} value={draft.writing_sample} onChange={(e) => setDraft({ ...draft, writing_sample: e.target.value })} maxLength={5000} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-muted-foreground">
            Changing these does not rewrite existing OneVoice memories — manage those on the{' '}
            <Link href="/onevoice" className="text-primary hover:underline">OneVoice page</Link>.
          </p>
          <Button onClick={saveProfile} disabled={saving} className="h-9 shrink-0 gap-2 rounded-xl">
            {saving && <Spinner />} Save changes
          </Button>
        </div>
      </Section>

      {/* --------------------------------------------------------- appearance */}
      <Section icon={Palette} title="Appearance">
        <Row title="Theme" description="Light and dark are both fully supported. System follows your device.">
          <ThemeToggle />
        </Row>
      </Section>

      {/* ------------------------------------------------------- subscription */}
      <Section icon={Sparkles} title="Subscription">
        <Row title="Current plan" description={`${plan.name} · ${plan.blurb}`}>
          <Link href="/pricing">
            <Button variant={plan.id === 'free' ? 'default' : 'outline'} className="h-9 rounded-xl">
              {plan.id === 'free' ? 'Upgrade' : 'Change plan'}
            </Button>
          </Link>
        </Row>
        <Row title="Billing" description="Paid plans are presented but not yet charged in this build.">
          <ComingSoon />
        </Row>
      </Section>

      {/* -------------------------------------------------------- integrations */}
      <Section icon={Link2} title="Integrations">
        <Row title="Content generation" description="Claude (or Gemini as a fallback) writes all four formats.">
          <StatusPill ok={integrations.generation} okLabel="Connected" offLabel="Not configured" />
        </Row>
        <Row title="OneVoice memory" description="Minds stores and retrieves your voice profile.">
          <StatusPill ok={integrations.minds} okLabel="Connected" offLabel="Not configured" />
        </Row>
        <Row title="Transcription" description="Turns your audio into an editable transcript.">
          <StatusPill ok={integrations.transcription} okLabel="Connected" offLabel="Not configured" />
        </Row>
        <Row title="Publishing to social platforms" description="Reword exports and copies. Direct publishing is not part of this release.">
          <ComingSoon />
        </Row>
      </Section>

      {/* ------------------------------------------------------ data & privacy */}
      <Section icon={Download} title="Data and privacy">
        <Row title="Export your data" description="Download every project, output and memory as JSON.">
          <Button variant="outline" onClick={exportData} className="h-9 rounded-xl">Export</Button>
        </Row>
        <Row title="Clear content history" description="Deletes your projects and generated content. OneVoice memories are kept.">
          <Button variant="outline" onClick={() => setClearOpen(true)} className="h-9 rounded-xl">Clear</Button>
        </Row>
        <Row title="Data isolation" description="Your projects and memories are scoped to your account at the database level.">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 size={13} /> Always on
          </span>
        </Row>
      </Section>

      {/* ------------------------------------------------------------- danger */}
      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <TriangleAlert size={17} className="text-destructive" />
          <h2 className="text-base font-medium">Danger zone</h2>
        </div>
        <Row title="Delete account" description="Permanently removes your projects, outputs and OneVoice memories.">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="h-9 gap-2 rounded-xl">
            <Trash2 size={14} /> Delete account
          </Button>
        </Row>
      </section>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear content history"
        description="Every project and its generated content will be deleted. Your OneVoice memories stay."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setClearOpen(false)} className="h-9 rounded-xl">Cancel</Button>
          <Button variant="destructive" onClick={clearHistory} disabled={working} className="h-9 gap-2 rounded-xl">
            {working && <Spinner />} Clear everything
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account"
        description="This removes all of your content and memories. It cannot be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteOpen(false)} className="h-9 rounded-xl">Cancel</Button>
          <Button variant="destructive" onClick={deleteAccount} disabled={working} className="h-9 gap-2 rounded-xl">
            {working && <Spinner />} Delete account
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon size={17} className="text-primary" />
        <h2 className="text-base font-medium">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Row({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function ComingSoon() {
  return (
    <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
      Coming soon
    </span>
  )
}

function StatusPill({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
      <span className={ok ? 'size-1.5 rounded-full bg-accent' : 'size-1.5 rounded-full bg-muted-foreground/50'} aria-hidden />
      {ok ? okLabel : offLabel}
    </span>
  )
}
