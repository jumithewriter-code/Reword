import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles size={15} fill="currentColor" />
      </span>
      <span className="font-semibold tracking-tight">reword</span>
    </span>
  )
}
