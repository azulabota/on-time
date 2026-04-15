Token Tracker (Public)

What this is
- Public-facing website + webapp UI for:
  1) Small-cap token research (grades + projections)
  2) Twice-weekly scans for new projects (token launches + product launches)
- Built with Next.js + Tailwind
- Data stored in Supabase Postgres

Local dev
1) cd token-tracker-public/web
2) cp .env.example .env.local
3) Fill in:
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   INGEST_API_KEY=
4) npm run dev

Supabase setup
- Run ./supabase-schema.sql in the Supabase SQL editor.
- This enables public read access via RLS policies.

Ingestion (server-only; protect with INGEST_API_KEY)
- POST /api/ingest/token
- POST /api/ingest/launch
Header:
  x-api-key: <INGEST_API_KEY>

Vercel deployment
- Import this repo/project in Vercel.
- Add environment variables (Production + Preview):
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  INGEST_API_KEY

Twice-weekly automation (next step)
- Option A: Vercel Cron -> hits /api/cron/scan?secret=...
- Option B: Supabase scheduled function -> calls the ingest endpoints.

Security note
- Keep SUPABASE_SERVICE_ROLE_KEY and INGEST_API_KEY server-only (never in NEXT_PUBLIC_).
