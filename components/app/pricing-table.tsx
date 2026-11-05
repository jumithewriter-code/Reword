import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLANS } from '@/lib/config'
import { cn } from '@/lib/utils'

/**
 * Payment tiers are required to be visible and coherent (scope 5 / 7). Billing is
 * not connected yet, so paid plans are shown as coming soon and cannot be chosen.
 */
export function PricingTable({ currentPlan, signedIn }: { currentPlan: string | null; signedIn: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = currentPlan === plan.id
        const isPaid = plan.price > 0
        return (
          <div
            key={plan.id}
            className={cn(
              'flex flex-col rounded-3xl border p-6 transition',
              plan.featured ? 'border-primary bg-primary/5' : 'border-border bg-card',
            )}
          >
            <div className="mb-3 flex min-h-5 gap-2">
              {plan.featured && (
                <span className="w-fit rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  Most popular
                </span>
              )}
              {isPaid && (
                <span className="w-fit rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Coming soon
                </span>
              )}
            </div>
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
              {isCurrent ? (
                <Button disabled variant="outline" className="h-10 w-full rounded-xl">
                  Current plan
                </Button>
              ) : isPaid || signedIn ? (
                <Button disabled variant="outline" className="h-10 w-full rounded-xl">
                  Coming soon
                </Button>
              ) : (
                <Link href="/signup">
                  <Button className="h-10 w-full rounded-xl">Get started</Button>
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
