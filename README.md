# Smart Meeting Notes Assistant

A small web app that turns a meeting transcript into a concise summary, action items, key
decisions, and a sentiment read — then lets you ask follow-up questions about the meeting in a
chat interface. Past meetings are persisted so you can revisit them.

## Features

- Input a transcript by pasting text, uploading a `.txt` file, or uploading an audio recording
  (transcribed automatically).
- Claude (Anthropic API) analyzes the transcript and returns:
  - A 3–5 bullet summary
  - Action items with owner and due date (when mentioned)
  - Key decisions made
  - A one-line sentiment/tone read
- Chat with the transcript — follow-up questions are answered using the full transcript as
  context (simple context-stuffing RAG, appropriate for single-meeting transcripts).
- Meetings are persisted to a SQLite (libSQL/Turso) database and listed in the sidebar for later.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS) — single full-stack app
- **Anthropic API** (`claude-opus-4-8`) for summarization/extraction and chat
- **Groq API** (Whisper) for audio transcription
- **libSQL / Turso** (`@libsql/client`) for persistence — SQLite that also runs as a hosted,
  serverless-friendly database (needed because Vercel's serverless functions have no writable,
  persistent local disk)

## Setup (local development)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env file and add your API keys:

   ```bash
   cp .env.example .env.local
   ```

   - `ANTHROPIC_API_KEY` — required. Get one at https://console.anthropic.com/
   - `GROQ_API_KEY` — required only if you want to use the audio-upload feature. Get a free key
     at https://console.groq.com/
   - `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — **leave both blank for local dev.** The app
     falls back to a local SQLite file at `data/meetings.db`, created automatically on first run.

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Deploying (e.g. to Vercel)

Vercel's serverless functions run on a read-only, ephemeral filesystem — a local SQLite *file*
doesn't persist there. This app uses `@libsql/client`, which speaks SQLite either as a local file
(dev) or over the network to a hosted **Turso** database (production), with no other code changes.

1. Create a free database at https://turso.tech/ (or via their CLI: `turso db create meeting-notes`).
2. Get the connection URL and an auth token:
   ```bash
   turso db show meeting-notes --url
   turso db tokens create meeting-notes
   ```
3. In your Vercel project settings, add these environment variables (same names as `.env.example`):
   - `TURSO_DATABASE_URL` — the `libsql://...` URL from step 2
   - `TURSO_AUTH_TOKEN` — the token from step 2
   - `ANTHROPIC_API_KEY`
   - `GROQ_API_KEY` (optional, for audio uploads)
4. Deploy. The schema (`meetings`, `chat_messages` tables) is created automatically on first
   request — no manual migration step needed.

## How it works

- `lib/anthropic.ts` — calls Claude with a JSON-schema-constrained response (`output_config.format`)
  to reliably get back structured summary/action items/decisions/sentiment, and a separate
  plain-text call for follow-up chat that stuffs the transcript + prior analysis + chat history
  as context. Chat responses are returned as Markdown and rendered accordingly in the UI.
- `lib/groq.ts` — sends uploaded audio to Groq's hosted Whisper model and returns the transcript
  text, which is then fed into the same analysis pipeline as pasted/`.txt` transcripts.
- `lib/db.ts` — a `@libsql/client` connection (local file in dev, Turso in production) with two
  tables: `meetings` (transcript + analysis) and `chat_messages` (per-meeting chat history).
- `app/api/meetings` — create/list meetings; `app/api/meetings/[id]` — fetch/delete a meeting;
  `app/api/meetings/[id]/chat` — ask a follow-up question.

## Notes

- This is a demo-oriented setup (no auth / single shared workspace). For a multi-user deployment
  you'd add auth and scope meetings per user.
