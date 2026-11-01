/** Single place to ask "is this integration wired up?" — drives the setup banner. */
export const integrationStatus = () => ({
  supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  generation: Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY),
  minds: Boolean(process.env.MINDS_API_KEY),
  transcription: Boolean(
    process.env.GROQ_API_KEY || process.env.DEEPGRAM_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
  ),
})

export type Plan = {
  id: 'free' | 'creator' | 'studio'
  name: string
  price: number
  blurb: string
  features: readonly string[]
  cta: string
  featured?: boolean
}

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    blurb: 'Find your voice.',
    features: ['10 generations per month', 'All four content formats', 'OneVoice memory', 'Copy & export'],
    cta: 'Current plan',
  },
  {
    id: 'creator',
    name: 'Creator',
    price: 19,
    blurb: 'For people publishing every week.',
    features: ['Unlimited generations', 'Unlimited projects', 'Priority transcription', 'Everything in Free'],
    cta: 'Upgrade',
    featured: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: 49,
    blurb: 'For teams and multi-brand creators.',
    features: ['Multiple OneVoice profiles', 'Scheduling (coming soon)', 'Publishing integrations (coming soon)', 'Everything in Creator'],
    cta: 'Upgrade',
  },
]

export const FREE_MONTHLY_GENERATIONS = 10
