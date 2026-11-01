import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/app/onboarding-flow'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

export const metadata = { title: 'Set up your voice — Reword' }
export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (profile?.onboarded) redirect('/studio')

  return (
    <OnboardingFlow
      initial={{
        name: profile?.name ?? (user.user_metadata?.full_name as string | undefined) ?? '',
        niche: profile?.niche ?? '',
        audience: profile?.audience ?? '',
        tone: profile?.tone ?? '',
        writing_sample: profile?.writing_sample ?? '',
      }}
    />
  )
}
