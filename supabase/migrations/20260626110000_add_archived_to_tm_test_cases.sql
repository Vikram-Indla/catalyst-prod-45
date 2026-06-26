-- CAT-TESTHUB-ENGINE-20260626-001 · D8
-- Archive is a first-class AioTests action, distinct from status='deprecated'.
-- Restores support for the archive hooks (useBulkArchiveTestCases) and the
-- default "hide archived" list filter in useTestCases.
alter table public.tm_test_cases add column if not exists archived boolean not null default false;
create index if not exists idx_tm_test_cases_archived on public.tm_test_cases (project_id, archived);
