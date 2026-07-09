-- S1 RLS probe script — run against STAGING (cyijbdeuehohvhnsywig) after applying
-- 20260709130000_idn_core_schema.sql. Paste raw output into 06_VALIDATION_EVIDENCE.md.
-- Each probe states the expected outcome. Run blocks with the listed JWT role context
-- (use supabase db query with a user token, or set request.jwt.claims in a psql session).

-- P0: objects exist
SELECT count(*) AS idn_tables FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE 'idn\_%' ESCAPE '\';  -- expect 7
SELECT count(*) AS idn_policies FROM pg_policies WHERE tablename LIKE 'idn_%';  -- expect 20

-- P1 (as approved user A): insert own idea → OK; key + slug auto-generate
INSERT INTO idn_ideas (title, idea_class) VALUES ('Probe idea one', 'problem') RETURNING idea_key, slug, workflow_status_key;
-- expect IDEA-1, probe-idea-one, draft

-- P2 (as user A): concurrent-create key race — two inserts in parallel sessions
-- expect distinct IDEA-N values, no unique violation

-- P3 (as user B, no idn role): update A's draft idea → expect 0 rows updated
UPDATE idn_ideas SET title='hijack' WHERE idea_key='IDEA-1';

-- P4 (as user B): insert idea claiming submitter A → expect RLS violation
INSERT INTO idn_ideas (title, idea_class, submitter_id) VALUES ('spoof', 'problem', '<USER_A_UUID>');

-- P5 (as reviewer): update A's idea post-draft → expect 1 row (after setting status)
-- (as service role first): UPDATE idn_ideas SET workflow_status_key='submitted' WHERE idea_key='IDEA-1';
UPDATE idn_ideas SET owner_id = auth.uid() WHERE idea_key='IDEA-1';

-- P6 lock probe (as service role): simulate conversion, then (as reviewer) update → expect 0 rows
UPDATE idn_ideas SET converted_business_request_id = (SELECT id FROM business_requests LIMIT 1) WHERE idea_key='IDEA-1';
-- as reviewer:
UPDATE idn_ideas SET title='post-lock edit' WHERE idea_key='IDEA-1';  -- expect 0 rows
-- as user B: comment on locked idea → expect OK (comments exempt from lock)
INSERT INTO idn_comments (idea_id, content) SELECT id, '{"type":"doc"}'::jsonb FROM idn_ideas WHERE idea_key='IDEA-1';
-- as user B: vote on locked idea → expect RLS violation
INSERT INTO idn_votes (idea_id, importance) SELECT id, 2 FROM idn_ideas WHERE idea_key='IDEA-1';

-- P7 (as user B): duplicate vote on unlocked idea → second insert expect unique violation
-- P8 (as user B): delete idea → expect 0 rows (admin only)
DELETE FROM idn_ideas WHERE idea_key='IDEA-1';

-- P9 audit append-only (as any user): UPDATE idn_audit_log ... → expect RLS violation (no policy)

-- Cleanup (service role): DELETE FROM idn_ideas WHERE title LIKE 'Probe%' OR title='spoof';
