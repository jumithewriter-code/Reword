# Reword

Reword turns recorded or uploaded audio into four editable content formats while preserving an explicitly approved OneVoice profile.

## Included MVP flows

- Email/password and Google authentication
- Onboarding for name, niche, audience, tone, and writing sample
- Browser recording with live transcript; Deepgram upload transcription
- Editable transcript followed by exactly four Gemini-generated formats
- Per-format editing, copying, regeneration, and plain-text export
- Consent-gated edit learning: suggestions are never persisted until approved
- Local private OneVoice profiles with visible add/edit/delete controls and optional Minds synchronization
- Save-controlled Content Library with open, rename, duplicate, delete, and regenerate
- Functional light/dark themes and a coherent pricing/upgrade experience

Scheduling and direct publishing are intentionally absent.

## Run locally

1. Copy `.env.example` to `.env.local` and fill the desired integrations.
2. Run `npm install`.
3. Run `npm run db:migrate` to initialize the local data directory.
4. Run `npm run dev` and open `http://localhost:3000`.

Email/password auth and deterministic sample generation work without external keys. Live generation uses `GEMINI_API_KEY` by default; Claude remains available by setting `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY`. OneVoice always persists approved memories locally; a Minds key only adds optional remote synchronization. Uploaded audio requires `DEEPGRAM_API_KEY`. Google login requires a Web OAuth client with the callback URL shown in `.env.example`.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

The file-backed development store writes atomically and scopes every project, memory, and suggestion query to the authenticated user. For horizontally scaled production deployment, replace `lib/db.ts` with a transactional managed database adapter while preserving its interface.
