-- CAT-TESTHUB-PROD-20260703-001 P0-S8 (D-REQ-1 default confirmed by probe P0.1)
-- SetDetailPage queried tm_cycle_sets via `as any` but the table never
-- existed — "cycles using this set" silently rendered 0 and add-to-cycle
-- failed. Additive join table; rollback = DROP TABLE tm_cycle_sets.

CREATE TABLE IF NOT EXISTS tm_cycle_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES tm_test_cycles(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES tm_test_sets(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, set_id)
);

CREATE INDEX IF NOT EXISTS idx_tm_cycle_sets_set ON tm_cycle_sets (set_id);
CREATE INDEX IF NOT EXISTS idx_tm_cycle_sets_cycle ON tm_cycle_sets (cycle_id);

ALTER TABLE tm_cycle_sets ENABLE ROW LEVEL SECURITY;

-- Canonical join-table RLS (mirrors tm_set_cases: access via the set's project)
CREATE POLICY tm_cycle_sets_select ON tm_cycle_sets FOR SELECT USING (
  EXISTS (SELECT 1 FROM tm_test_sets s
          WHERE s.id = tm_cycle_sets.set_id
            AND tm_user_has_access(auth.uid(), s.project_id))
);
CREATE POLICY tm_cycle_sets_insert ON tm_cycle_sets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tm_test_sets s
          WHERE s.id = tm_cycle_sets.set_id
            AND tm_user_has_access(auth.uid(), s.project_id))
);
CREATE POLICY tm_cycle_sets_update ON tm_cycle_sets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM tm_test_sets s
          WHERE s.id = tm_cycle_sets.set_id
            AND tm_user_has_access(auth.uid(), s.project_id))
);
CREATE POLICY tm_cycle_sets_delete ON tm_cycle_sets FOR DELETE USING (
  EXISTS (SELECT 1 FROM tm_test_sets s
          WHERE s.id = tm_cycle_sets.set_id
            AND tm_user_has_access(auth.uid(), s.project_id))
);
