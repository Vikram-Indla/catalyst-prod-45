-- CAT-STRATA-THEMEOKR-20260719-001 — Wave 6: forward-only migration map, deterministic
-- backfill, and exception report. NO fabrication, NO silent repair, NO history rewrite.
--
-- Classification (invariant 18; prompt migration policy):
--   1 standalone KR                       -> deterministic (legacy current_value kept as fallback)
--   2 KPI-backed KR                       -> kpi_id preserved as legacy provenance (never identity)
--   3 objective-linked OKR, theme resolvable -> theme_id backfilled from objective.parent_id
--   4 ambiguous/orphan OKR (no theme)     -> EXCEPTION (never auto-assigned)
--   5 closed/locked/issued                -> compatibility read only, never mutated
--
-- Legacy current_value is NOT converted into a fabricated "validated" observation (that would
-- invent a validator/state). strata_kr_progress already falls back to current_value with
-- data_quality='legacy', so historical results stay readable and reproducible without fabrication.

-- ---------------------------------------------------------------------------
-- 1. Migration map + exception report
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_okr_migration_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('okr','key_result')),
  entity_id uuid NOT NULL,
  classification int NOT NULL CHECK (classification BETWEEN 1 AND 5),
  resolved_theme_id uuid,
  legacy_objective_element_id uuid,
  legacy_kpi_id uuid,
  is_exception boolean NOT NULL DEFAULT false,
  reason text,
  migrated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
COMMENT ON TABLE public.strata_okr_migration_map IS
  'Deterministic classification + provenance of every pre-existing OKR/KR for the Theme-owned migration (CAT-STRATA-THEMEOKR-20260719-001). Exceptions are enumerated, never silently repaired.';
ALTER TABLE public.strata_okr_migration_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY strata_okr_migration_map_select ON public.strata_okr_migration_map FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY strata_okr_migration_map_write ON public.strata_okr_migration_map FOR ALL
  USING (public.strata_is_admin()) WITH CHECK (public.strata_is_admin());

-- ---------------------------------------------------------------------------
-- 2. Classify + backfill OKRs
-- ---------------------------------------------------------------------------
-- Class 3: objective-linked OKR whose objective's parent is a Theme -> resolve theme_id.
WITH resolved AS (
  SELECT o.id AS okr_id, o.objective_element_id, p.id AS theme_id
    FROM public.strata_okrs o
    JOIN public.strata_strategy_elements e ON e.id = o.objective_element_id
    JOIN public.strata_strategy_elements p ON p.id = e.parent_id AND p.element_type = 'theme'
   WHERE o.theme_id IS NULL AND o.status <> 'closed'
)
UPDATE public.strata_okrs o SET theme_id = r.theme_id
  FROM resolved r WHERE o.id = r.okr_id;

INSERT INTO public.strata_okr_migration_map (entity_type, entity_id, classification, resolved_theme_id, legacy_objective_element_id, is_exception, reason)
SELECT 'okr', o.id, 3, o.theme_id, o.objective_element_id, false,
       'objective-linked OKR; theme resolved from objective.parent_id'
  FROM public.strata_okrs o
 WHERE o.objective_element_id IS NOT NULL AND o.theme_id IS NOT NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- Class 5: closed/locked OKRs — compatibility read only, never mutated.
INSERT INTO public.strata_okr_migration_map (entity_type, entity_id, classification, legacy_objective_element_id, is_exception, reason)
SELECT 'okr', o.id, 5, o.objective_element_id, false, 'closed/locked historical OKR — compatibility read only'
  FROM public.strata_okrs o WHERE o.status = 'closed'
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- Class 4: orphan OKR (no objective, no resolvable theme) — EXCEPTION, never auto-assigned.
INSERT INTO public.strata_okr_migration_map (entity_type, entity_id, classification, legacy_objective_element_id, is_exception, reason)
SELECT 'okr', o.id, 4, o.objective_element_id, true,
       'orphan OKR: no strategy objective and no resolvable Theme — requires human decision (D-4)'
  FROM public.strata_okrs o
 WHERE o.theme_id IS NULL AND o.status <> 'closed'
   AND NOT EXISTS (SELECT 1 FROM public.strata_okr_migration_map m WHERE m.entity_type='okr' AND m.entity_id=o.id)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Classify KRs + deterministic accountable-owner backfill (from parent OKR owner only)
-- ---------------------------------------------------------------------------
-- Backfill accountable_owner_id from the parent OKR owner where deterministic (never fabricate).
UPDATE public.strata_key_results kr
   SET accountable_owner_id = o.owner_id
  FROM public.strata_okrs o
 WHERE kr.okr_id = o.id AND kr.accountable_owner_id IS NULL AND o.owner_id IS NOT NULL;

-- Class 2: KPI-backed KR -> preserve kpi_id as legacy provenance (flag; independent def is prospective).
INSERT INTO public.strata_okr_migration_map (entity_type, entity_id, classification, legacy_kpi_id, is_exception, reason)
SELECT 'key_result', kr.id, 2, kr.kpi_id, false,
       'KPI-backed KR: kpi_id retained as legacy provenance only; prospective independent contract required before official reuse'
  FROM public.strata_key_results kr WHERE kr.kpi_id IS NOT NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- Class 1: standalone KR -> deterministic; legacy current_value kept as calc fallback.
INSERT INTO public.strata_okr_migration_map (entity_type, entity_id, classification, is_exception, reason)
SELECT 'key_result', kr.id, 1, (kr.accountable_owner_id IS NULL),
       CASE WHEN kr.accountable_owner_id IS NULL
            THEN 'standalone KR; accountable owner could not be resolved deterministically — needs assignment'
            ELSE 'standalone KR migrated deterministically; owner inherited from OKR' END
  FROM public.strata_key_results kr WHERE kr.kpi_id IS NULL
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Exception report (queryable/exportable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.strata_okr_migration_exceptions AS
  SELECT m.*, CASE m.entity_type WHEN 'okr' THEN o.name ELSE kr.name END AS entity_name
    FROM public.strata_okr_migration_map m
    LEFT JOIN public.strata_okrs o ON m.entity_type='okr' AND o.id = m.entity_id
    LEFT JOIN public.strata_key_results kr ON m.entity_type='key_result' AND kr.id = m.entity_id
   WHERE m.is_exception = true;
COMMENT ON VIEW public.strata_okr_migration_exceptions IS
  'Human-decision queue for the Theme-owned OKR migration: orphan OKRs and KRs with no deterministic owner. Never auto-resolved.';
GRANT SELECT ON public.strata_okr_migration_exceptions TO authenticated;
