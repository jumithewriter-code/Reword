'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Hint, Input, Label, Spinner, Textarea } from '@/components/ui/field'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

const TONES = ['Warm and personal', 'Direct and punchy', 'Thoughtful and analytical', 'Playful and irreverent', 'Calm and reassuring']

type Draft = { name: string; niche: string; audience: string; tone: string; writing_sample: string }

/** Collects the confirmed onboarding fields (scope 3.1). */
export function OnboardingFlow({ initial }: { initial: Partial<Draft> }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>({
    name: initial.name ?? '',
    niche: initial.niche ?? '',
    audience: initial.audience ?? '',
    tone: initial.tone ?? '',
    writing_sample: initial.writing_sample ?? '',
  })

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const steps = [
    {
      title: 'What should we call you?',
      copy: 'This is how Reword addresses you, and how your content signs off.',
      valid: draft.name.trim().length > 0,
      body: (
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Jordan Davis" autoFocus maxLength={80} />
        </div>
      ),
    },
    {
      title: 'What do you create about?',
      copy: 'Your niche keeps the writing grounded in your world.',
      valid: draft.niche.trim().length > 0,
      body: (
        <div>
          <Label htmlFor="niche">Your niche</Label>
          <Input id="niche" value={draft.niche} onChange={(e) => set('niche', e.target.value)} placeholder="Bootstrapped SaaS and product design" autoFocus maxLength={120} />
          <Hint>A sentence fragment is plenty.</Hint>
        </div>
      ),
    },
    {
      title: 'Who are you talking to?',
      copy: 'Reword writes for this person, not for everyone.',
      valid: draft.audience.trim().length > 0,
      body: (
        <div>
          <Label htmlFor="audience">Your audience</Label>
          <Input id="audience" value={draft.audience} onChange={(e) => set('audience', e.target.value)} placeholder="Early-stage founders who ship alone" autoFocus maxLength={120} />
          <Hint>This becomes one of your first OneVoice memories.</Hint>
        </div>
      ),
    },
    {
      title: 'How should it sound?',
      copy: 'Pick the closest match. You can refine it any time in OneVoice.',
      valid: draft.tone.trim().length > 0,
      body: (
        <div>
          <Label>Preferred tone</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => set('tone', tone)}
                className={cn(
                  'rounded-xl border px-3.5 py-2.5 text-sm transition',
                  draft.tone === tone
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Show us how you write',
      copy: 'Paste something you have already published. Reword learns your rhythm from it.',
      valid: true,
      body: (
        <div>
          <Label htmlFor="sample">Writing sample</Label>
          <Textarea
            id="sample"
            value={draft.writing_sample}
            onChange={(e) => set('writing_sample', e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder="Paste a post, a newsletter section, anything in your own words."
            autoFocus
          />
          <Hint>Optional, but it makes the first generation noticeably closer to your voice.</Hint>
        </div>
      ),
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  async function finish() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, onboarded: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const seeded = json.seededMemories?.length ?? 0
      toast.success('You are all set.', {
        description: seeded ? `${seeded} memories added to OneVoice.` : undefined,
      })
      router.push('/studio')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="mb-9">
        <Logo />
      </div>

      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 shadow-xl">
        <div className="mb-6 flex gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full transition', i <= step ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>

        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">{current.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.copy}</p>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (!current.valid) return
            isLast ? finish() : setStep((s) => s + 1)
          }}
        >
          {current.body}

          <div className="mt-7 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
              className="h-10 gap-2 rounded-xl"
            >
              <ArrowLeft size={15} /> Back
            </Button>

            <Button type="submit" disabled={!current.valid || saving} className="h-10 gap-2 rounded-xl px-5">
              {saving ? <Spinner /> : isLast ? <Check size={16} /> : null}
              {isLast ? 'Finish setup' : 'Continue'}
              {!isLast && <ArrowRight size={15} />}
            </Button>
          </div>
        </form>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">Everything here becomes an editable OneVoice memory.</p>
    </div>
  )
}
