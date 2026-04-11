# ListingScout

Lead-gen pipeline for revenue-share short-term-rental co-hosting. Identifies AirBNB hosts who are underperforming their market **and** showing operator-pain signals, researches their contact information, and surfaces them in a review queue.

See `docs/superpowers/specs/2026-04-11-revenue-share-cohost-lead-pipeline-design.md` for the full design.

## Architecture

Three-tier system, deliberately split so nothing scrapes from Vercel.

- **Web (Vercel, Next.js 16 + React 19):** UI, metros config, review queue, auth. Writes events to Inngest; reads state from Supabase.
- **Orchestrator (Inngest):** cron, retries, fan-out for per-metro crawls.
- **Worker (Fastify on Fly.io/Railway):** the only component that talks to AirBNB. Uses residential proxies. Runs scoring and enrichment jobs.
- **Database (Supabase):** Postgres + Auth + RLS. Single data store.

## Repo layout

```
listingscout/
├── docs/superpowers/
│   ├── specs/     # Design documents
│   └── plans/     # Implementation plans (one per sub-project)
├── supabase/migrations/   # SQL migrations (001-014)
├── src/                   # Next.js app
│   ├── app/
│   │   ├── (auth)/        # Login, signup, forgot-password
│   │   ├── (dashboard)/   # Dashboard, metros
│   │   └── api/inngest/   # Inngest serve handler
│   ├── components/
│   │   ├── ui/            # shadcn/ui primitives
│   │   ├── layout/        # Sidebar, header
│   │   └── metros/        # Metros feature components
│   ├── lib/
│   │   ├── supabase/      # Supabase clients (server, client, admin)
│   │   ├── inngest/       # Inngest client + typed sendEvent helper
│   │   └── metros/        # Metros schema + server actions
│   └── types/database.ts  # Hand-written until Supabase CLI available
└── worker/                # Fastify worker service (independent package)
    ├── src/
    │   ├── routes/        # Health check
    │   ├── inngest/       # Worker-side Inngest functions
    │   └── lib/           # Env, Supabase client
    └── tests/             # Vitest unit tests with mocked Supabase
```

## Sub-project status

- **SP1 (Foundation)** — in progress on `feature/foundation-rebuild`. Schema, Inngest wiring, worker scaffold, metros CRUD complete. Deployment and smoke test pending user operational setup.
- SP2 (Crawl pipeline) — not started
- SP3 (Review UI) — not started
- SP4 (Enrichment waterfall) — not started
- SP5 (Export + calibration) — not started

## Local development

**Web:**

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest run
npm run build        # production build
```

**Worker:**

```bash
cd worker
npm install
npm test             # vitest run (mocks Supabase — no live DB needed)
# Running the server locally requires a real .env (see worker/.env.example)
```

## Operational setup (when ready)

Sub-Project 1 is fully coded but requires web-based signups to run end-to-end. See `docs/superpowers/plans/2026-04-11-foundation-sub-project-1.md` for the exact checklist.

1. Create a Supabase project, paste migrations 011–014 into the SQL Editor
2. Create an Inngest app, copy signing + event keys
3. Create a Railway (or Fly.io) account, connect this GitHub repo, point at `worker/`
4. Set Inngest keys on Vercel + Railway env vars
5. Visit the deployed app, create a metro, click "Ping worker"

## License

MIT
