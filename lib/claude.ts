/**
 * Claude is the fixed generation service (scope AI-2): it produces the four
 * confirmed formats and supports per-format regeneration. Gemini is a fallback
 * used only when ANTHROPIC_API_KEY is absent and GEMINI_API_KEY is set.
 */
import Anthropic from '@anthropic-ai/sdk'
import { formatById, type FormatId } from '@/lib/formats'
import { geminiGenerate, isGeminiConfigured } from '@/lib/gemini'
import type { Profile } from '@/lib/types'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

export class GenerationError extends Error {}

export function generationProvider(): 'claude' | 'gemini' | null {
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  if (isGeminiConfigured()) return 'gemini'
  return null
}

export function isGenerationConfigured() {
  return generationProvider() !== null
}

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new GenerationError('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

function textOf(msg: Anthropic.Message) {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

async function complete(system: string, user: string, maxTokens: number): Promise<string> {
  const provider = generationProvider()
  if (provider === 'gemini') return geminiGenerate({ system, parts: [{ text: user }], maxTokens })
  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  return textOf(msg)
}

function voiceBlock(profile: Partial<Profile> | null, memories: string[]) {
  const lines: string[] = []
  if (profile?.name) lines.push(`Creator: ${profile.name}`)
  if (profile?.niche) lines.push(`Niche: ${profile.niche}`)
  if (profile?.audience) lines.push(`Audience: ${profile.audience}`)
  if (profile?.tone) lines.push(`Preferred tone: ${profile.tone}`)
  const profileText = lines.length ? lines.join('\n') : 'No profile details supplied.'

  const memText = memories.length
    ? memories.map((m) => `- ${m}`).join('\n')
    : 'No saved preferences yet.'

  const sample = profile?.writing_sample
    ? `\n\n<writing_sample>\n${profile.writing_sample.slice(0, 4000)}\n</writing_sample>`
    : ''

  return `<creator_profile>\n${profileText}\n</creator_profile>\n\n<onevoice_memories>\n${memText}\n</onevoice_memories>${sample}`
}

const SYSTEM = `You are the writing engine inside Reword. A creator spoke their thoughts out loud; you turn them into content they would be proud to post under their own name.

How to work:
1. Find the core. Before writing, identify the single most interesting idea in what they said: the claim, story or lesson someone would stop scrolling for. Build the piece around that. Drop tangents, filler and repetition that come naturally in speech.
2. Keep their substance. Use their actual examples, opinions, numbers and phrasing. Their best spoken lines often make the best written lines, so keep them close to verbatim. Never invent facts, statistics, names, quotes or anecdotes.
3. Sound like them, not like AI. Follow the creator profile, writing sample and OneVoice memories. The memories are standing instructions and override everything below except the rule against inventing facts.
4. Write as the creator, in first person. Never mention a transcript, recording or speaker.

Avoid these habits, which make writing sound machine-made:
- Openers like "In today's fast-paced world", "Let's dive in", "Have you ever wondered", "Here's the thing", "Picture this"
- Words like delve, leverage, unlock, elevate, game-changer, landscape, journey, navigate, harness, empower, crucial, pivotal, testament
- The "It's not X, it's Y" construction, and triplets used for rhythm ("fast, simple, and powerful")
- Em dashes. Use commas, full stops or parentheses instead.
- Emoji, unless the creator's samples or memories use them
- Ending on a generic motivational line or "What do you think?"

Prefer short sentences, concrete detail over abstraction, and plain words a smart friend would use.

Output only the finished content for the requested format. No preamble, no notes, no markdown code fences, no "Here's your post".`

export async function generateOutput(opts: {
  format: FormatId
  transcript: string
  profile: Partial<Profile> | null
  memories: string[]
}): Promise<string> {
  const format = formatById(opts.format)
  if (!format) throw new GenerationError(`Unknown format: ${opts.format}`)
  if (!opts.transcript.trim()) throw new GenerationError('Transcript is empty')

  const out = await complete(
    SYSTEM,
    `${voiceBlock(opts.profile, opts.memories)}

<transcript>
${opts.transcript}
</transcript>

<task>
${format.instruction}
</task>

Write the ${format.label} content now.`,
    2000,
  )

  if (!out) throw new GenerationError('The model returned an empty response')
  return out
}

/**
 * Edit-derived preference detection (scope 3.4). This only *proposes*; the
 * MEMORY CONTROL RULE requires the user to approve before anything persists.
 */
export async function suggestMemoriesFromEdit(opts: {
  format: FormatId
  generated: string
  edited: string
  existingMemories: string[]
}): Promise<{ content: string; rationale: string }[]> {
  if (opts.generated.trim() === opts.edited.trim()) return []
  if (!isGenerationConfigured()) return []

  const raw = await complete(
    'You analyse how a creator edited AI-generated content, and infer durable style preferences. ' +
      'Return ONLY a JSON array. Each item: {"content": string, "rationale": string}. ' +
      'content = the preference written as a standing instruction in the creator\'s voice, e.g. "Never open a post with a rhetorical question". ' +
      'rationale = one short sentence citing what changed. ' +
      'Only report preferences that are durable and would apply to future content. ' +
      'Ignore one-off factual corrections, typo fixes, and topic-specific rewrites. ' +
      'Do not repeat anything already in the existing memories. ' +
      'If there is no durable preference, return [].',
    `<existing_memories>
${opts.existingMemories.length ? opts.existingMemories.map((m) => `- ${m}`).join('\n') : '(none)'}
</existing_memories>

<format>${opts.format}</format>

<ai_generated>
${opts.generated.slice(0, 6000)}
</ai_generated>

<user_edited>
${opts.edited.slice(0, 6000)}
</user_edited>

Return the JSON array.`,
    800,
  )
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start === -1 || end === -1) return []
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p) => p && typeof p.content === 'string' && p.content.trim())
      .slice(0, 3)
      .map((p) => ({ content: String(p.content).trim(), rationale: String(p.rationale ?? '').trim() }))
  } catch {
    return []
  }
}

/** Short, human title for a project, derived from its transcript. */
export async function titleForTranscript(transcript: string): Promise<string> {
  if (!isGenerationConfigured() || !transcript.trim()) return 'Untitled project'
  try {
    const title = await complete(
      'Reply with a 2-6 word title in sentence case. No quotes, no punctuation at the end.',
      transcript.slice(0, 2000),
      40,
    )
    return title.replace(/^["']|["'.]$/g, '').slice(0, 80) || 'Untitled project'
  } catch {
    return 'Untitled project'
  }
}
