import type { FormatId } from '@/lib/formats'

export type Profile = {
  id: string
  email: string | null
  name: string | null
  niche: string | null
  audience: string | null
  tone: string | null
  writing_sample: string | null
  onboarded: boolean
  plan: 'free' | 'creator' | 'studio'
  theme: string
  language: string
  minds_name: string | null
}

export type Project = {
  id: string
  user_id: string
  title: string
  source_type: 'record' | 'upload'
  audio_path: string | null
  duration_sec: number | null
  transcript: string
  saved: boolean
  created_at: string
  updated_at: string
}

export type Output = {
  id: string
  project_id: string
  user_id: string
  format: FormatId
  content: string
  generated_content: string
  edited: boolean
  updated_at: string
}

export type MemorySource = 'onboarding' | 'explicit' | 'approved_suggestion' | 'manual'

export type Memory = {
  id: string
  user_id: string
  content: string
  source: MemorySource
  created_at: string
  updated_at: string
}

export type MemorySuggestion = {
  id: string
  user_id: string
  project_id: string | null
  format: string | null
  content: string
  rationale: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
