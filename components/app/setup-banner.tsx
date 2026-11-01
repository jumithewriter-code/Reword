import { AlertTriangle } from 'lucide-react'

const LABELS: Record<string, string> = {
  supabase: 'Supabase (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)',
  generation: 'Generation (ANTHROPIC_API_KEY, or GEMINI_API_KEY as a fallback)',
  minds: 'Minds / OneVoice (MINDS_API_KEY)',
  transcription: 'Transcription (GROQ_API_KEY, DEEPGRAM_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY)',
}

/** Makes a half-configured environment obvious instead of failing at click time. */
export function SetupBanner({ status }: { status: Record<string, boolean> }) {
  const missing = Object.entries(status)
    .filter(([, ok]) => !ok)
    .map(([key]) => LABELS[key] ?? key)

  if (!missing.length) return null

  return (
    <div className="mb-8 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300">
      <AlertTriangle size={17} className="mt-0.5 shrink-0" />
      <div className="text-sm leading-6">
        <p className="font-medium">Setup incomplete</p>
        <p className="mt-1 text-[13px] opacity-90">
          Add the following to <code className="font-mono">.env.local</code> and restart the dev server:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] opacity-90">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
