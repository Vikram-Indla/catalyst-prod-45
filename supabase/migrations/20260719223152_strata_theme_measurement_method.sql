-- CAT-STRATA-THEMEMETHOD-20260720-001 — Theme measurement-method: schema + deterministic backfill
-- A Strategic Theme selects EXACTLY ONE measurement method: objectives_kpis | okrs (mutually exclusive).
-- Authoritative column + constraints + conflict ledger + a deterministic, non-destructive backfill.
-- Governed enforcement RPCs/trigger land in the sibling _enforcement migration (applied AFTER this one).

-- 1. Column. Nullable to allow ordered backfill; the create RPC REQUIRES it for new themes.
ALTER TABLE public.strata_strategy_elements
  ADD COLUMN IF NOT EXISTS measurement_method text;

COMMENT ON COLUMN public.strata_strategy_elements.measurement_method IS
  'Strategic Theme measurement method (mutually exclusive): objectives_kpis | okrs. NULL for non-theme elements and for unclassified/both-conflict themes awaiting governed resolution. Authoritative — never inferred from child records at read time. CAT-STRATA-THEMEMETHOD-20260720-001.';

-- 2. Valid-value + theme-only constraints (re-runnable).
ALTER TABLE public.strata_strategy_elements DROP CONSTRAINT IF EXISTS strata_se_measurement_method_check;
ALTER TABLE public.strata_strategy_elements
  ADD CONSTRAINT strata_se_measurement_method_check
  CHECK (measurement_method IS NULL OR measurement_method IN ('objectives_kpis','okrs'));

ALTER TABLE public.strata_strategy_elements DROP CONSTRAINT IF EXISTS strata_se_measurement_method_theme_only;
ALTER TABLE public.strata_strategy_elements
  ADD CONSTRAINT strata_se_measurement_method_theme_only
  CHECK (measurement_method IS NULL OR element_type = 'theme');

-- 3. Conflict ledger — themes that ALREADY hold BOTH child Objectives AND Theme-owned OKRs.
--    Not auto-classified (no guessing, no silent conversion); require governed resolution.
CREATE TABLE IF NOT EXISTS public.strata_theme_method_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.strata_strategy_elements(id) ON DELETE CASCADE,
  objective_count int NOT NULL,
  theme_okr_count int NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution text,
  UNIQUE (theme_id)
);
COMMENT ON TABLE public.strata_theme_method_conflicts IS
  'Themes found holding BOTH Strategic Objectives and Theme-owned OKRs at measurement-method backfill. Left measurement_method=NULL; require explicit governed resolution (no automatic/destructive conversion). CAT-STRATA-THEMEMETHOD-20260720-001.';

ALTER TABLE public.strata_theme_method_conflicts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strata_theme_method_conflicts_select ON public.strata_theme_method_conflicts;
CREATE POLICY strata_theme_method_conflicts_select ON public.strata_theme_method_conflicts
  FOR SELECT USING (public.current_user_is_approved());
DROP POLICY IF EXISTS strata_theme_method_conflicts_write ON public.strata_theme_method_conflicts;
CREATE POLICY strata_theme_method_conflicts_write ON public.strata_theme_method_conflicts
  FOR ALL USING (public.strata_has_role(ARRAY['strategy_office','strata_admin']))
  WITH CHECK (public.strata_has_role(ARRAY['strategy_office','strata_admin']));

-- 4. Deterministic, idempotent backfill.
--    theme = element_type='theme', context='theme', not retired.
--      has_obj = >=1 non-retired child Objective (element_type='objective', context='theme')
--      has_okr = >=1 Theme-owned OKR (strata_okrs.theme_id = theme.id)  [objective-linked OKRs EXCLUDED —
--                objective-linked OKRs belong to the objectives_kpis model and must NOT be silently converted]
--      obj-only -> objectives_kpis · okr-only -> okrs · neither -> objectives_kpis (documented default D-1) · both -> NULL + conflict
WITH cls AS (
  SELECT t.id AS theme_id,
    (SELECT count(*) FROM public.strata_strategy_elements c
       WHERE c.parent_id = t.id AND c.element_type = 'objective'
         AND c.context = 'theme' AND c.status <> 'retired') AS obj_count,
    (SELECT count(*) FROM public.strata_okrs o WHERE o.theme_id = t.id) AS okr_count
  FROM public.strata_strategy_elements t
  WHERE t.element_type = 'theme' AND t.context = 'theme' AND t.status <> 'retired'
)
UPDATE public.strata_strategy_elements se
   SET measurement_method = CASE
     WHEN cls.obj_count > 0 AND cls.okr_count > 0 THEN NULL   -- both -> conflict, leave NULL
     WHEN cls.okr_count > 0 THEN 'okrs'
     ELSE 'objectives_kpis'                                    -- obj-only OR neither (documented default)
   END
  FROM cls
 WHERE se.id = cls.theme_id
   AND se.measurement_method IS NULL;                          -- idempotent: never overwrite a set method

-- 5. Record both-conflicts (idempotent upsert; leaves resolved rows untouched).
INSERT INTO public.strata_theme_method_conflicts (theme_id, objective_count, theme_okr_count)
SELECT t.id,
  (SELECT count(*) FROM public.strata_strategy_elements c
     WHERE c.parent_id = t.id AND c.element_type='objective' AND c.context='theme' AND c.status<>'retired'),
  (SELECT count(*) FROM public.strata_okrs o WHERE o.theme_id = t.id)
FROM public.strata_strategy_elements t
WHERE t.element_type='theme' AND t.context='theme' AND t.status<>'retired'
  AND (SELECT count(*) FROM public.strata_strategy_elements c
         WHERE c.parent_id=t.id AND c.element_type='objective' AND c.context='theme' AND c.status<>'retired') > 0
  AND (SELECT count(*) FROM public.strata_okrs o WHERE o.theme_id=t.id) > 0
ON CONFLICT (theme_id) DO UPDATE
  SET objective_count = EXCLUDED.objective_count,
      theme_okr_count = EXCLUDED.theme_okr_count,
      detected_at = now()
WHERE public.strata_theme_method_conflicts.resolved_at IS NULL;
