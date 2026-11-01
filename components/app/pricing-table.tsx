'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { PLANS } from '@/lib/config'
import { cn } from '@/lib/utils'

/**
 * Payment tiers are required to be visible and coherent (scope 5 / 7), while
 * billing itself stays a coming-soon area (D-4) pending the Section A decision.
 */
export function PricingTable({ currentPlan, signedIn }: { currentPlan: string | null; signedIn: boolean }) {
  const router = useRouter()
  const [chosen, setChosen] = useState<(typeof PLANS)[number] | null>(null)
  const [working, setWorking] = useState(false)

  async function activate() {
    if (!chosen) return
    setWorking(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: chosen.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`${chosen.name} plan active.`)
      setChosen(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change your plan')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id
          return (
            <div
              key={plan.id}
              className={cn(
                'flex flex-col rounded-3xl border p-6 transition',
                plan.featured ? 'border-primary bg-primary/5' : 'border-border bg-card',
              )}
            >
              {plan.featured && (
                <span className="mb-3 w-fit rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-medium">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>

              <p className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-medium">${plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </p>

              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm leading-6">
                    <Check size={15} className="mt-1 shrink-0 text-primary" />
                    <span className={cn(f.includes('coming soon') && 'text-muted-foreground')}>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {!signedIn ? (
                  <Link href="/signup">
                    <Button variant={plan.featured ? 'default' : 'outline'} className="h-10 w-full rounded-xl">
                      Get started
                    </Button>
                  </Link>
                ) : isCurrent ? (
                  <Button disabled variant="outline" className="h-10 w-full rounded-xl">
                    Current plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.featured ? 'default' : 'outline'}
                    onClick={() => setChosen(plan)}
                    className="h-10 w-full rounded-xl"
                  >
                    {plan.price === 0 ? 'Switch to Free' : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={Boolean(chosen)}
        onClose={() => setChosen(null)}
        title={`Switch to ${chosen?.name ?? ''}`}
        description="Card payments are not connected in this build. You can activate the plan now so the tier behaviour is testable end to end."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setChosen(null)} className="h-9 rounded-xl">
            Cancel
          </Button>
          <Button onClick={activate} disabled={working} className="h-9 gap-2 rounded-xl">
            {working && <Spinner />} Activate {chosen?.name}
          </Button>
        </div>
      </Modal>
    </>
  )
}
