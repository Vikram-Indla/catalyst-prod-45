-- Revert sticky "was flagged at least once" marker — the blue history tint
-- on unflagged cards wasn't useful. Drop the column from every table it
-- was added to (see 20260701130712_kanban_was_flagged and
-- 20260701131032_flag_columns_all_modes).
alter table public.ph_issues         drop column if exists was_flagged;
alter table public.business_requests drop column if exists was_flagged;
alter table public.tasks             drop column if exists was_flagged;
alter table public.rh_releases       drop column if exists was_flagged;
alter table public.tm_test_cases     drop column if exists was_flagged;
