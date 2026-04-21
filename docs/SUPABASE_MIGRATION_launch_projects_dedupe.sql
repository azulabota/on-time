-- Optional but strongly recommended migration for recurring new-project scans
-- Adds (source, source_id) de-dupe keys and a sortable launch_ts.

alter table public.launch_projects
  add column if not exists source text,
  add column if not exists source_id text,
  add column if not exists launch_ts timestamptz;

-- Backfill source for existing rows (best effort)
update public.launch_projects
set source = coalesce(source, 'ingest')
where source is null;

-- Unique constraint to prevent duplicates on recurring scans
-- NOTE: Do NOT use a partial unique index here, because the API upsert uses
-- ON CONFLICT (source, source_id) and Postgres requires a matching UNIQUE
-- index/constraint without a predicate.
-- (Unique indexes allow multiple NULLs anyway, so this still permits legacy rows
-- with NULL source/source_id without breaking inserts.)

drop index if exists public.launch_projects_source_source_id_uidx;
create unique index if not exists launch_projects_source_source_id_uidx
  on public.launch_projects(source, source_id);

create index if not exists launch_projects_launch_ts_idx
  on public.launch_projects(launch_ts desc)
  where launch_ts is not null;
