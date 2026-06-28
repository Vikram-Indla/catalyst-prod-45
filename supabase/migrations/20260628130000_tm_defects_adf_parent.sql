-- CAT-TESTHUB-DEFECT-CANONICAL-20260628-001
-- Defect creation moves to the canonical CreateStoryModal (QA Bug work type).
-- Adds ADF (rich-text) storage for the three defect rich-text editors plus a
-- parent_key linking a defect to any project-module work item.
alter table public.tm_defects
  add column if not exists description_adf jsonb,
  add column if not exists expected_result_adf jsonb,
  add column if not exists actual_result_adf jsonb,
  add column if not exists parent_key text;
