import type { User } from './types'

const base = process.env.MINDS_BASE_URL || 'https://api.getminds.ai/v1'
function configured() { return Boolean(process.env.MINDS_API_KEY) }
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!configured()) throw new Error('Minds is not configured')
  const response = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${process.env.MINDS_API_KEY}`, ...init.headers }, signal: AbortSignal.timeout(120_000) })
  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(`Minds request failed (${response.status})`)
  return payload as T
}
export async function createOneVoice(user: User) {
  if (!configured()) return undefined
  const result = await request<{ data: { id: string } }>('/sparks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${user.name}'s OneVoice`, description: 'Private writing voice profile for Reword', mode: 'manual', type: 'creative', discipline: user.niche || 'Content creation', tags: ['reword', 'onevoice'], sourcePolicy: 'knowledge_only', generateImage: false }) })
  return result.data.id
}
export async function addMemory(mindsId: string | undefined, memoryId: string, content: string) {
  if (!configured() || !mindsId) return undefined
  const form = new FormData(); form.set('file', new Blob([content], { type: 'text/plain' }), `onevoice-${memoryId}.txt`); form.set('description', `OneVoice memory: ${content.slice(0, 180)}`); form.set('regeneratePrompt', 'true')
  const result = await request<{ data: { id: string } }>(`/sparks/${mindsId}/knowledge`, { method: 'POST', body: form })
  return result.data.id
}
export async function deleteMemory(mindsId?: string, remoteId?: string) { if (configured() && mindsId && remoteId) await request(`/sparks/${mindsId}/knowledge/${remoteId}`, { method: 'DELETE' }) }
export async function status(mindsId?: string) {
  if (!configured()) return { configured: false, active: false }
  if (!mindsId) return { configured: true, active: false }
  try { await request(`/sparks/${mindsId}`); return { configured: true, active: true, mindsId } } catch { return { configured: true, active: false, mindsId } }
}
