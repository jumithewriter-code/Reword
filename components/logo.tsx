import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" alt="" width={28} height={28} className="size-7 rounded-lg" />
      <span className="font-semibold tracking-tight">reword</span>
    </span>
  )
}
