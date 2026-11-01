# Reword

Turns a recorded or uploaded thought into four platform-specific pieces of written content, in the creator's own voice.

Built to `Reword_Product_Implementation_Scope.docx`. Section references below point at that document.

---

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, Tailwind v4 | Already the project baseline |
| Auth + database + audio storage | Supabase | Email/password **and** Google in one provider; row-level security gives the per-user isolation required by AI-4 |
| Generation | Claude (`@anthropic-ai/sdk`), Gemini fallback | Claude is fixed by scope AI-2; Gemini is used only when `ANTHROPIC_API_KEY` is blank |
| OneVoice memory | MindsHub (`api.mindshub.ai/v1`) | Fixed by scope AI-3 — see the note below |
| Transcription | Groq Whisper (Deepgram / OpenAI / Gemini adapters included) | AI-1 leaves this to the developer; the user-facing flow is identical whichever is set |

---

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Create the database

Either paste [`supabase/schema.sql`](supabase/schema.sql) into the dashboard **SQL Editor**, or set
`SUPABASE_DB_URL` (Project Settings > Database > Connection string > URI) and run:

```bash
node scripts/apply-schema.mjs
```

The schema is idempotent, so re-running it is safe. It creates
`profiles`, `projects`, `outputs`, `memories` and `memory_suggestions`, enables row-level security on all of them,
creates the private `audio` storage bucket, and installs the trigger that bootstraps a profile on signup.

### 3. Environment

Copy `.env.example` to `.env.local` and fill it in:

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase > Project Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # same page, the anon/public key
ANTHROPIC_API_KEY=              # console.anthropic.com > API keys
MINDS_API_KEY=                  # console.mindshub.ai > API keys
GROQ_API_KEY=                   # console.groq.com/keys  (or DEEPGRAM_API_KEY / OPENAI_API_KEY)
GEMINI_API_KEY=                 # aistudio.google.com/apikey: fallback for generation and transcription
```

Optional:

- `ANTHROPIC_MODEL` — defaults to `claude-sonnet-5`
- `GEMINI_MODEL` — defaults to `gemini-2.5-flash`
- `MINDS_BASE_URL` — leave blank to auto-detect; set it to pin one base
- `SUPABASE_SERVICE_ROLE_KEY` — only needed for full account deletion (removing the auth record itself)

The app runs without any of these. Missing integrations surface as an in-app setup banner and disabled controls
rather than runtime crashes.

### 4. Google sign-in

Supabase > **Authentication > Providers > Google**. Supply a Google Cloud OAuth client ID and secret, and add
`https://<project-ref>.supabase.co/auth/v1/callback` as an authorised redirect URI. The button is wired and starts
working the moment the provider is enabled — no code change needed.

For local testing without email delivery, turn **off** "Confirm email" under Authentication > Sign In / Providers.

### 5. Run

```bash
pnpm dev
```

Check integration wiring at any time:

```bash
node scripts/check-integrations.mjs
```

---

## How the scope maps to the code

| Scope | Where |
| --- | --- |
| 3.1 Auth + onboarding | `app/login`, `app/signup`, `app/auth/callback`, `components/app/onboarding-flow.tsx` |
| 3.2 Record / upload / editable transcript | `components/app/recorder.tsx`, `app/api/transcribe`, `lib/transcribe.ts` |
| 3.3 Four formats, per-format regeneration | `lib/formats.ts`, `app/api/generate`, `components/app/project-workspace.tsx` |
| 3.4 OneVoice memory | `lib/onevoice/`, `app/onevoice`, `app/api/memories`, `app/api/suggestions` |
| 3.5 Content Library | `app/library`, `components/app/library-list.tsx`, `app/api/projects` |
| 3.6 Copy / export | Copy and Export buttons per output; `app/api/export` for a full data export |
| 5 Themes, tiers | `components/app/theme-toggle.tsx`, `app/pricing`, `lib/config.ts` |
| AI-4 Isolation | `supabase/schema.sql` RLS policies + `user_id` filters on every query |
| AI-5 Consent | `app/api/suggestions/[id]/route.ts` — the only path that turns a suggestion into a memory |

### A note on Minds / MindsHub

The scope names Minds as the memory service (AI-3). Since the document was written, Minds Cloud has been rebranded
to **MindsHub** and its API changed shape: `mdb.ai` now redirects to `console.mindshub.ai`, and the old management
API for creating a *mind* bound to *datasources* is gone — `/minds`, `/datasources` and `/projects/{p}/minds` all
return 404 on the live service. What MindsHub exposes today is an OpenAI-compatible inference gateway at
`https://api.mindshub.ai/v1`.

The integration is therefore real but shaped to what exists: **MindsHub performs OneVoice retrieval** — on every
generation it is given that user's memories and the transcript, and selects which preferences apply — while
Supabase stores them. Storage had to live in Postgres regardless, because that is what enforces the per-user
isolation AI-4 requires and what backs the management UI in 3.4.

Verify it any time with `node scripts/check-integrations.mjs`, which performs a live completion rather than just
checking that a key is present. If the account has more than one model enabled, pin one with `MINDS_MODEL`.

### The memory control rule

Edit-derived preferences are the one place where the product could quietly overreach, so the write path is
deliberately narrow:

1. You edit an output. `PATCH /api/outputs/[id]` saves the edit and diffs it against what Claude produced.
2. Any inferred preference is written to `memory_suggestions` with `status = 'pending'`. **Never** to `memories`.
3. `POST /api/suggestions/[id] { action: 'approve' }` is the only code path that creates an
   `approved_suggestion` memory.

Rejecting a suggestion marks it `rejected` and it is not proposed again.

---

## Deliberately not built

Per scope sections 3.6, 5 and 8:

- **Scheduling** — absent entirely, not stubbed, not shown as coming soon in the product surface.
- **Direct social publishing** — copy and export only.
- **WhatsApp / Telegram broadcast** — not one of the generated formats.
- **Settings Q24 layout** — the prior layout constraint was explicitly retired (D-6). Settings is a plain,
  always-visible list; the previous hover-to-reveal behaviour was removed.

Billing is presented but not charged (D-4). The upgrade dialog says so and activates the tier directly so the
plan-gating behaviour is testable end to end.
