/**
 * MindsHub client — the OneVoice memory backend (scope AI-3).
 *
 * Minds Cloud (mdb.ai) has become MindsHub. The old management API — creating a
 * "mind" bound to datasources — no longer exists: `/minds`, `/datasources` and
 * `/projects/{p}/minds` all return 404 on the live service. What MindsHub now
 * exposes is an OpenAI-compatible inference gateway at api.mindshub.ai/v1.
 *
 * So OneVoice uses MindsHub as the retrieval brain over the caller's own
 * memories, and Supabase remains the store. That split is also what satisfies
 * AI-4: isolation is enforced by row-level security at the database, and only
 * one user's memories are ever placed in a prompt.
 */

const DEFAULT_BASE = 'https://api.mindshub.ai/v1'

export class MindsError extends Error {
  constructor(message: string, readonly status?: number, readonly body?: string) {
    super(message)
    this.name = 'MindsError'
  }
}

export type MindsModel = {
  id: string
  label?: string
  object?: string
  enabled?: boolean
  kind?: string
}

/** Cached per warm server process so we resolve the model at most once. */
let cachedModel: string | null = null

export class MindsClient {
  private readonly base: string
  private readonly key: string

  constructor(apiKey = process.env.MINDS_API_KEY, baseUrl = process.env.MINDS_BASE_URL) {
    if (!apiKey) throw new MindsError('MINDS_API_KEY is not set')
    this.key = apiKey
    this.base = (baseUrl || DEFAULT_BASE).replace(/\/+$/, '')
  }

  static isConfigured() {
    return Boolean(process.env.MINDS_API_KEY)
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers || {}),
      },
      cache: 'no-store',
    })

    const text = await res.text()
    if (!res.ok) {
      throw new MindsError(
        `MindsHub ${init.method || 'GET'} ${path} failed (${res.status})`,
        res.status,
        text.slice(0, 300),
      )
    }
    if (!text) return undefined as T
    try {
      return JSON.parse(text) as T
    } catch {
      // console.mindshub.ai serves its SPA on unknown paths, so HTML here means
      // MINDS_BASE_URL is pointing at the web app rather than the API.
      throw new MindsError(`MindsHub ${path} returned non-JSON — check MINDS_BASE_URL`, res.status, text.slice(0, 200))
    }
  }

  async listModels(): Promise<MindsModel[]> {
    const res = await this.request<{ data?: MindsModel[] }>('/models')
    return res?.data ?? []
  }

  /**
   * Accounts differ in which models they can reach, so prefer the configured
   * one, then whatever the account actually has enabled.
   */
  async resolveModel(): Promise<string> {
    if (process.env.MINDS_MODEL) return process.env.MINDS_MODEL
    if (cachedModel) return cachedModel

    const models = await this.listModels()
    // Only chat models serve /chat/completions; MindsHub also lists "decision" and embedding models.
    const enabled = models.find((m) => m.enabled && (m.kind ?? 'chat') === 'chat')
    if (!enabled) {
      throw new MindsError(
        `No MindsHub chat model is enabled for this account (saw ${models.length}). Set MINDS_MODEL to force one.`,
      )
    }
    cachedModel = enabled.id
    return cachedModel
  }

  /** OpenAI-compatible chat completion. */
  async completion(prompt: string, opts: { system?: string; maxTokens?: number } = {}): Promise<string> {
    const model = await this.resolveModel()
    const messages: { role: string; content: string }[] = []
    if (opts.system) messages.push({ role: 'system', content: opts.system })
    messages.push({ role: 'user', content: prompt })

    const res = await this.request<{ choices?: { message?: { content?: string } }[] }>('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
    })
    return res?.choices?.[0]?.message?.content?.trim() ?? ''
  }
}

/** Stable per-user label, used to tag OneVoice requests for traceability. */
export function mindNameFor(userId: string) {
  return `onevoice_${userId.replace(/-/g, '').slice(0, 24)}`
}
