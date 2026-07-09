-- ============================================================================
-- CAT-IDEATION-REBUILD-20260709-001 · Phase 1 · Slice S3 — Seeds
-- Scoring model v1 (Default Value/Effort) + presets (RICE/WSJF);
-- Ideation workflow lifecycle in ph_wf_*; IdeationHub notification triggers;
-- admin module-role defaults. Depends on: S1 + S2. Idempotent.
--
-- Note: ph_wf_transition_guards CHECK constraint is extended in this migration
-- to include the three new Ideation guard types (strategy_link_present,
-- scores_complete, duplicate_review_complete).
-- ============================================================================

-- Extend ph_wf_transition_guards.guard_type CHECK constraint to include new guards
ALTER TABLE public.ph_wf_transition_guards
DROP CONSTRAINT IF EXISTS ph_wf_transition_guards_type_chk;

ALTER TABLE public.ph_wf_transition_guards
ADD CONSTRAINT ph_wf_transition_guards_type_chk CHECK (guard_type IN (
  'required_field','approval','brd_attached','figma_attached',
  'acceptance_criteria_present','assignee_required','child_completion',
  'test_coverage','qa_signoff','uat_signoff','no_open_blocker_critical',
  'release_readiness','deployment_window','deployment_evidence','rca',
  'reason_required','comment_required','smoke_evidence',
  'strategy_link_present','scores_complete','duplicate_review_complete'
));

-- ---------- Scoring Models (D4: Value/Effort default, D5: RICE/WSJF presets) ----

INSERT INTO public.idn_scoring_models
  (name, slug, description, aggregation, version, status, change_reason, created_by)
VALUES
  ('Default', 'default-v1', 'Value × Effort matrix (D4 default)', 'weighted_sum', 1, 'approved', 'initial seed', '00000000-0000-0000-0000-000000000000'::uuid),
  ('RICE', 'rice-v1', 'Intercom RICE (Reach, Impact, Confidence, Effort)', 'weighted_sum', 1, 'draft', 'preset', '00000000-0000-0000-0000-000000000000'::uuid),
  ('WSJF', 'wsjf-v1', 'SAFe Weighted Shortest Job First', 'weighted_sum', 1, 'draft', 'preset', '00000000-0000-0000-0000-000000000000'::uuid)
ON CONFLICT (slug) DO NOTHING;

-- Drivers for Default model (Value/Effort)
INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, label_ar, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'value', 'Value to Business', 'القيمة للمشروع', 0.6, 0, 5, 'higher_better', 0
  FROM public.idn_scoring_models WHERE slug = 'default-v1'
ON CONFLICT (model_id, key) DO NOTHING;

INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, label_ar, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'effort', 'Implementation Effort', 'جهد التنفيذ', 0.4, 0, 5, 'lower_better', 1
  FROM public.idn_scoring_models WHERE slug = 'default-v1'
ON CONFLICT (model_id, key) DO NOTHING;

-- Drivers for RICE model
INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'reach', 'Reach (% of users)', 0.25, 0, 100, 'higher_better', 0 FROM public.idn_scoring_models WHERE slug = 'rice-v1'
ON CONFLICT (model_id, key) DO NOTHING;

INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'impact', 'Impact per User', 0.25, 0, 5, 'higher_better', 1 FROM public.idn_scoring_models WHERE slug = 'rice-v1'
ON CONFLICT (model_id, key) DO NOTHING;

INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'confidence', 'Confidence', 0.25, 0, 100, 'higher_better', 2 FROM public.idn_scoring_models WHERE slug = 'rice-v1'
ON CONFLICT (model_id, key) DO NOTHING;

INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'effort_months', 'Effort (months)', 0.25, 0, 12, 'lower_better', 3 FROM public.idn_scoring_models WHERE slug = 'rice-v1'
ON CONFLICT (model_id, key) DO NOTHING;

-- Drivers for WSJF model
INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'user_value', 'User Value', 0.3, 1, 5, 'higher_better', 0 FROM public.idn_scoring_models WHERE slug = 'wsjf-v1'
ON CONFLICT (model_id, key) DO NOTHING;

INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'business_value', 'Business Value', 0.3, 1, 5, 'higher_better', 1 FROM public.idn_scoring_models WHERE slug = 'wsjf-v1'
ON CONFLICT (model_id, key) DO NOTHING;

INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'time_criticality', 'Time Criticality', 0.2, 1, 5, 'higher_better', 2 FROM public.idn_scoring_models WHERE slug = 'wsjf-v1'
ON CONFLICT (model_id, key) DO NOTHING;

INSERT INTO public.idn_scoring_drivers
  (model_id, key, label_en, weight, scale_min, scale_max, direction, order_index)
SELECT id, 'effort', 'Implementation Effort', 0.2, 1, 5, 'lower_better', 3 FROM public.idn_scoring_models WHERE slug = 'wsjf-v1'
ON CONFLICT (model_id, key) DO NOTHING;

-- ---------- Ideation Workflow Lifecycle in ph_wf_* (S3) -----------------
-- Register ideation as a new entity_key in the default canonical scheme.
-- States: draft → submitted → screening → evaluation → decided (approved/declined/parked/merged) → converted → delivered.
-- Lifecycle groups: intake (draft/submitted), triage (screening), evaluation, decision, terminal (delivered).

DO $$
DECLARE
  v_template uuid;
  v_version  uuid;
  v_scheme   uuid;
BEGIN
  -- Use the existing template or create one (templates organize related workflows)
  SELECT id INTO v_template FROM ph_wf_templates WHERE name='Ideation' LIMIT 1;
  IF v_template IS NULL THEN
    INSERT INTO ph_wf_templates(name, description)
    VALUES ('Ideation', 'Ideation module workflow templates')
    RETURNING id INTO v_template;
  END IF;

  -- Create the Ideation v1 workflow version (idempotent)
  SELECT id INTO v_version FROM ph_wf_versions
   WHERE template_id=v_template AND entity_key='ideation' AND version_no=1;

  IF v_version IS NULL THEN
    INSERT INTO ph_wf_versions(template_id, entity_key, version_no, lifecycle, published_at, notes)
    VALUES (v_template, 'ideation', 1, 'published', now(), 'Ideation intake-to-delivery lifecycle (S3 seed)')
    RETURNING id INTO v_version;

    -- Statuses per 03 §4: draft → submitted → screening → evaluation → decided → converted → delivered
    INSERT INTO ph_wf_version_statuses
      (version_id, status_key, display_label, category, lifecycle_group, sort_order, color_token, is_initial, is_terminal, is_exception, supports_reopen, requires_reason)
    VALUES
      (v_version, 'draft',       'Draft',        'todo',         'intake',       10, 'color.background.neutral',      true,  false, false, false, false),
      (v_version, 'submitted',   'Submitted',    'todo',         'intake',       20, 'color.background.neutral',      false, false, false, false, false),
      (v_version, 'screening',   'Screening',    'in_progress',  'triage',       30, 'color.background.information',  false, false, false, false, false),
      (v_version, 'evaluation',  'Evaluation',   'in_progress',  'evaluation',   40, 'color.background.information',  false, false, false, false, false),
      (v_version, 'approved',    'Approved',     'done',         'decision',     50, 'color.background.success',      false, false, false, false, false),
      (v_version, 'declined',    'Declined',     'done',         'decision',     60, 'color.background.warning',      false, false, true,  true,  true),
      (v_version, 'parked',      'Parked',       'in_progress',  'decision',     70, 'color.background.warning',      false, false, true,  true,  true),
      (v_version, 'merged',      'Merged',       'done',         'decision',     80, 'color.background.neutral',      false, false, false, false, false),
      (v_version, 'converted',   'Converted',    'in_progress',  'terminal',     90, 'color.background.information',  false, false, false, false, false),
      (v_version, 'delivered',   'Delivered',    'done',         'terminal',     100, 'color.background.success',      false, true,  false, false, false);

    -- Transitions: the core lifecycle flow per 03 §4
    INSERT INTO ph_wf_version_transitions
      (version_id, from_status_key, to_status_key, transition_type, requires_reason, sort_order)
    VALUES
      -- Intake: draft → submitted
      (v_version, 'draft',        'submitted',    'forward',      false, 10),
      -- Triage: submitted → screening
      (v_version, 'submitted',    'screening',    'forward',      false, 20),
      -- Evaluation: screening → evaluation
      (v_version, 'screening',    'evaluation',   'forward',      false, 30),
      -- Decision: evaluation → approved/declined/parked/merged
      (v_version, 'evaluation',   'approved',     'forward',      false, 40),
      (v_version, 'evaluation',   'declined',     'exception',    true,  50),
      (v_version, 'evaluation',   'parked',       'exception',    true,  60),
      (v_version, 'screening',    'merged',       'exception',    true,  70),  -- cheap kill at screening
      -- Approved → Converted → Delivered (the success path)
      (v_version, 'approved',     'converted',    'forward',      false, 80),
      (v_version, 'converted',    'delivered',    'forward',      false, 90),
      -- Reopening: declined/parked can be reopened to evaluation (audited)
      (v_version, 'declined',     'evaluation',   'reopen',       true,  100),
      (v_version, 'parked',       'evaluation',   'reopen',       true,  110),
      -- Backward paths for backfilling (e.g., screening → submitted if pre-triage info missing)
      (v_version, 'screening',    'submitted',    'backward',     false, 120);
  END IF;

  -- Register ideation in the default scheme (idempotent)
  SELECT id INTO v_scheme FROM ph_wf_schemes WHERE is_default=true LIMIT 1;
  IF v_scheme IS NULL THEN
    INSERT INTO ph_wf_schemes(name, description, is_default)
    VALUES ('Default Canonical Scheme', 'Default scheme', true)
    RETURNING id INTO v_scheme;
  END IF;

  INSERT INTO ph_wf_scheme_entries(scheme_id, entity_key, version_id)
  VALUES (v_scheme, 'ideation', v_version)
  ON CONFLICT (scheme_id, entity_key) DO UPDATE SET version_id=EXCLUDED.version_id;

END $$;

-- ---------- Notification Trigger Config (IdeationHub event set per 03 §8) ----
-- Quiet defaults: P3/P4 in-app only per 04 §I.8.

INSERT INTO public.notification_trigger_config
  (trigger_key, hub_source, category, priority, description, recipients_config, channels_config, default_enabled)
VALUES
  -- §8: 10 events
  ('idea_submitted', 'IdeationHub', 'product_ideas', 'P2', 'An idea enters the Inbox queue', '["triage_queue_owners"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_triage_assigned', 'IdeationHub', 'product_ideas', 'P2', 'Idea ownership assigned during screening', '["assigned_triage_owner"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_status_changed', 'IdeationHub', 'product_ideas', 'P3', 'Idea status changes (→ Screening/Evaluation)', '["submitter", "watchers"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_comment_added', 'IdeationHub', 'product_ideas', 'P2', 'Comment posted on an idea', '["mentioned_users", "submitter", "watchers"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_mentioned', 'IdeationHub', 'product_ideas', 'P2', 'User @mentioned in idea comment', '["mentioned_users"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_vote_milestone', 'IdeationHub', 'product_ideas', 'P4', 'Idea reaches vote milestones (10/25/50)', '["submitter"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_decision', 'IdeationHub', 'product_ideas', 'P2', 'Idea decided (approved/declined/parked with reason)', '["submitter", "watchers"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_merged', 'IdeationHub', 'product_ideas', 'P2', 'Idea merged into another (both submitters notify)', '["submitter", "target_submitter"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_converted', 'IdeationHub', 'product_ideas', 'P2', 'Idea converted to Business Request', '["submitter", "voters", "watchers"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_delivered', 'IdeationHub', 'product_ideas', 'P2', 'Linked BR reaches terminal (loop-closer)', '["submitter", "voters"]'::jsonb, '["in_app"]'::jsonb, true),
  ('idea_ai_suggestions_ready', 'IdeationHub', 'product_ideas', 'P4', 'AI suggestions ready for review', '["triage_owner"]'::jsonb, '["in_app"]'::jsonb, true)
ON CONFLICT (trigger_key, hub_source) DO NOTHING;

-- ---------- Ideation Workflow Transition Roles + Guards (S3) -----------
-- Role assignments and guard prerequisites per transition.
-- Advisory only; blocking enforcement is a P1 gate decision.

DO $$
DECLARE v_version uuid;
BEGIN
  SELECT id INTO v_version FROM ph_wf_versions
   WHERE entity_key='ideation' AND lifecycle='published' ORDER BY version_no DESC LIMIT 1;
  IF v_version IS NULL THEN RAISE NOTICE 'no ideation version found'; RETURN; END IF;

  -- ROLE ASSIGNMENTS per transition (03 §7: Submitter/Reviewer/Approver/Admin)
  INSERT INTO ph_wf_transition_roles (transition_id, role_group, allow_assignee, allow_reporter, allow_super_admin_bypass, bypass_requires_reason)
  SELECT t.id, x.role_group, x.allow_assignee, x.allow_reporter, true, true
  FROM (VALUES
    -- Intake: submitter creates draft → submitted
    ('draft','submitted','submitter',true,false),
    -- Triage: reviewer screens ideas (submitted → screening)
    ('submitted','screening','reviewer',false,false),
    -- Evaluation: reviewer advances (screening → evaluation)
    ('screening','evaluation','reviewer',false,false),
    -- Decision: approver decides (evaluation → approved/declined/parked)
    ('evaluation','approved','approver',false,false),
    ('evaluation','declined','reviewer',false,false),
    ('evaluation','parked','reviewer',false,false),
    ('screening','merged','reviewer',false,false),
    -- Terminal: approver converts → converted, workflow auto → delivered
    ('approved','converted','approver',false,false),
    ('converted','delivered','system',false,false),
    -- Reopening: approver can reopen declined/parked
    ('declined','evaluation','approver',false,false),
    ('parked','evaluation','approver',false,false)
  ) AS x(from_key,to_key,role_group,allow_assignee,allow_reporter)
  JOIN ph_wf_version_transitions t
    ON t.version_id=v_version AND t.to_status_key=x.to_key AND t.from_status_key=x.from_key
  ON CONFLICT (transition_id, role_group) DO NOTHING;

  -- GUARDS: required conditions (per 03 §4: strategy_link, scores, duplicate_review; plus reason on exceptions)
  INSERT INTO ph_wf_transition_guards (transition_id, guard_type, params, is_blocking, waiver_allowed)
  SELECT t.id, x.guard_type, '{}'::jsonb, x.is_blocking, x.waiver
  FROM (VALUES
    -- D7: strategy link required to Approve
    ('evaluation','approved','strategy_link_present',false,false),
    -- D8: scores complete before Approve
    ('evaluation','approved','scores_complete',false,false),
    -- Duplicate review before Approve
    ('evaluation','approved','duplicate_review_complete',false,false),
    -- Reason required on exceptions (decline/park/merge)
    ('evaluation','declined','reason_required',false,false),
    ('evaluation','parked','reason_required',false,false),
    ('screening','merged','reason_required',false,false),
    -- Reason required on reopen
    ('declined','evaluation','reason_required',false,false),
    ('parked','evaluation','reason_required',false,false)
  ) AS x(from_key,to_key,guard_type,is_blocking,waiver)
  JOIN ph_wf_version_transitions t
    ON t.version_id=v_version AND t.to_status_key=x.to_key AND t.from_status_key=x.from_key
  ON CONFLICT DO NOTHING;
END $$;

-- ---------- Admin Nav Module (ideation) --------------------------------
-- Register ideation as a navigable module in admin console (enables role-based access control).

INSERT INTO public.admin_nav_modules (key, label, description, icon_name, is_active, requires_auth)
VALUES ('ideation', 'Ideation', 'Idea intake and governance (CAT-IDEATION-REBUILD-20260709-001)', 'lightbulb', true, true)
ON CONFLICT (key) DO NOTHING;

-- ---------- Admin Role Module Permissions (ideation module defaults) ----
-- Register roles in admin_role_module_permissions per D8 governance.
-- Replicate the pattern from other modules (e.g., strata, product):
-- SuperAdmin = all, Admin = config, Reviewer = triage/score, Submitter = read.

INSERT INTO public.admin_role_module_permissions
  (role_code, module_key, access_level)
VALUES
  ('superadmin', 'ideation', 'full'),
  ('admin', 'ideation', 'full'),
  ('reviewer', 'ideation', 'full'),
  ('approver', 'ideation', 'full'),
  ('user', 'ideation', 'view')
ON CONFLICT (role_code, module_key) DO NOTHING;
