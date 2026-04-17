-- Token Tracker public app (Supabase Postgres)
-- Run this in Supabase SQL editor.

-- 1) Core tables
create table if not exists public.task_runs (
  id bigserial primary key,
  task_key text not null check (task_key in ('smallcap', 'launches')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'success',
  source text,
  notes text
);

create table if not exists public.token_reports (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  symbol text not null,
  name text,
  chain text,
  contract_address text,

  -- Your tags (AI, privacy, energy, big data, robotics, real world assets, DePin, oracles, x402, ...)
  categories text[],

  -- Socials (used for "most active on socials" sorting)
  x_handle text,
  x_followers double precision,
  x_activity_7d double precision,

  market_cap_usd double precision,
  fdv_usd double precision,
  volume_24h_usd double precision,
  liquidity_usd double precision,

  grade text not null,
  score_0_100 double precision not null,

  summary text not null,
  success_projection text not null,

  run_id bigint references public.task_runs(id) on delete set null
);

create index if not exists token_reports_symbol_idx on public.token_reports(symbol);
create index if not exists token_reports_created_at_idx on public.token_reports(created_at desc);
create index if not exists token_reports_chain_idx on public.token_reports(chain);
create index if not exists token_reports_score_idx on public.token_reports(score_0_100 desc);

create table if not exists public.launch_projects (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  name text not null,

  -- token launch vs product/app launch
  kind text check (kind in ('token', 'product')),

  category text,
  launch_date text,
  launch_window text,

  website text,
  x_handle text,
  notes text,

  run_id bigint references public.task_runs(id) on delete set null
);

create index if not exists launch_projects_name_idx on public.launch_projects(name);
create index if not exists launch_projects_created_at_idx on public.launch_projects(created_at desc);
create index if not exists launch_projects_kind_idx on public.launch_projects(kind);

-- Universe: projects in the $500k–$20M market cap band (seeded from CoinGecko / CoinMarketCap)
-- We store one canonical row per project using canonical_key, so syncing multiple sources won't create duplicates.
create table if not exists public.project_universe (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Best-effort de-dup key shared across sources, e.g. "btc|bitcoin".
  canonical_key text not null,

  -- External source IDs (nullable; can have both over time)
  coingecko_id text,
  coinmarketcap_id text,

  primary_source text not null default 'coingecko',

  symbol text,
  name text not null,
  image text,

  -- Your tags (AI, privacy, energy, big data, robotics, real world assets, DePin, oracles, x402, ...)
  categories text[],

  -- Chains ("all" is allowed by leaving empty and using chain-agnostic metrics)
  chains text[],

  -- Socials (used for "most active on socials" sorting)
  x_handle text,
  x_followers double precision,
  x_activity_7d double precision,

  market_cap_usd double precision,
  volume_24h_usd double precision,
  price_usd double precision,
  price_change_7d_pct double precision,
  price_change_30d_pct double precision,

  commit_count_4w double precision,

  outlook_score_0_100 double precision,
  outlook_grade text,
  outlook_factors jsonb,
  outlook_notes text[],

  last_seen_at timestamptz
);

create unique index if not exists project_universe_canonical_key_uidx
  on public.project_universe(canonical_key);

create unique index if not exists project_universe_coingecko_id_uidx
  on public.project_universe(coingecko_id)
  where coingecko_id is not null;

create unique index if not exists project_universe_coinmarketcap_id_uidx
  on public.project_universe(coinmarketcap_id)
  where coinmarketcap_id is not null;

create index if not exists project_universe_market_cap_idx
  on public.project_universe(market_cap_usd desc);

create index if not exists project_universe_outlook_score_idx
  on public.project_universe(outlook_score_0_100 desc);

create index if not exists project_universe_x_followers_idx
  on public.project_universe(x_followers desc);

create index if not exists project_universe_updated_at_idx
  on public.project_universe(updated_at desc);

-- 2) RLS
alter table public.task_runs enable row level security;
alter table public.token_reports enable row level security;
alter table public.launch_projects enable row level security;
alter table public.project_universe enable row level security;

-- Public read-only (anon) policies
-- Note: This makes the site usable without login.

drop policy if exists "public_read_task_runs" on public.task_runs;
create policy "public_read_task_runs" on public.task_runs
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_token_reports" on public.token_reports;
create policy "public_read_token_reports" on public.token_reports
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_launch_projects" on public.launch_projects;
create policy "public_read_launch_projects" on public.launch_projects
for select
to anon, authenticated
using (true);

drop policy if exists "public_read_project_universe" on public.project_universe;
create policy "public_read_project_universe" on public.project_universe
for select
to anon, authenticated
using (true);

-- Inserts should be done using the service role key from the server (bypasses RLS).
