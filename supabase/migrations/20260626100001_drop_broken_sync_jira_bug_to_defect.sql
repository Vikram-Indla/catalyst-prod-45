-- CAT-TESTHUB-ENGINE-20260626-001 · D2
-- Defects source of truth = ph_issues (D1/D5). The sync_jira_bug_to_defect
-- trigger (migration 20260607160000) writes tm_defects.jira_* columns that do
-- not exist on staging -> any qa-bug ph_issues mutation would error 42703.
-- Currently ABSENT on cyij; this idempotent guard prevents the 20260607
-- migration from re-introducing a broken trigger on replay.
drop trigger if exists trg_sync_jira_bug_to_defect on ph_issues;
drop trigger if exists sync_jira_bug_to_defect on ph_issues;
drop function if exists public.sync_jira_bug_to_defect() cascade;
