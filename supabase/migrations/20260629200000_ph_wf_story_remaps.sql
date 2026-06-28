-- Story migration: explicit remaps for 9 legacy statuses (328 items blocked).
-- Safe mappings based on status lifecycle meaning verified against Story v1 canonical keys.
-- Evidence: ph_wf_migration_preview('story') showed these 9 as unmapped.
-- CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001

DO $$
DECLARE
  v_version_id uuid;
BEGIN
  SELECT id INTO v_version_id
  FROM ph_wf_versions
  WHERE entity_key = 'story' AND lifecycle = 'published'
  LIMIT 1;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Story published version not found — abort';
  END IF;

  -- "In Requirements" → refinement
  -- Requirements-gathering is pre-dev refinement work.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'In Requirements', 'refinement', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "In Design" → refinement
  -- Design work precedes dev; maps to refinement (pre-dev).
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'In Design', 'refinement', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "Demand validation" → refinement
  -- Demand validation = early refinement / discovery.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'Demand validation', 'refinement', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "In Integration" → in_development
  -- Integration = active coding/wiring = in development.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'In Integration', 'in_development', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "Staging/QA" → qa_testing
  -- Staging + QA is the canonical QA Testing phase.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'Staging/QA', 'qa_testing', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "In Production" → done
  -- Items in production are delivered = done.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'In Production', 'done', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "Production Ready" → ready_for_release
  -- Production ready = passed QA/UAT, ready to ship = ready_for_release.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'Production Ready', 'ready_for_release', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "Beta Ready" → ready_for_release
  -- Beta ready = same lifecycle position as production ready.
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'Beta Ready', 'ready_for_release', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  -- "In BETA" → in_uat
  -- Beta testing = UAT equivalent (external validation before production).
  INSERT INTO ph_wf_status_remaps (entity_key, old_status_key, new_status_key, to_version_id)
  VALUES ('story', 'In BETA', 'in_uat', v_version_id)
  ON CONFLICT (entity_key, old_status_key, to_version_id) DO UPDATE SET new_status_key = EXCLUDED.new_status_key;

  RAISE NOTICE 'Story: 9 legacy status remaps inserted/updated for version %', v_version_id;
END $$;
