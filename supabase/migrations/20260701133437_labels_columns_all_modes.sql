-- Uniform `labels text[]` column so the ⋯ → Add labels dialog can read/write
-- the same shape across every mode the canonical KanbanPage supports.
-- ph_issues.labels + tasks.labels already exist.
alter table public.business_requests add column if not exists labels text[] not null default '{}';
alter table public.rh_releases       add column if not exists labels text[] not null default '{}';
alter table public.tm_test_cases     add column if not exists labels text[] not null default '{}';
