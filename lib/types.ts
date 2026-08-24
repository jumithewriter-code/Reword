export const outputKinds = ['linkedin_blog', 'x_thread', 'instagram_facebook', 'tiktok_reels'] as const
export type OutputKind = (typeof outputKinds)[number]

export type User = {
  id: string; email: string; name: string; passwordHash?: string; googleId?: string
  niche?: string; audience?: string; tone?: string; writingSample?: string
  onboardingComplete: boolean; mindsId?: string; createdAt: string
}
export type Memory = { id: string; userId: string; content: string; source: 'onboarding' | 'explicit' | 'edit'; remoteId?: string; createdAt: string; updatedAt: string }
export type Suggestion = { id: string; userId: string; projectId: string; content: string; status: 'pending' | 'approved' | 'dismissed'; createdAt: string }
export type Project = {
  id: string; userId: string; title: string; transcript: string; outputs: Partial<Record<OutputKind, string>>
  saved: boolean; sourceType: 'recording' | 'upload' | 'text'; createdAt: string; updatedAt: string
}
export type Database = { users: User[]; memories: Memory[]; suggestions: Suggestion[]; projects: Project[] }

export const outputLabels: Record<OutputKind, string> = {
  linkedin_blog: 'LinkedIn / Blog', x_thread: 'X thread',
  instagram_facebook: 'Instagram / Facebook', tiktok_reels: 'TikTok / Reels script',
}
