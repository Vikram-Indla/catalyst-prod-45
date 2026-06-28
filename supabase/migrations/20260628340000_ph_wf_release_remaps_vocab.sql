-- Supplement Release remaps to cover the live rh_releases.status free-text
-- vocabulary (releasesDataSource / kanban 9-stage lifecycle). CONFIDENT only;
-- 'in_readiness' left UNMAPPED on purpose (ambiguous: scope_locked vs build_packaging).
-- Additive + idempotent. Staging only.
DO $$
DECLARE v_ver uuid;
BEGIN
  SELECT id INTO v_ver FROM ph_wf_versions WHERE entity_key='release' AND lifecycle='published' ORDER BY version_no DESC LIMIT 1;
  IF v_ver IS NOT NULL THEN
    INSERT INTO ph_wf_status_remaps(to_version_id, entity_key, old_status_key, new_status_key, note) VALUES
      (v_ver,'release','planned','scope_planning','confident'),
      (v_ver,'release','ready_for_signoff','qa_signoff_pending','confident'),
      (v_ver,'release','approved','golive_approval_pending','confident'),
      (v_ver,'release','monitoring','hypercare','confident'),
      (v_ver,'release','completed','closed','confident'),
      (v_ver,'release','cancelled','canceled','confident')
      ON CONFLICT (to_version_id, entity_key, old_status_key) DO NOTHING;
  END IF;
END $$;
