# Revenue-Share Co-Host Lead Pipeline — Design

**Status:** Draft for review
**Date:** 2026-04-11
**Supersedes:** The current "ListingScout" codebase, which will be rebuilt.

---

## 1. Purpose

Rebuild ListingScout to serve a single, focused business model: **identifying short-term rental hosts who are strong candidates for a revenue-share co-hosting pitch**, and surfacing them with enough evidence and contact information to run outreach.

The current app scores listings for generic "revenue upside" but has no model of host operational pain and no real contact-research pipeline. Both are required for the revenue-share co-host thesis. The rebuild keeps only infrastructure (Next.js shell, Supabase auth, Vercel deployment) and replaces the scoring engine, schema, UI, and sourcing pipeline.

## 2. Business model and thesis

The product sells a **revenue-share co-host service**: the user takes a percentage of gross revenue in exchange for running pricing, optimization, and guest communication remotely, without taking over cleaning, turnover, or maintenance. It is not full property management and not consulting.

A lead is a strong match when **both** of the following are true:

1. **Revenue upside exists** — the listing is demonstrably underperforming its market on occupancy, RevPAR, or ADR.
2. **The host is operationally overwhelmed** — signals like slow response rate, stale photos, review velocity decline, or thin listing quality suggest the host isn't tending the listing.

Upside alone is insufficient (the host may be satisfied with the status quo and unwilling to engage). Pain alone is insufficient (the host may have nothing sellable for the co-host to optimize). Both must be present.

## 3. Decisions made during brainstorming

| # | Decision | Rationale |
|---|---|---|
| 1 | Business model: revenue-share co-host | User-specified |
| 2 | Match thesis: revenue upside AND operator pain | Both are necessary, neither is sufficient |
| 3 | Host size cutoff: 1–5 listings, hard exclude >5 | Keeps focus on solo and small-scaling hosts; pros already have operational help |
| 4 | Existing cohost/PM: deprioritize, do not exclude | A host with an unhappy current cohost is still reachable |
| 5 | Geographic scope: specific metros (depth, not breadth) | User operates in a limited set of markets |
| 6 | Sourcing: hybrid — AirROI/AirDNA for market benchmarks, AirBNB direct for listing, host, review, and photo signals | Operator-pain signals (photo staleness, review velocity, response rate) require AirBNB-direct data; market data APIs do not expose them |
| 7 | Contact research: four-tier waterfall — free → permit/assessor → paid broker → AI agent | Fail cheap, pay only for leads the user believes in |
| 8 | Qualification: human review gate with per-lead enrichment escalation | Deterministic scoring to queue; human decides what's worth spending on |
| 9 | Scope of change: full rebuild, keep only infrastructure | Clean mental model; old scoring engine is tied to wrong thesis |

## 4. Architecture

Four tiers with single responsibilities.

### 4.1 Web app (Vercel, Next.js App Router)

The review UI, metro configuration, qualified-leads export, and calibration page. Handles auth, reads lead state from Supabase, writes hunt and enrichment requests to the job queue. **Never** runs scraping or long-running work itself.

### 4.2 Job orchestrator (Inngest)

Managed queue and cron system. Chosen for its free tier, fan-out primitives, retry policy, and built-in dashboard. Triggers three kinds of jobs:

- **Scheduled metro crawls** (cron per configured metro)
- **User-initiated actions** (hunt trigger, tier escalation, rescore)
- **Fan-out stage transitions** (`discovered` → `market_scored` → `operator_scored` → `matched`)

Inngest holds schedule and retry state; business logic lives in the worker. Migration to an alternative (e.g., pg-boss) later is possible and approximately a week of work.

### 4.3 Scraping and research worker (Fly.io or Render, single small VM)

The only component that talks to AirBNB directly, plus the home of per-metro permit and assessor adapters. Long-lived Node service that Inngest invokes over HTTP. Uses residential proxies (Bright Data or equivalent; provider is a config value). Handles rate limiting, proxy rotation, block detection. Stateless — all state lives in Supabase.

**Hard rule:** Vercel serverless cannot reliably scrape AirBNB. This tier is non-negotiable.

### 4.4 Supabase (Postgres + auth + RLS)

Single data store. No Supabase Edge Functions — logic stays in the Next.js app or the worker.

### 4.5 Data flow for one crawl

```
Inngest cron fires
  → POST /crawl/start on worker with metro config
  → worker enumerates AirBNB listings in metro, writes raw rows
  → worker returns list of new listing ids to Inngest
  → Inngest fans out "score this listing" jobs
  → each scoring job reads listing + market benchmarks, writes score
  → Inngest fans in to rollup job, moves matched leads into review queue
  → web app reads review queue via Supabase
```

## 5. Data model

### 5.1 Design principles

1. **Host is a first-class entity.** The >5-listing exclusion requires host-level rollup. Hosts are deduped globally by `airbnb_host_id`.
2. **Lead is separate from listing.** A listing is a fact about the world; a lead is a candidate for outreach. Separating them lets a lead be archived without losing the listing, and lets a listing be re-led later on material change.
3. **Contacts are a separate many-to-one table on host.** A host has many contacts with different confidences and sources — the whole point of the enrichment waterfall.
4. **Snapshots are separate from listings.** Time-series is required for staleness detection. Current state lives on `listings`, history on `listing_snapshots`.
5. **Listings and hosts are global facts, not user-owned.** Leads, metros, and enrichment runs are user-owned.

### 5.2 Tables

```
profiles                 (kept from existing auth infra)

metros                   -- user-configured markets
  id, user_id, name, slug, state, country
  airroi_market_id, airdna_market_id
  airbnb_search_config (jsonb)        -- bbox, neighborhoods, filters
  permit_registry_config (jsonb)      -- per-metro adapter config if available
  crawl_enabled (bool), crawl_cron, last_crawled_at

hosts                    -- GLOBAL, deduped by airbnb_host_id
  id, airbnb_host_id (unique), display_name, profile_url
  joined_month, superhost, response_rate_pct, identity_verified
  listing_count_observed                -- rollup from listings
  excluded (bool), exclusion_reason     -- e.g. "listing_count > 5"
  cohost_presence (bool)                -- derived from listings
  pm_company_detected (bool)
  first_seen_at, last_refreshed_at

listings                 -- GLOBAL, deduped by airbnb_listing_id
  id, airbnb_listing_id (unique), host_id, metro_id
  listing_url, title, room_type, bedrooms, bathrooms, max_guests
  neighborhood, lat, lng
  photo_count, photo_hash
  nightly_rate, cleaning_fee, minimum_stay, instant_book, cancellation
  amenities (jsonb), amenity_count
  avg_rating, total_reviews, sub_ratings (jsonb)
  last_review_at                         -- for review-recency signal
  description_hash                       -- for staleness signal
  discovered_at, last_refreshed_at
  raw_payload (jsonb)                    -- last scrape for debug/reprocess

listing_snapshots        -- time-series for change detection
  id, listing_id, snapshot_at
  photo_hash, description_hash, title
  nightly_rate, avg_rating, total_reviews

market_benchmarks        -- cached AirROI/AirDNA data
  metro_id, property_type, bedroom_bucket
  market_adr, market_occupancy, market_revenue, market_revpar
  source (airroi|airdna), fetched_at
  primary key (metro_id, property_type, bedroom_bucket, source)

leads                    -- USER-OWNED candidate for outreach
  id, user_id, metro_id, listing_id, host_id
  state (enum; see 6.1)
  upside_score (int),           -- signal A composite
  operator_pain_score (int),    -- signal B composite
  composite_score (int),
  score_breakdown (jsonb),
  rejection_reason,
  scored_at, state_changed_at

lead_events              -- audit trail (every state change, every user action)
  id, lead_id, event_type, actor, payload (jsonb), created_at

contacts                 -- discovered contact info for a host
  id, host_id, contact_type (email|phone|linkedin|website|address|instagram|facebook|twitter|other)
  value, confidence (high|medium|low)
  source (airbnb|permit|assessor|hunter|apollo|agent|user_manual)
  source_url, discovered_at, verified_at, stale (bool)
  enrichment_run_id (fk, optional)

enrichment_runs          -- each per-lead escalation attempt
  id, lead_id, tier (light|permit|broker|agent)
  status (pending|running|success|failed|skipped)
  started_at, finished_at, cost_usd, error
  findings_summary (text), results (jsonb)
  triggered_by (user_id | 'auto')

crawl_runs               -- per-metro crawl history, observability
  id, metro_id, started_at, finished_at
  listings_discovered, listings_updated, listings_errored
  errors (jsonb)
```

### 5.3 RLS

- **User-owned:** `metros`, `leads`, `lead_events`, `enrichment_runs`, `crawl_runs`. Scoped by `user_id`.
- **Global (readable by any authed user, writable by service role only):** `hosts`, `listings`, `listing_snapshots`, `market_benchmarks`, `contacts`.

**Contacts decision:** Contacts are global for now. Two users with a lead on the same host share the enrichment results. This is correct while the system has one user. If multi-tenancy is added later, contacts become user-scoped or the sharing model is made explicit.

### 5.4 Deliberately excluded

- `campaigns` — replaced by `metros` + `leads`
- `owners` — replaced by `hosts` + `contacts`
- `audit_log` — replaced by `lead_events` (lead-scoped) and `crawl_runs` (crawl-scoped)
- `favorites` — replaced by pipeline state

## 6. Pipeline and state machine

### 6.1 States

| State | Owner | Exits to | Notes |
|---|---|---|---|
| `discovered` | worker | `market_scored` | set when crawl first sees a listing |
| `market_scored` | worker | `operator_scored` | benchmarks cached, signal A written |
| `operator_scored` | worker | `matched`, `rejected` | signal B written, auto-exclusion rules fire |
| `matched` | worker | `in_review` | clean insert point into the queue |
| `rejected` | worker or user | `archived` | rejection reason always set |
| `in_review` | user | any `enrich_*`, `qualified`, `rejected`, `archived` | the queue |
| `enrich_light` / `_permit` / `_broker` / `_agent` | worker | `in_review` | always returns to review with findings attached |
| `qualified` | user | `archived` | export-ready, outreach happens outside the app |
| `archived` | user | — | terminal |

### 6.2 Auto-rejection rules (fire on `operator_scored` → `rejected`)

- Host has >5 listings observed
- Host flagged as a detected PM company (name matches PM blocklist)
- Listing has <3 reviews **and** <6 months old (too new to score)
- Composite score below a tunable minimum (start at 35)

### 6.3 Auto-match vs. auto-enrich

The pipeline from `discovered` to `matched` runs automatically. **Enrichment is never auto.** Every enrichment run is user-initiated from the review UI.

### 6.4 Crawl cadence and re-scoring

- Per-metro crawls run on a user-set cron (default: nightly)
- A listing already in the database gets its snapshot refreshed, not re-inserted
- **A lead's state is not reset by a re-crawl.** A rejected lead stays rejected.
- **Exception:** a re-crawl that detects a *material change* (host count, photo hash, review velocity) can create a new lead revision. The UI surfaces this explicitly and requires acknowledgement before the revised lead re-enters the review queue.

### 6.5 Concurrency and idempotency

- Every Inngest job is keyed on `(listing_id, target_state)` — duplicate firings are no-ops
- Scoring workers only advance lead state forward — user-set rejections are not overwritten
- Snapshot writes are append-only

### 6.6 Observability

- `crawl_runs` for metro-level health
- Inngest dashboard for job-level health
- `lead_events` for per-lead history, rendered as a timeline in the review UI

## 7. Scoring and signal sources

Two independent scores, composite on top. Keeping them separate is deliberate: either score alone is insufficient to justify outreach.

### 7.1 Score A — Revenue upside (0–100)

| Component | Weight | Source |
|---|---|---|
| Occupancy gap | 25% | AirROI/AirDNA market occupancy - listing TTM occupancy |
| RevPAR gap | 30% | market RevPAR - listing RevPAR |
| ADR pricing inefficiency | 20% | Two-variable check for underpricing (high occ, low ADR) or overpricing (low occ, high ADR) |
| Momentum | 15% | L90D revenue annualized vs TTM revenue |
| Revenue ceiling | 10% | Absolute listing revenue — filters out tiny properties where a % isn't worth it |

**Null handling:** missing components contribute 0 and their weight is redistributed proportionally — never defaulted to a middle value. Missing data must not masquerade as signal.

**Confidence subscore:** separate 0–1 value representing how much real data was available. Surfaced in the UI as "Low data" when <0.5. Does not affect the composite.

### 7.2 Score B — Operator pain (0–100)

Each signal contributes up to its listed points; sum is capped at 100.

| Signal | Max pts | Derivation |
|---|---|---|
| Photo staleness | 20 | `photo_hash` unchanged across last N snapshots (~12 months). Contributes 0 with "needs history" note until snapshot corpus is deep enough |
| Description staleness | 10 | Same pattern on `description_hash` |
| Review velocity decline | 20 | (reviews in last 90d × 4) vs reviews in prior 365d. Drop >30% = full points |
| Slow host response | 15 | `response_rate_pct < 90` scales linearly; <50% = full points |
| Slow host response time | 5 | AirBNB "responds within" bucket, worse = more points |
| Thin listing quality | 10 | <10 photos, short description, <10 amenities, no instant book |
| Sub-rating weakness | 10 | Cleanliness / value / communication sub-rating below 4.5 |
| Stale calendar | 5 | Minimum stay >3 nights AND occupancy < market |
| Solo host overwhelmed | 5 | Host has 2–5 listings AND at least one other shows similar pain signals. Reads from the current `listings` + `listing_snapshots` corpus; if other listings for this host haven't been crawled yet, the signal contributes 0 and the lead is re-scored on the next crawl that adds a sibling listing |

**Evidence trail:** every contributing signal writes a row into `score_breakdown.signals` with raw value, point contribution, and a human-readable sentence. The review UI renders these verbatim.

### 7.3 Composite and gates

```
composite = 0.55 * upside + 0.45 * operator_pain
```

**Match requires all three gates:**

- `composite ≥ 50`
- `upside ≥ 40`
- `operator_pain ≥ 30`

A high composite driven entirely by one side (e.g., 90 upside, 5 pain) is not a real lead for this business model.

**Cohost-present penalty:** `composite × 0.8`. Deprioritize, do not exclude.

**Excluded hosts** (>5 listings, PM company): skip scoring entirely, go straight to `rejected`.

### 7.4 Explicitly out of scope for v1 scoring

- Photo aesthetic quality (requires vision model)
- Review text sentiment (deferred to tier-4 enrichment on demand)
- Availability calendar pacing curves (overlaps with existing momentum metric)

### 7.5 Calibration plan

All weights above are a starting point. The first 100 reviewed leads are an explicit calibration set — the user reviews them, marks qualified or rejected with reason, and the weights are retuned against those decisions. Weights live in a config file, not hardcoded, so retuning is a deploy rather than a migration.

## 8. Enrichment waterfall

Four tiers, each a separate Inngest job against the worker. **Every run is user-initiated from the review UI.** Budget caps and cost tracking are first-class.

### 8.1 Tier 1 — Light (free, seconds)

Sources: AirBNB host profile, listing description, listing photos (reverse-image search via public web), Google search for `"<first name>" "<city>" airbnb`.

Extracts first name, any business name mentioned, host profile photo hash, social links if listing references a personal site, and any domain mentioned in description or house rules.

Writes `contacts` rows with `source='airbnb'` or `'web'` and `confidence='low'` or `'medium'`.

Cost: ≈$0 (proxy time on the worker).

### 8.2 Tier 2 — Permit and assessor (cents per lead)

Per-metro adapters on the worker. Each metro has its own adapter class — every city's permit and assessor system is different.

Per-lead pipeline in an enabled metro:

1. Query metro permit registry by neighborhood + property type + (if available) host name
2. For each plausible match, pull the property address
3. Query county assessor API for owner of record
4. If owner is an LLC, query state business registry for registered agent and members
5. Write contacts as `source='permit'` or `'assessor'`, `confidence='medium'`

Cost: usually free or a few cents. Main cost is the per-metro adapter (budget 1–3 days per metro first time, then maintenance).

### 8.3 Tier 3 — Paid brokers (dollars per lead)

Sources: Apollo.io, People Data Labs, or Hunter.io. User picks one to start; provider is config. Adapter interface is the same.

Pipeline:

1. If earlier tiers surfaced a full name, hit people-search API with `name + city`
2. If earlier tiers surfaced an LLC, hit company-search API for principals and emails
3. Return emails, phones, LinkedIn URLs with provider-reported confidence
4. Write contacts with `source='broker'`

**Hard per-lead budget cap:** default $2, config value, refuses to run over budget.

### 8.4 Tier 4 — AI agent (dollars per lead, slowest)

LLM with web-browsing tools runs open-ended research on the host, seeded with whatever context from tiers 1–3 already exists (earlier tiers are not a prerequisite — the user can escalate straight to tier 4). Returns structured findings with source citations.

Capabilities: disambiguate tier-1/2 hits, follow listing-description references, reverse-image search photos against social profiles, cross-reference against other listings by the same host.

**Hard per-lead budget cap:** default $2, config value.

### 8.5 Waterfall UX

From the review screen, each lead shows four tier buttons with costs and state. Clicking creates an `enrichment_runs` row and fires the Inngest job. When it finishes, the lead returns to `in_review` and the row re-renders with new contacts attached.

### 8.6 Provider abstraction

The worker exposes a single `enrich(lead_id, tier)` entrypoint. Each tier is a class implementing:

```ts
interface Enricher {
  readonly tier: EnrichmentTier
  readonly estimateCostUsd: (lead: LeadWithContext) => number
  readonly run: (lead: LeadWithContext, budgetUsd: number) => Promise<EnrichmentResult>
}
```

Providers inside a tier (Apollo vs PDL vs Hunter) implement the same interface. Switching providers is a config change.

### 8.7 Explicitly out of scope

- Direct scraping of LinkedIn, Instagram, Facebook — ToS gray area, detection risk
- Email verification on discovery (verified on export instead, to avoid paying for unused contacts)
- Automated outreach of any kind

## 9. Review UI and workflow

The single screen that matters. Everything else is back-office.

### 9.1 Review queue layout

Three panes. Single screen, no tabs.

- **Left pane — queue list.** Sorted by composite score desc. Filter chips: metro, score band, contact count, enrichment tier run, new since last visit. Each row: one line with title, metro, composite score, mini upside/pain bars, top signal sentence, contact count pill. Keyboard nav: `j`/`k` to move, enter to open, `x` to reject, `q` to qualify, `e` to open enrichment popover.

- **Center pane — lead detail.** Collapsed into a single scroll, not tabs.
  1. Listing card (photo, title, price, rating, AirBNB link)
  2. Score summary (upside, pain, composite as three big numbers with gate status icons)
  3. Signal evidence from `score_breakdown.signals`, with greyed-out rows for missing-data signals
  4. Host card (name, badges, response rate, other listings by this host in the DB with their scores)
  5. Contacts, grouped by type, showing source and confidence
  6. Timeline from `lead_events`

- **Right pane — actions and enrichment.** Always visible, does not scroll with the center. Qualify / Reject / Archive buttons. Reject requires a reason from a dropdown (too-pro, has-pm, bad-fit, low-quality, other) — these feed calibration. Enrichment section with the four tier buttons. Notes field for free-text per-lead comments.

### 9.2 Other screens

- **Metros page.** One row per metro. Toggle crawl, edit search config, see last crawl time and new-leads-today count. Drill-in shows metro health (last 5 crawl runs).
- **Qualified exports.** Table of state `qualified`. Select rows, export to CSV or push to Google Sheets. The only outbound integration.
- **Calibration page** (deferred). Score distribution for qualified vs rejected across last 100 decisions, retune-weights button. Defer until first 100 reviews exist.

### 9.3 Typical day

1. Open Review Queue. Filter to new-since-last-visit + hot. Expect 5–15 leads.
2. Keyboard-nav through each one.
3. Roughly 60% reject on sight from one-line evidence.
4. Remaining 40% get tier-1 + tier-2 enrichment (cheap, fast, no direct cost). Click once, move on.
5. Come back later, re-scan the enriched leads. Escalate ~20% to tier-3 or tier-4.
6. Mark 5–10% Qualified and export at end of day.

End-to-end target: under 45 minutes per day for a full queue.

### 9.4 Deliberately cut from v1

- Bulk enrichment actions (defeats pay-per-lead-you-believe-in thesis)
- Saved filter views
- Mobile layout
- Dark mode
- CRM-style pipeline stages beyond `qualified`

## 10. Risks

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| 1 | AirBNB blocking the scraper | High | Certain | Residential proxies from day one, per-metro rate limits, block detection with alerts, keep raw payloads for reparse without re-scrape |
| 2 | Per-metro permit adapter drift | Medium | High | Fixture-based tests per adapter, failure logging, health check page |
| 3 | Broker API coverage uneven for residential hosts | Medium | High | Tier 3 not load-bearing; tier 4 is the fallback; per-provider cost tracking lets you turn off unproductive providers per metro |
| 4 | Score calibration wrong at first | Low | Certain | Explicit first-100-leads calibration set; weights in config, not code |
| 5 | Inngest vendor lock | Low | — | Business logic lives in the worker; Inngest only holds schedule and retry state; ~1 week to migrate to pg-boss if needed |
| 6 | Material-change re-lead rule is subtle | Low | — | UI explicitly surfaces "previously rejected, now changed" and requires acknowledgement |

## 11. Testing strategy

Layered and pragmatic.

- **Unit tests** — scoring functions (pure, deterministic), adapter parsers (against saved HTML/JSON fixtures), state machine transitions
- **Worker contract tests** — each tier enricher tested against a recorded fixture of the upstream API response; no live API calls in CI
- **Fixture corpus** — `tests/fixtures/airbnb/` and `tests/fixtures/airroi/` hold sanitized real responses; parser and fixture are updated together when upstream HTML changes
- **Integration tests** — a small set running the full `discovered → matched` pipeline in a local Supabase + Inngest dev environment, seeded with ~10 mock listings covering edge cases (null data, excluded host, cohost present, low-data confidence). Run on pre-merge, not on every commit.
- **No live-API tests** — flaky and expensive
- **Manual smoke test post-deploy** — one real listing per metro pulled end-to-end, results logged

## 12. Out of scope for v1

- Outreach or email sending
- CRM features beyond `qualified`
- Multi-user or team accounts
- Analytics dashboards beyond the calibration page
- Anything from the current codebase not listed in the new schema

## 13. Success criteria

1. 1–2 metros configured and auto-crawling nightly
2. A typical morning review of 10 leads takes under 45 minutes including enrichment clicks
3. False-positive rate under 30% (of leads reviewed, fewer than 30% rejected for reasons the auto-scorer should have caught)
4. For leads escalated to tier 4, the agent finds at least one usable contact method 40% of the time
5. Per-lead enrichment cost, averaged across qualified leads, under $5

## 14. Open questions (require user input before implementation)

These were raised during brainstorming and do not block design approval, but need answers before the implementation plan can be finalized.

- **Which 1–2 metros first?** Determines the first permit adapters and AirROI/AirDNA market IDs. Starting with a metro that has a public STR registry is easier (e.g., Nashville, New Orleans, San Diego, Scottsdale, Austin).
- **Which broker first?** Apollo vs. People Data Labs vs. Hunter. Adapter is the same; pick based on existing account or preference.
- **Which proxy provider?** Bright Data is the safe default; Oxylabs and Smartproxy are cheaper. Residential proxy bills can surprise.
- **Google Sheets export format.** The current app has a format tied to the old schema. Recommend redesigning to match the new schema.
- **Auth.** Currently email/password for a single user. Keep, add OAuth, or make invite-only? Does not block the build but should be decided before launch.
