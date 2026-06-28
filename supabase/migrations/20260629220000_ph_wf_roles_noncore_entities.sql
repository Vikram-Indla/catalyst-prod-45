-- Seed transition roles for Defect, Incident, Release, Business Request, Product Milestone.
-- Story/Epic/Feature/Sub-task already have roles (62 existing rows, confirmed in discovery audit).
-- Advisory mode only — no blocking enforcement enabled here.
-- CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001

DO $$
DECLARE
  v_transition_id uuid;
  v_entity        text;
  v_roles         text[];
  r               text;
BEGIN

  -- ── DEFECT ─────────────────────────────────────────────────────────────────
  -- Roles: qa_lead (owns QA decisions), developer (owns fix), implementation_lead (escalation), admin
  v_entity := 'defect';
  v_roles  := ARRAY['qa_lead', 'developer', 'implementation_lead', 'admin'];

  FOR v_transition_id IN
    SELECT t.id
    FROM ph_wf_version_transitions t
    JOIN ph_wf_versions v ON v.id = t.version_id
    WHERE v.entity_key = v_entity
  LOOP
    FOREACH r IN ARRAY v_roles LOOP
      INSERT INTO ph_wf_transition_roles (
        id, transition_id, role_group,
        allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason
      ) VALUES (
        gen_random_uuid(), v_transition_id, r,
        (r = 'developer' OR r = 'qa_lead'),  -- assignee allowed for dev + qa_lead
        false, true, true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Defect: role rows seeded for all transitions';

  -- ── INCIDENT ────────────────────────────────────────────────────────────────
  -- Roles: implementation_lead (owns resolution), release_manager (deployment decisions), admin
  v_entity := 'incident';
  v_roles  := ARRAY['implementation_lead', 'release_manager', 'admin'];

  FOR v_transition_id IN
    SELECT t.id
    FROM ph_wf_version_transitions t
    JOIN ph_wf_versions v ON v.id = t.version_id
    WHERE v.entity_key = v_entity
  LOOP
    FOREACH r IN ARRAY v_roles LOOP
      INSERT INTO ph_wf_transition_roles (
        id, transition_id, role_group,
        allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason
      ) VALUES (
        gen_random_uuid(), v_transition_id, r,
        (r = 'implementation_lead'),
        false, true, true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Incident: role rows seeded for all transitions';

  -- ── RELEASE ─────────────────────────────────────────────────────────────────
  -- Roles: release_manager (owns release gate), qa_lead (sign-off), implementation_lead, admin
  v_entity := 'release';
  v_roles  := ARRAY['release_manager', 'qa_lead', 'implementation_lead', 'admin'];

  FOR v_transition_id IN
    SELECT t.id
    FROM ph_wf_version_transitions t
    JOIN ph_wf_versions v ON v.id = t.version_id
    WHERE v.entity_key = v_entity
  LOOP
    FOREACH r IN ARRAY v_roles LOOP
      INSERT INTO ph_wf_transition_roles (
        id, transition_id, role_group,
        allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason
      ) VALUES (
        gen_random_uuid(), v_transition_id, r,
        (r = 'release_manager'),
        false, true, true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Release: role rows seeded for all transitions';

  -- ── BUSINESS REQUEST ─────────────────────────────────────────────────────────
  -- Roles: business_owner (demand), brm (BRM owns intake), product_owner (validation), admin
  v_entity := 'business_request';
  v_roles  := ARRAY['business_owner', 'brm', 'product_owner', 'admin'];

  FOR v_transition_id IN
    SELECT t.id
    FROM ph_wf_version_transitions t
    JOIN ph_wf_versions v ON v.id = t.version_id
    WHERE v.entity_key = v_entity
  LOOP
    FOREACH r IN ARRAY v_roles LOOP
      INSERT INTO ph_wf_transition_roles (
        id, transition_id, role_group,
        allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason
      ) VALUES (
        gen_random_uuid(), v_transition_id, r,
        (r = 'brm' OR r = 'product_owner'),
        false, true, true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Business Request: role rows seeded for all transitions';

  -- ── PRODUCT MILESTONE ────────────────────────────────────────────────────────
  -- Roles: product_owner (owns milestone status), implementation_lead, admin
  v_entity := 'product_milestone';
  v_roles  := ARRAY['product_owner', 'implementation_lead', 'admin'];

  FOR v_transition_id IN
    SELECT t.id
    FROM ph_wf_version_transitions t
    JOIN ph_wf_versions v ON v.id = t.version_id
    WHERE v.entity_key = v_entity
  LOOP
    FOREACH r IN ARRAY v_roles LOOP
      INSERT INTO ph_wf_transition_roles (
        id, transition_id, role_group,
        allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason
      ) VALUES (
        gen_random_uuid(), v_transition_id, r,
        (r = 'product_owner'),
        false, true, true
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Product Milestone: role rows seeded for all transitions';

END $$;
