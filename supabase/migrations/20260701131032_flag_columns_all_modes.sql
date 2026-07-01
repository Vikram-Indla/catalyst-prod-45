-- Extend flag + was_flagged sticky marker to every table the canonical
-- KanbanPage reads. was_flagged already lives on ph_issues (prior migration);
-- add is_flagged / flag_reason / was_flagged on the other four so the ⋯ →
-- Add Flag menu action is uniform across product / task / release / test hubs.
alter table public.business_requests add column if not exists is_flagged  boolean not null default false;
alter table public.business_requests add column if not exists flag_reason text;
alter table public.business_requests add column if not exists was_flagged boolean not null default false;

alter table public.tasks add column if not exists is_flagged  boolean not null default false;
alter table public.tasks add column if not exists flag_reason text;
alter table public.tasks add column if not exists was_flagged boolean not null default false;

alter table public.rh_releases add column if not exists is_flagged  boolean not null default false;
alter table public.rh_releases add column if not exists flag_reason text;
alter table public.rh_releases add column if not exists was_flagged boolean not null default false;

alter table public.tm_test_cases add column if not exists is_flagged  boolean not null default false;
alter table public.tm_test_cases add column if not exists flag_reason text;
alter table public.tm_test_cases add column if not exists was_flagged boolean not null default false;

update public.business_requests set was_flagged = true where is_flagged is true and was_flagged is false;
update public.tasks             set was_flagged = true where is_flagged is true and was_flagged is false;
update public.rh_releases       set was_flagged = true where is_flagged is true and was_flagged is false;
update public.tm_test_cases     set was_flagged = true where is_flagged is true and was_flagged is false;
