# ListingScout

AirBNB listing research automation — collect, score, and qualify short-term rental leads at scale.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **UI:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel

## Getting Started

### 1. Clone and install

```bash
cd ~/listingscout
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API to get your URL and keys
3. Update `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run migrations

Execute the SQL files in `supabase/migrations/` in order (001-007) in your Supabase SQL editor.

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Status

### ✅ Phase 1 Complete (Foundation)
- Next.js project with TypeScript + Tailwind
- Supabase migrations (profiles, campaigns, listings, owners, audit_log, RLS, functions)
- Authentication (email/password + OAuth stubs)
- Route protection middleware
- Dashboard layout (sidebar + header)
- Landing page
- Basic dashboard with stats cards

### 🚧 Remaining Phases
- **Phase 2:** Campaign CRUD, Listings table, CSV import, deduplication
- **Phase 3:** Scoring engine, lead classification, pipeline views
- **Phase 4:** Owner research, AI agent integration
- **Phase 5:** Google Sheets sync, exports
- **Phase 6:** Polish, mobile responsive, error handling

## Directory Structure

```
listingscout/
├── supabase/migrations/     # Database schema
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/          # Login, signup, forgot-password
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   └── api/             # API routes
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── layout/          # Sidebar, header
│   ├── lib/
│   │   └── supabase/        # Supabase clients (server, client, admin)
│   └── types/
│       └── database.ts      # Supabase type definitions
└── .env.local               # Environment variables
```

## License

MIT
