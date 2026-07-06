-- CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Slice B7: evidence consolidation (D-006)
-- Findings at apply time (cyij):
--  * tm_attachments.entity_type is free text (no CHECK) — new entity types
--    (step_result, run, cycle, plan, execution) need no DDL.
--  * Buckets: 'testhub-attachments' exists (canonical), 'defect-attachments'
--    exists (drift, reads keep working), 'tm-attachments' DOES NOT EXIST —
--    CycleDetailPage uploads against it fail; code fix lands in Phase E/F,
--    all new writes go to 'testhub-attachments'.
-- This migration only hardens lookup performance + documents the decision.

CREATE INDEX IF NOT EXISTS idx_tm_attachments_entity
  ON public.tm_attachments (entity_type, entity_id);

COMMENT ON TABLE public.tm_attachments IS
  'Canonical TestHub evidence rows (polymorphic entity_type/entity_id). Canonical bucket: testhub-attachments (D-006, CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001). Legacy row tables (tm_test_attachments, step_result_attachments) remain readable; no new writes.';
