-- CAT-TESTHUB-PROD-20260703-001 P1-S2 (discovered live during acceptance test)
-- Both tm_test_case_versions RLS policies gated on is_project_member(uuid,
-- uuid), called with arguments in the WRONG order for that function's real
-- signature (project_id, user_id) — a two-uuid-argument mixup. Even with
-- the order fixed, is_project_member reads an EMPTY project_members table
-- (0 rows for the DEMO project used throughout this session) — it is a
-- disconnected, unpopulated membership model, unlike every other tm_*
-- table (110 policies, per discovery R6), which gates on tm_user_has_access
-- (tm_user_roles + a permissive dev fallback). This table was the one
-- inconsistent policy in the whole tm_* schema, and it silently blocked
-- 100% of direct client reads/writes on version history — writes only
-- ever worked through the SECURITY DEFINER RPC, which bypasses RLS
-- entirely, masking the bug until a client-side read was attempted (P1-S2
-- pinned-snapshot lookup silently fell back to live steps, no error).
--
-- Fix: standardize on tm_user_has_access, matching the rest of the schema.

DROP POLICY IF EXISTS "Users can view version history" ON tm_test_case_versions;
CREATE POLICY "Users can view version history" ON tm_test_case_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM tm_test_cases tc
          WHERE tc.id = tm_test_case_versions.test_case_id
            AND tm_user_has_access(auth.uid(), tc.project_id))
);

DROP POLICY IF EXISTS "Users can create versions" ON tm_test_case_versions;
CREATE POLICY "Users can create versions" ON tm_test_case_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tm_test_cases tc
          WHERE tc.id = tm_test_case_versions.test_case_id
            AND tm_user_has_access(auth.uid(), tc.project_id))
);
