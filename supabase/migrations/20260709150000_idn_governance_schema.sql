-- ============================================================================
-- CAT-IDEATION-REBUILD-20260709-001 · Phase 1 · Slice S2 — Governance schema
-- Scoring framework (GovernedEnvelope, D8), AI suggestion ledger, embeddings,
-- conversions, business_requests.source_idea_id backlink.
-- Depends on: 20260709130000_idn_core_schema.sql. pgvector 0.8.0 (verified).
-- ============================================================================

-- ---------- Enums -----------------------------------------------------------
CREATE TYPE public.idn_aggregation AS ENUM ('weighted_sum', 'weighted_avg');
CREATE TYPE public.idn_driver_direction AS ENUM ('higher_better', 'lower_better');
CREATE TYPE public.idn_config_status AS ENUM ('draft', 'pending_approval', 'approved', 'retired', 'superseded');
CREATE TYPE public.idn_score_source AS ENUM ('human', 'ai_suggested_accepted');
CREATE TYPE public.idn_suggestion_kind AS ENUM
  ('classification', 'summary', 'duplicate', 'strategy_mapping', 'work_item_mapping', 'scores', 'recommendation', 'br_draft');
CREATE TYPE public.idn_suggestion_status AS ENUM ('proposed', 'accepted', 'edited', 'rejected', 'superseded');
CREATE TYPE public.idn_conversion_mode AS ENUM ('manual', 'ai_assisted');

-- ---------- Scoring framework (GovernedEnvelope pattern per STRATA) ---------
CREATE TABLE public.idn_scoring_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  aggregation public.idn_aggregation NOT NULL DEFAULT 'weighted_sum',
  -- GovernedEnvelope
  version integer NOT NULL DEFAULT 1,
  status public.idn_config_status NOT NULL DEFAULT 'draft',
  effective_from timestamptz,
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.idn_scoring_models(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER idn_scoring_models_touch
  BEFORE UPDATE ON public.idn_scoring_models
  FOR EACH ROW EXECUTE FUNCTION public.idn_touch_updated_at();
-- At most one approved (active) model at a time
CREATE UNIQUE INDEX idx_idn_scoring_models_active
  ON public.idn_scoring_models ((true)) WHERE status = 'approved';

CREATE TABLE public.idn_scoring_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.idn_scoring_models(id) ON DELETE CASCADE,
  key text NOT NULL,
  label_en text NOT NULL,
  label_ar text,
  weight numeric(6,3) NOT NULL CHECK (weight >= 0),
  scale_min numeric(6,2) NOT NULL DEFAULT 0,
  scale_max numeric(6,2) NOT NULL DEFAULT 5,
  direction public.idn_driver_direction NOT NULL DEFAULT 'higher_better',
  rubric jsonb,                      -- {"0": "...", ..., "5": "..."} EN/AR
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_id, key),
  CHECK (scale_max > scale_min)
);
CREATE INDEX idx_idn_drivers_model ON public.idn_scoring_drivers (model_id, order_index);

CREATE TABLE public.idn_idea_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.idn_scoring_drivers(id) ON DELETE CASCADE,
  model_version integer NOT NULL,   -- frozen at scoring time; weight changes never rewrite history
  value numeric(6,2) NOT NULL,
  scored_by uuid NOT NULL DEFAULT auth.uid(),
  rationale text,
  source public.idn_score_source NOT NULL DEFAULT 'human',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, driver_id, model_version)
);
CREATE INDEX idx_idn_scores_idea ON public.idn_idea_scores (idea_id);

-- Recompute idn_ideas.score_total from the ACTIVE model's drivers.
-- Direction normalization: lower_better values are inverted within the scale.
CREATE OR REPLACE FUNCTION public.idn_recompute_score(_idea_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _total numeric;
BEGIN
  SELECT CASE m.aggregation
           WHEN 'weighted_sum' THEN sum(w.norm_value * d.weight)
           WHEN 'weighted_avg' THEN sum(w.norm_value * d.weight) / NULLIF(sum(d.weight), 0)
         END
    INTO _total
  FROM public.idn_scoring_models m
  JOIN public.idn_scoring_drivers d ON d.model_id = m.id
  JOIN LATERAL (
    SELECT CASE d.direction
             WHEN 'higher_better' THEN s.value
             ELSE d.scale_max + d.scale_min - s.value
           END AS norm_value
    FROM public.idn_idea_scores s
    WHERE s.idea_id = _idea_id AND s.driver_id = d.id AND s.model_version = m.version
    ORDER BY s.created_at DESC LIMIT 1
  ) w ON true
  WHERE m.status = 'approved'
  GROUP BY m.aggregation;

  UPDATE public.idn_ideas SET score_total = round(_total, 2) WHERE id = _idea_id;
END; $$;

CREATE OR REPLACE FUNCTION public.idn_scores_recompute_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.idn_recompute_score(COALESCE(NEW.idea_id, OLD.idea_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER idn_idea_scores_recompute
  AFTER INSERT OR UPDATE OR DELETE ON public.idn_idea_scores
  FOR EACH ROW EXECUTE FUNCTION public.idn_scores_recompute_trigger();

-- ---------- AI suggestion ledger (HITL + audit backbone) --------------------
CREATE TABLE public.idn_ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  kind public.idn_suggestion_kind NOT NULL,
  payload jsonb NOT NULL,
  confidence numeric(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text NOT NULL,
  prompt_version text NOT NULL,
  status public.idn_suggestion_status NOT NULL DEFAULT 'proposed',
  decided_by uuid,
  decided_at timestamptz,
  override_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Every human decision is attributed
  CONSTRAINT idn_suggestion_decision_attributed
    CHECK (status = 'proposed' OR status = 'superseded' OR (decided_by IS NOT NULL AND decided_at IS NOT NULL))
);
CREATE INDEX idx_idn_suggestions_idea ON public.idn_ai_suggestions (idea_id, status);
COMMENT ON TABLE public.idn_ai_suggestions IS
  'Append-oriented AI suggestion ledger. AI writes proposed rows (service role); humans decide. No DELETE policy by design.';

-- ---------- Embeddings (service-role only; no client policies) --------------
CREATE TABLE public.idn_idea_embeddings (
  idea_id uuid PRIMARY KEY REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,
  content_hash text NOT NULL,        -- recompute only on change; no re-migration
  embedded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_idn_embeddings_hnsw ON public.idn_idea_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- ---------- Conversion edge (audited traceability) ---------------------------
CREATE TABLE public.idn_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL UNIQUE REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  business_request_id uuid NOT NULL REFERENCES public.business_requests(id) ON DELETE RESTRICT,
  mode public.idn_conversion_mode NOT NULL DEFAULT 'manual',
  br_draft_suggestion_id uuid REFERENCES public.idn_ai_suggestions(id) ON DELETE SET NULL,
  converted_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_idn_conversions_br ON public.idn_conversions (business_request_id);

-- Backlink on the BR (additive; the only touch on an existing table)
ALTER TABLE public.business_requests
  ADD COLUMN source_idea_id uuid REFERENCES public.idn_ideas(id) ON DELETE SET NULL;
CREATE INDEX idx_br_source_idea ON public.business_requests (source_idea_id)
  WHERE source_idea_id IS NOT NULL;

-- ---------- RLS -------------------------------------------------------------
ALTER TABLE public.idn_scoring_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_models_select ON public.idn_scoring_models FOR SELECT
  USING (public.current_user_is_approved());
-- Ideation Admin drafts; publish (status -> approved) is SuperAdmin-only (D8)
CREATE POLICY idn_models_insert ON public.idn_scoring_models FOR INSERT
  WITH CHECK (public.idn_is_admin() AND status = 'draft');
CREATE POLICY idn_models_update_draft ON public.idn_scoring_models FOR UPDATE
  USING (public.idn_is_admin() AND status IN ('draft', 'pending_approval'))
  WITH CHECK (
    status IN ('draft', 'pending_approval')
    OR (status = 'approved' AND public.is_admin(auth.uid()) AND approved_by = auth.uid())
    OR (status IN ('retired', 'superseded') AND public.is_admin(auth.uid()))
  );
CREATE POLICY idn_models_delete ON public.idn_scoring_models FOR DELETE
  USING (public.idn_is_admin() AND status = 'draft');

ALTER TABLE public.idn_scoring_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_drivers_select ON public.idn_scoring_drivers FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_drivers_write ON public.idn_scoring_drivers FOR ALL
  USING (public.idn_is_admin() AND EXISTS (
    SELECT 1 FROM public.idn_scoring_models m
    WHERE m.id = model_id AND m.status IN ('draft', 'pending_approval')))
  WITH CHECK (public.idn_is_admin() AND EXISTS (
    SELECT 1 FROM public.idn_scoring_models m
    WHERE m.id = model_id AND m.status IN ('draft', 'pending_approval')));

ALTER TABLE public.idn_idea_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_scores_select ON public.idn_idea_scores FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_scores_insert ON public.idn_idea_scores FOR INSERT
  WITH CHECK (
    public.idn_has_role(ARRAY['reviewer','approver','admin']::public.idn_role[])
    AND scored_by = auth.uid()
    AND NOT public.idn_idea_is_locked(idea_id)
  );
CREATE POLICY idn_scores_update ON public.idn_idea_scores FOR UPDATE
  USING (
    public.idn_has_role(ARRAY['reviewer','approver','admin']::public.idn_role[])
    AND NOT public.idn_idea_is_locked(idea_id)
  );
CREATE POLICY idn_scores_delete ON public.idn_idea_scores FOR DELETE
  USING (public.idn_is_admin() AND NOT public.idn_idea_is_locked(idea_id));

-- AI writes suggestions via service role (bypasses RLS). Clients may only
-- read and decide — never insert or delete. No DELETE policy: ledger is append-only.
ALTER TABLE public.idn_ai_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_suggestions_select ON public.idn_ai_suggestions FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_suggestions_decide ON public.idn_ai_suggestions FOR UPDATE
  USING (public.idn_has_role(ARRAY['reviewer','approver','admin']::public.idn_role[]))
  WITH CHECK (status <> 'proposed' AND decided_by = auth.uid());

-- Embeddings: RLS enabled with NO policies — service-role only by construction.
ALTER TABLE public.idn_idea_embeddings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.idn_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_conversions_select ON public.idn_conversions FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_conversions_insert ON public.idn_conversions FOR INSERT
  WITH CHECK (
    public.idn_has_role(ARRAY['approver','admin']::public.idn_role[])
    AND converted_by = auth.uid()
  );
-- No UPDATE/DELETE policies: conversion edges are immutable.
