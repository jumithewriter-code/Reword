/**
 * The four confirmed output categories (scope 3.3).
 * WhatsApp/Telegram broadcast is deliberately absent (scope 3.3 / D-5) — do not
 * add a fifth format without a corresponding scope change.
 */
export const FORMATS = [
  {
    id: 'linkedin_blog',
    label: 'LinkedIn / Blog',
    short: 'LinkedIn',
    hint: 'Long-form, professional, structured',
    instruction:
      'Write a LinkedIn post that also works as a short blog article, 150-300 words. ' +
      'The first line is the hook: a specific claim, result or tension from what they said, under 15 words, that makes someone click "see more". ' +
      'Then develop the idea in short paragraphs of 1-3 sentences, using their real examples. ' +
      'End with a concrete takeaway or a specific question tied to the topic (not "Thoughts?"). ' +
      'Hashtags are optional, at most three, on the last line.',
  },
  {
    id: 'x_thread',
    label: 'X thread',
    short: 'X',
    hint: 'Punchy, numbered, one idea per post',
    instruction:
      'Write an X thread of 4-8 posts. Number them "1/", "2/" and so on, separated by a blank line. ' +
      'Every post must be under 270 characters and make sense on its own if quoted. ' +
      'Post 1 is the hook: the boldest specific claim from what they said, with no "a thread" or thread emoji. ' +
      'Each middle post carries exactly one point or example. ' +
      'The last post states the takeaway in one sharp line. No hashtags.',
  },
  {
    id: 'instagram_facebook',
    label: 'Instagram / Facebook',
    short: 'Instagram',
    hint: 'Warm, personal, caption-shaped',
    instruction:
      'Write an Instagram/Facebook caption, 80-200 words. ' +
      'The first line must work as a standalone preview before "more": personal, specific and curiosity-raising. ' +
      'Write warmly, as if talking to one follower, with a line break every 1-2 sentences. ' +
      'Close with a light, specific prompt to comment or save. ' +
      'Put 3-5 relevant hashtags on their own final line.',
  },
  {
    id: 'tiktok_reels',
    label: 'TikTok / Reels script',
    short: 'TikTok',
    hint: 'Spoken script with timing beats',
    instruction:
      'Write a 30-60 second TikTok/Reels script, about 90-150 spoken words. ' +
      'Format each beat as "[0:00] Spoken line", with timestamps every 5-10 seconds. ' +
      'The first 3 seconds must hook with a bold statement or a surprising specific, never "Hey guys" or "So today". ' +
      'Add one line at the top: "On-screen text: ..." for the hook. ' +
      'Write for the ear: short sentences, contractions, natural pauses. ' +
      'End with a one-line payoff, not a generic "follow for more".',
  },
] as const

export type FormatId = (typeof FORMATS)[number]['id']
export const FORMAT_IDS = FORMATS.map((f) => f.id) as FormatId[]
export const isFormatId = (v: unknown): v is FormatId =>
  typeof v === 'string' && (FORMAT_IDS as string[]).includes(v)
export const formatById = (id: string) => FORMATS.find((f) => f.id === id)
