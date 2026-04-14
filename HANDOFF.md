# ListingScout Rebuild — Project Handoff & Status

> This file captures everything needed to resume work on the ListingScout rebuild
> from any machine. Clone the repo, check out the branch, read this file.

## What this project is

ListingScout is being rebuilt from a generic STR listing scorer into a **revenue-share co-host lead pipeline**. The app identifies AirBNB hosts who are (A) underperforming their market AND (B) showing "overwhelmed solo operator" signals, enriches their contact info through a tiered waterfall, and surfaces them in a review queue for human qualification.

**Full design spec:** `docs/superpowers/specs/2026-04-11-revenue-share-cohost-lead-pipeline-design.md`

## Repo & branches

- **Repo:** `https://github.com/splendidbit/listingscout.git`
- **Working branch:** `feature/foundation-rebuild` (pushed to origin)
- **Working directory on the original machine:** `/Users/jeremiahowen/code/listingscout2` (a git worktree of `/Users/jeremiahowen/code/listingscout`)
- **Base branch:** `main`

To pick up on a new machine:
```bash
git clone https://github.com/splendidbit/listingscout.git listingscout2
cd listingscout2
git checkout feature/foundation-rebuild
npm install
cd worker && npm install && cd ..
```

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Web framework | Next.js (App Router) | 16.1.6 |
| React | React | 19.2.3 |
| Language | TypeScript | 5.9.3 |
| CSS | Tailwind CSS | 4.x |
| UI components | shadcn/ui | Radix primitives |
| Forms | React Hook Form + Zod | RHF 7.71, Zod 4.3.6 |
| Database | Supabase (PostgreSQL + Auth + RLS) | supabase-js 2.99.1 |
| Orchestration | Inngest | 4.2.1 |
| Worker server | Fastify | 5.x |
| Testing | Vitest | 4.1.4 (web), 2.1.9 (worker) |
| Deployment (web) | Vercel | — |
| Deployment (worker) | Fly.io | via GitHub Actions |
| Toasts | Sonner | — |
| Icons | Lucide React | — |

## Architecture (three tiers)

```
Vercel (Next.js)          Inngest (orchestrator)         Fly.io (worker)
┌─────────────────┐       ┌──────────────────┐          ┌─────────────────┐
│ UI + Auth       │──────▶│ Cron, retries,   │─────────▶│ Fastify server  │
│ Server actions  │       │ fan-out          │          │ AirBNB scraping │
│ /api/inngest    │       └──────────────────┘          │ Scoring         │
│ Metros CRUD     │                                     │ Enrichment      │
└────────┬────────┘                                     │ /api/inngest    │
         │                                              └────────┬────────┘
         │              ┌──────────────────┐                     │
         └──────────────┤   Supabase       │◀────────────────────┘
                        │   (Postgres)     │
                        └──────────────────┘
```

## Sub-project plan (5 total)

The rebuild is broken into 5 sequential sub-projects. Each produces working, testable software.

| SP | Name | Status | Plan file |
|----|------|--------|-----------|
| 1 | Foundation | **Code complete, deployment pending** | `docs/superpowers/plans/2026-04-11-foundation-sub-project-1.md` |
| 2 | Crawl pipeline | Not started | (to be written after SP1 is deployed) |
| 3 | Review UI | Not started | — |
| 4 | Enrichment waterfall | Not started | — |
| 5 | Export + calibration | Not started | — |

## SP1 status — what's done

20 tasks in the plan. 17 completed as code, 3 remaining (deployment + smoke test + PR).

### Completed tasks (all committed on `feature/foundation-rebuild`)

| Task | What | Commit |
|------|------|--------|
| 1 | Install Vitest + tsconfig fix | `5197255`, `42c5024` |
| 2 | Migration 011: drop old domain tables | `506da85` |
| 3 | Migration 012: core schema (metros, hosts, listings, snapshots, benchmarks) | `0c9d4f5` |
| 4 | Migration 013: user-domain (leads, events, contacts, enrichment_runs, crawl_runs) | `22ce1c8` |
| 5 | Migration 014: RLS policies | `48946a0` |
| 6 | Hand-written database TypeScript types | `df9574d` |
| 7 | Delete all old domain routes, libs, components (59 files, 12k lines removed) | `1f39d17` |
| 8-9 | Inngest SDK, client, events, /api/inngest route | `ff8f9b5` |
| 10 | Worker scaffold (package.json, tsconfig, .gitignore) | `7d578fa` |
| 11 | Worker Fastify server with /health | `9236320` |
| 12 | Worker Supabase client singleton | `942e960` |
| 13 | Worker Inngest client + ping function (v4 API) | `340bd03`, `502b41a` |
| 14 | Metros Zod schema + server actions + tests | `0a11413` |
| 15 | Metros list page | `d18c71e` |
| 16 | Metros create form + MetroForm component | `ded0e22` |
| 17 | Metros edit/detail page with ping button + crawl runs table | `ac8a85b` |
| 20 (partial) | README rewrite | `ea18948` |
| 18 (partial) | Dockerfile, fly.toml, GitHub Actions workflow | `a453760` |

### Tests passing

```
Web (root):    6 tests, 2 files (vitest 4.1.4)
Worker:        4 tests, 3 files (vitest 2.1.9)
Build:         npm run build — clean, all routes compile
TSC:           npx tsc --noEmit — clean
```

### Remaining SP1 tasks — REQUIRE YOUR ACTION

These are **operational setup steps** that cannot be automated. All are web-browser work, no local installs needed.

---

#### Task 18: Deploy worker to Fly.io

**Status:** Dockerfile + fly.toml + GitHub Actions workflow are committed. The Fly app itself does not exist yet and secrets are not set.

**What you need to do:**

1. **Create a Fly API token**
   - Go to https://fly.io → Account → Access Tokens
   - IMPORTANT: Use the **old Access Tokens page** (there's a link at the top of the new page that says "If you are looking for the old Access Tokens page, you can still access it here"). The new page only creates app-scoped tokens which can't create new apps.
   - Create an organization-level token, name it `github-actions-deploy`
   - Copy the token immediately — Fly shows it once

2. **Add token to GitHub as a repository secret**
   - Go to https://github.com/splendidbit/listingscout/settings/secrets/actions
   - "New repository secret"
   - Name: `FLY_API_TOKEN`
   - Value: paste the token

3. **Update the GitHub Action to auto-create the app**
   - The current `.github/workflows/fly-deploy-worker.yml` runs `flyctl deploy` which requires the app to already exist
   - Before `flyctl deploy`, add a step: `flyctl apps create listingscout-worker --org personal || true`
   - If `listingscout-worker` is taken, pick a different name and update both the workflow and `worker/fly.toml` (`app = "..."`)

4. **Push to trigger the deploy**
   ```bash
   git push origin feature/foundation-rebuild
   ```
   - Go to https://github.com/splendidbit/listingscout/actions to watch the workflow
   - It will fail on the first try if Fly secrets (Supabase, Inngest) aren't set yet — that's expected

5. **Set runtime secrets on the Fly app** (after the app is created by the GHA)
   - Fly dashboard → your app → Secrets
   - Add:
     - `SUPABASE_URL` — from your Supabase project (Settings → API)
     - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase (Settings → API → service_role secret)
     - `INNGEST_EVENT_KEY` — from Inngest dashboard (Settings → Event Keys)
     - `INNGEST_SIGNING_KEY` — from Inngest dashboard (Settings → Signing Keys)
   - After setting secrets, re-run the GitHub Action or push a no-op commit to trigger a redeploy

6. **Verify health endpoint**
   - Visit `https://<your-fly-app>.fly.dev/health` in a browser
   - Expected: `{"status":"ok","service":"listingscout-worker","timestamp":"..."}`

---

#### External accounts needed (if not created yet)

| Service | URL | What you need from it |
|---------|-----|-----------------------|
| **Supabase** | https://supabase.com | Project URL, anon key, service role key |
| **Inngest** | https://inngest.com | Event key, signing key |
| **Fly.io** | https://fly.io | API token (for GitHub Actions), runtime secrets |

**Supabase setup:**
- Create a new project (recommended: fresh, don't reuse the old one)
- Go to SQL Editor and paste these migration files **in order**:
  1. `supabase/migrations/001_create_profiles.sql`
  2. `supabase/migrations/002_create_campaigns.sql` — will be dropped by 011 but needed for migration order
  3. ...through `007_create_functions.sql`
  4. `supabase/migrations/008_expand_listings_schema.sql` through `010_add_favorites.sql`
  5. `supabase/migrations/011_reset_domain.sql` — drops old tables
  6. `supabase/migrations/012_create_core_schema.sql`
  7. `supabase/migrations/013_create_user_domain.sql`
  8. `supabase/migrations/014_rls_policies.sql`
- Shortcut for a fresh project: you can skip 002-010 and only run 001, then 012-014 (since 011 drops tables that 002-010 create, and the new schema doesn't reference them)

**Inngest setup:**
- Create account
- Create app named `listingscout`
- After the worker and web app are deployed, register both URLs as apps:
  - Web: `https://<your-vercel-app>.vercel.app/api/inngest`
  - Worker: `https://<your-fly-app>.fly.dev/api/inngest`

**Vercel setup:**
- Add environment variables: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- Supabase variables should already exist if using an existing Vercel project, otherwise add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

#### Task 19: End-to-end smoke test

After all services are deployed:

1. Open the deployed web app → log in → navigate to **Metros**
2. Click **"New metro"** → Name: Scottsdale, Slug: scottsdale-az, State: AZ → Create
3. On the detail page, click **"Ping worker"**
4. Wait ~3 seconds, refresh
5. "Recent crawl runs" table should show a row with status **`ping_ok`**

If the ping doesn't arrive:
- Check Fly logs (Fly dashboard → app → Monitoring → Live Logs)
- Check Inngest dashboard → Runs (did the event fire? did the function execute?)
- Common issues: wrong signing key, worker URL not registered in Inngest, Supabase URL wrong

---

#### Task 20: Open PR

```bash
git push origin feature/foundation-rebuild  # if not already pushed
gh pr create --base main --title "Sub-Project 1: Foundation rebuild" --body "See HANDOFF.md for full status"
```

---

## Important technical notes for resuming development

### Inngest v4 API differences
The plan was originally written with inngest v3 syntax. The codebase uses **v4** which has breaking changes:
- `createFunction` takes **2 arguments**, not 3. Triggers go inside the first arg: `{ id: '...', triggers: [{ event: '...' }] }`
- `inngest/fastify` default export is the Fastify **plugin**. The named `serve` export is a **route handler**, not a plugin.
- Both the web app and worker use `inngest@4.2.1` — they must stay in sync.

### Zod v4 API differences
The codebase uses `zod@4.3.6` which has differences from v3:
- `.toUpperCase()` is a transform, not a validator
- `z.record(keyType, valueType)` takes two args
- `.safeParse()` returns `{ success, data, error }` — `error.flatten()` works the same

### Database types are hand-written
`src/types/database.ts` was written by hand from the migration SQL because there's no local Supabase CLI to auto-generate. When Supabase CLI becomes available, regenerate with:
```bash
supabase gen types typescript --linked > src/types/database.ts
```
The `Relationships: []` field on every table is required by `@supabase/postgrest-js` v2.99.1 — don't remove it.

### Worker is a separate npm package
`worker/` has its own `package.json`, `tsconfig.json`, and `vitest.config.ts`. Run `npm install` in both root and `worker/` when setting up.

### No local Supabase or Docker required
The entire development workflow was designed for zero local infrastructure. Tests mock Supabase. The build compiles without a database connection. Deployment happens via web dashboards and GitHub Actions.

## What comes after SP1

Once the smoke test passes, Sub-Project 2 (Crawl Pipeline) begins. That plan will be written fresh. Key decisions already made:

- **First metro:** Scottsdale, AZ
- **Proxy provider:** Bright Data (for residential IP rotation when scraping AirBNB)
- **Scoring signals:** Revenue upside (A) + operator pain (B), three-gate matching (composite >= 50, upside >= 40, pain >= 30)
- **State machine:** discovered → market_scored → operator_scored → matched → in_review → qualified/rejected
- **Enrichment waterfall:** light (free) → permit/assessor → paid broker → AI agent — all user-initiated

Open questions for SP2:
- Which AirROI/AirDNA market IDs for Scottsdale (can be looked up)
- Bright Data account + credentials
- Which paid broker to try first (Apollo vs PDL vs Hunter)

## File tree (key files only)

```
listingscout2/
├── HANDOFF.md                              ← you are here
├── README.md
├── docs/superpowers/
│   ├── specs/2026-04-11-...-design.md      ← full design spec
│   └── plans/2026-04-11-...-sub-project-1.md ← SP1 implementation plan
├── supabase/migrations/
│   ├── 001-010                             ← old (kept for migration chain)
│   ├── 011_reset_domain.sql                ← drops old tables
│   ├── 012_create_core_schema.sql          ← metros, hosts, listings, snapshots, benchmarks
│   ├── 013_create_user_domain.sql          ← leads, events, contacts, enrichment_runs, crawl_runs
│   └── 014_rls_policies.sql
├── src/
│   ├── types/database.ts                   ← hand-written, regenerate when CLI available
│   ├── lib/
│   │   ├── inngest/                        ← client.ts, events.ts, functions/index.ts
│   │   ├── metros/                         ← schema.ts, actions.ts, schema.test.ts
│   │   └── supabase/                       ← server.ts, client.ts, admin.ts, middleware.ts
│   ├── components/
│   │   ├── metros/                         ← metro-form.tsx, ping-button.tsx, crawl-runs-table.tsx
│   │   └── layout/                         ← sidebar.tsx (updated nav), header.tsx
│   └── app/
│       ├── (dashboard)/metros/             ← page.tsx, new/page.tsx, [id]/page.tsx
│       └── api/inngest/route.ts
├── worker/
│   ├── Dockerfile
│   ├── fly.toml
│   ├── src/
│   │   ├── index.ts                        ← Fastify server + inngest/fastify plugin
│   │   ├── lib/env.ts, supabase.ts
│   │   ├── routes/health.ts
│   │   └── inngest/
│   │       ├── client.ts, events.ts
│   │       └── functions/ping.ts, index.ts
│   └── tests/                              ← health.test.ts, supabase.test.ts, ping.test.ts
├── .github/workflows/
│   └── fly-deploy-worker.yml               ← deploys worker/ to Fly on push
├── vitest.config.ts                        ← web-side test config
├── tests/
│   ├── setup.ts
│   └── smoke.test.ts
└── .env.local                              ← NOT in git; you create this with Supabase + Inngest keys
```
