-- ============================================================================
-- STRATA Execution reconciliation — additive schema only, no destructive drops.
-- CAT-STRATA-EXECUTION-RECONCILE-20260706 · Execution Reconciliation Report §K/§L
--
-- Business correction: Project Card is the sole execution object. It links to
-- exactly one Strategic Theme by default. Project Objectives/KPIs are created
-- inside the Project Card and reuse the SAME strategy_elements/kpis frameworks
-- used for Theme Objectives/KPIs (context/level discriminator, not a second
-- model). Initiative tables/RPCs are kept for backward compatibility and are
-- NOT dropped here — they are removed from the active Execution UI in a
-- later, separate slice.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Explicit context/level discriminator on strategy_elements
--    (Theme Objective vs Project Objective — same table, same framework)
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_strategy_elements
  ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'theme' CHECK (context IN ('theme','project'));
COMMENT ON COLUMN public.strata_strategy_elements.context IS
  'Explicit scope discriminator (Execution Reconciliation §E): theme = strategy-level element, project = a Project Card''s own objective. Same element_type/parent_id hierarchy applies to both — no second objective framework.';

-- ---------------------------------------------------------------------------
-- 2. Project Card: direct Strategic Theme link + default Overview/Scope fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_project_cards
  ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS reference_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS business_owner_id uuid,
  ADD COLUMN IF NOT EXISTS lead_business_unit text,
  ADD COLUMN IF NOT EXISTS delivery_team text,
  ADD COLUMN IF NOT EXISTS scope_description text,
  ADD COLUMN IF NOT EXISTS target_outcomes text,
  ADD COLUMN IF NOT EXISTS success_criteria text,
  -- Migrated Initiative business-context fields (rule §17) — optional,
  -- config-gated, NOT part of the default Overview/Scope tabs (rule §18).
  ADD COLUMN IF NOT EXISTS sponsor_id uuid,
  ADD COLUMN IF NOT EXISTS business_case text,
  ADD COLUMN IF NOT EXISTS value_hypothesis text,
  -- Bag for the remaining optional/config-gated fields (Strategic Pillar, AOP
  -- Mapping, Strategic Impact, Stakeholders, Enabling Teams, Support
  -- Functions, Risks) — Admin config declares which keys are active per
  -- card_type; avoids nine sparse always-NULL columns on the default model.
  ADD COLUMN IF NOT EXISTS optional_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.strata_project_cards.theme_id IS
  'The single Strategic Theme this Project Card belongs to by default (Execution Reconciliation §K rule 6). Must reference a strata_strategy_elements row with element_type = ''theme'' — enforced by trigger, not a DB CHECK (cannot subquery in CHECK).';
COMMENT ON COLUMN public.strata_project_cards.optional_fields IS
  'Admin-config-gated optional fields (strategic_pillar, aop_mapping, strategic_impact, stakeholders, enabling_teams, support_functions, risks). Never rendered unless enabled in strata_project_card_field_configs for this card_type.';

CREATE OR REPLACE FUNCTION public.strata_validate_project_card_theme()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.theme_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.strata_strategy_elements
     WHERE id = NEW.theme_id AND element_type = 'theme'
  ) THEN
    RAISE EXCEPTION 'theme_id must reference a strategy element with element_type = theme';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strata_project_cards_theme_check ON public.strata_project_cards;
CREATE TRIGGER trg_strata_project_cards_theme_check
  BEFORE INSERT OR UPDATE OF theme_id ON public.strata_project_cards
  FOR EACH ROW EXECUTE FUNCTION public.strata_validate_project_card_theme();

-- Project Reference ID — stable business-facing code, independent of slug
-- (routing) and source_key (Jira). Auto-generated, never hand-typed.
CREATE SEQUENCE IF NOT EXISTS public.strata_project_card_reference_seq;

CREATE OR REPLACE FUNCTION public.strata_generate_project_card_reference()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.reference_id IS NULL THEN
    NEW.reference_id := 'PRJ-' || lpad(nextval('public.strata_project_card_reference_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strata_project_cards_reference ON public.strata_project_cards;
CREATE TRIGGER trg_strata_project_cards_reference
  BEFORE INSERT ON public.strata_project_cards
  FOR EACH ROW EXECUTE FUNCTION public.strata_generate_project_card_reference();

-- ---------------------------------------------------------------------------
-- 3. Milestones — source traceability (Jira preferred source, rule §15)
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_milestones
  ADD COLUMN IF NOT EXISTS source_system text,
  ADD COLUMN IF NOT EXISTS source_reference_key text,
  ADD COLUMN IF NOT EXISTS source_issue_id text;

-- ---------------------------------------------------------------------------
-- 4. Delivery Dependencies — richer field set (Execution Reconciliation §J.8)
-- ---------------------------------------------------------------------------
ALTER TABLE public.strata_dependencies
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS baseline_start date,
  ADD COLUMN IF NOT EXISTS baseline_end date,
  ADD COLUMN IF NOT EXISTS source_system text,
  ADD COLUMN IF NOT EXISTS source_reference_key text,
  ADD COLUMN IF NOT EXISTS source_issue_id text;

-- ---------------------------------------------------------------------------
-- 5. Benefit ↔ Project Card attribution (replaces Benefit ↔ Initiative as the
--    primary VMO attribution path, rule §19). Mirrors strata_benefit_initiatives
--    exactly — same shape, new target entity, no changes to the Initiative table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_benefit_project_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.strata_benefits(id) ON DELETE CASCADE,
  project_card_id uuid NOT NULL REFERENCES public.strata_project_cards(id) ON DELETE CASCADE,
  attribution_share numeric(6,3) CHECK (attribution_share IS NULL OR (attribution_share >= 0 AND attribution_share <= 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (benefit_id, project_card_id)
);
COMMENT ON TABLE public.strata_benefit_project_cards IS
  'Benefit↔Project Card attribution (Execution Reconciliation §K rule 19). Theme-level attribution is derived through project_card.theme_id, not stored separately.';

ALTER TABLE public.strata_benefit_project_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_benefit_project_cards_select ON public.strata_benefit_project_cards FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_benefit_project_cards_write ON public.strata_benefit_project_cards FOR ALL
  USING (public.strata_has_role(ARRAY['strategy_office','vmo_validator']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','vmo_validator']));

CREATE TRIGGER trg_strata_benefit_project_cards_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.strata_benefit_project_cards
  FOR EACH ROW EXECUTE FUNCTION public.strata_audit();

-- ---------------------------------------------------------------------------
-- 6. Project Card configuration engine (config-first requirement).
--    Prior art: demand_tab_configs / demand_section_configs (already dropped
--    as empty deadwood in 20260628170000_drop_deadwood_empty_tables.sql — the
--    live Demand tables no longer exist, so nothing there is touched). Column
--    shapes below mirror that prior art exactly, STRATA-namespaced.
--    card_type = NULL means "applies to every card type" (the default template).
-- ---------------------------------------------------------------------------
CREATE TABLE public.strata_project_card_tab_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type text,
  tab_key text NOT NULL,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (card_type, tab_key)
);

CREATE TABLE public.strata_project_card_section_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type text,
  tab_key text NOT NULL,
  section_key text NOT NULL,
  name text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  collapsed_by_default boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (card_type, tab_key, section_key)
);

CREATE TABLE public.strata_project_card_field_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type text,
  tab_key text NOT NULL,
  section_key text,
  field_key text NOT NULL,
  display_name text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_visible boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  is_readonly boolean NOT NULL DEFAULT false,
  syncs_from_jira boolean NOT NULL DEFAULT false,
  editable_when_synced boolean NOT NULL DEFAULT true,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (card_type, field_key)
);

CREATE TABLE public.strata_project_card_picklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  picklist_key text NOT NULL,
  value text NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (picklist_key, value)
);
COMMENT ON COLUMN public.strata_project_card_picklists.picklist_key IS
  'One of: lead_business_unit, delivery_team, serving_department, delivery_status, strategic_impact, aop_mapping, benefit_category, enabling_team, support_function, dependency_status, milestone_status (Execution Reconciliation config-first requirement).';

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'strata_project_card_tab_configs','strata_project_card_section_configs',
    'strata_project_card_field_configs','strata_project_card_picklists'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %1$s_select ON public.%1$I FOR SELECT USING (public.current_user_is_approved())', t);
    EXECUTE format($p$
      CREATE POLICY %1$s_write ON public.%1$I FOR ALL
        USING (public.strata_has_role(ARRAY['strategy_office','strata_admin']))
        WITH CHECK (public.strata_has_role(ARRAY['strategy_office','strata_admin']))
    $p$, t);
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Default template seed (idempotent) — Overview / Scope & Measures / Delivery
--    tabs with their default sections, per Execution Reconciliation §K. card_type
--    NULL = applies to every Project Card unless overridden per type.
-- ---------------------------------------------------------------------------
INSERT INTO public.strata_project_card_tab_configs (card_type, tab_key, display_name, is_active, is_required, position)
VALUES
  (NULL, 'overview', 'Overview', true, true, 0),
  (NULL, 'scope_measures', 'Scope & Measures', true, true, 1),
  (NULL, 'delivery', 'Delivery', true, true, 2)
ON CONFLICT (card_type, tab_key) DO NOTHING;

INSERT INTO public.strata_project_card_section_configs (card_type, tab_key, section_key, name, is_visible, is_required, position)
VALUES
  (NULL, 'scope_measures', 'scope_description', 'Scope Description', true, true, 0),
  (NULL, 'scope_measures', 'project_objectives', 'Project Objectives', true, true, 1),
  (NULL, 'scope_measures', 'project_kpis', 'Project KPIs / Measures', true, true, 2),
  (NULL, 'scope_measures', 'target_outcomes', 'Target Outcomes', true, true, 3),
  (NULL, 'scope_measures', 'success_criteria', 'Success Criteria', true, true, 4),
  (NULL, 'delivery', 'milestones', 'Milestones', true, true, 0),
  (NULL, 'delivery', 'dependencies', 'Delivery Dependencies', true, true, 1)
ON CONFLICT (card_type, tab_key, section_key) DO NOTHING;

INSERT INTO public.strata_project_card_field_configs (card_type, tab_key, section_key, field_key, display_name, field_type, is_visible, is_required, is_readonly, syncs_from_jira, position)
VALUES
  (NULL, 'overview', NULL, 'name', 'Project Name', 'text', true, true, false, true, 0),
  (NULL, 'overview', NULL, 'reference_id', 'Project Reference ID', 'text', true, true, true, false, 1),
  (NULL, 'overview', NULL, 'theme_id', 'Strategic Theme', 'reference', true, true, false, false, 2),
  (NULL, 'overview', NULL, 'business_owner_id', 'Business Owner', 'user', true, false, false, false, 3),
  (NULL, 'overview', NULL, 'pm_id', 'Project Manager', 'user', true, false, false, false, 4),
  (NULL, 'overview', NULL, 'lead_business_unit', 'Lead Business Unit', 'picklist', true, false, false, false, 5),
  (NULL, 'overview', NULL, 'delivery_team', 'Delivery Team', 'picklist', true, false, false, false, 6),
  (NULL, 'overview', NULL, 'stage', 'Delivery Status', 'picklist', true, true, false, true, 7),
  (NULL, 'overview', NULL, 'execution_health', 'Calculated Delivery Health', 'calculated', true, false, true, false, 8),
  (NULL, 'overview', NULL, 'source_system', 'Source System', 'text', true, false, true, true, 9),
  (NULL, 'overview', NULL, 'source_key', 'Source Reference Key', 'text', true, false, true, true, 10),
  -- Optional/config-gated fields (rule §18: not visible by default).
  (NULL, 'overview', NULL, 'strategic_pillar', 'Strategic Pillar', 'picklist', false, false, false, false, 20),
  (NULL, 'overview', NULL, 'aop_mapping', 'AOP Mapping', 'picklist', false, false, false, false, 21),
  (NULL, 'overview', NULL, 'strategic_impact', 'Strategic Impact', 'picklist', false, false, false, false, 22),
  (NULL, 'overview', NULL, 'budget', 'Budget', 'currency', false, false, false, false, 23),
  (NULL, 'overview', NULL, 'sponsor_id', 'Executive Sponsor', 'user', false, false, false, false, 24),
  (NULL, 'overview', NULL, 'business_case', 'Business Case', 'longtext', false, false, false, false, 25),
  (NULL, 'overview', NULL, 'value_hypothesis', 'Value Hypothesis', 'longtext', false, false, false, false, 26),
  (NULL, 'overview', NULL, 'stakeholders', 'Stakeholders', 'list', false, false, false, false, 27),
  (NULL, 'overview', NULL, 'enabling_teams', 'Enabling Teams', 'picklist_multi', false, false, false, false, 28),
  (NULL, 'overview', NULL, 'support_functions', 'Support Functions', 'picklist_multi', false, false, false, false, 29),
  (NULL, 'overview', NULL, 'risks', 'Risks', 'longtext', false, false, false, false, 30)
ON CONFLICT (card_type, field_key) DO NOTHING;

INSERT INTO public.strata_project_card_picklists (picklist_key, value, label, position)
VALUES
  ('delivery_status', 'planning', 'Planning', 0),
  ('delivery_status', 'active', 'Active', 1),
  ('delivery_status', 'on_hold', 'On Hold', 2),
  ('delivery_status', 'delivery', 'In Delivery', 3),
  ('delivery_status', 'completed', 'Completed', 4),
  ('delivery_status', 'archived', 'Archived', 5),
  ('milestone_status', 'planned', 'Planned', 0),
  ('milestone_status', 'in_progress', 'In Progress', 1),
  ('milestone_status', 'done', 'Done', 2),
  ('milestone_status', 'missed', 'Missed', 3),
  ('milestone_status', 'descoped', 'Descoped', 4),
  ('dependency_status', 'open', 'Open', 0),
  ('dependency_status', 'at_risk', 'At Risk', 1),
  ('dependency_status', 'blocked', 'Blocked', 2),
  ('dependency_status', 'resolved', 'Resolved', 3),
  ('dependency_status', 'cancelled', 'Cancelled', 4)
ON CONFLICT (picklist_key, value) DO NOTHING;
