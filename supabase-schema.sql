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

create table if not exists public.launch_projects (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  name text not null,
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

-- 2) RLS
alter table public.task_runs enable row level security;
alter table public.token_reports enable row level security;
alter table public.launch_projects enable row level security;

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

-- Inserts should be done using the service role key from the server (bypasses RLS).
