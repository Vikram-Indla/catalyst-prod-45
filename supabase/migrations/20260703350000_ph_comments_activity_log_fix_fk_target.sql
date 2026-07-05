-- CAT-KANBAN-FLAG-COMMENT-20260703-001
-- Existing ph_comments + ph_activity_log rows point work_item_id at ph_issues.id
-- (the canonical work-item shape used by CatalystActivitySection). Both tables
-- carried a legacy FK to ph_work_items(id) from an earlier schema iteration,
-- which never matched reality — every INSERT since fails with 23503 and the
-- Activity panel never receives new rows.
--
-- Fix: drop the stale ph_work_items FKs and rely on the ph_issues target FK
-- that is already registered (NOT VALID → does not check historical rows,
-- but does check new inserts, which is what we want).

alter table public.ph_comments
  drop constraint if exists wh_comments_work_item_id_fkey;

-- Validate the ph_issues FK now that the conflicting FK is gone. If any
-- existing row references a missing ph_issues.id, this raises — surface
-- the error early rather than let silent orphan rows accumulate.
alter table public.ph_comments
  validate constraint ph_comments_work_item_id_fkey;

alter table public.ph_activity_log
  drop constraint if exists ph_activity_log_work_item_id_fkey;

alter table public.ph_activity_log
  add constraint ph_activity_log_work_item_id_fkey
  foreign key (work_item_id) references public.ph_issues(id) on delete cascade;
