-- CAT-STRATA-KPI-OPMODEL-20260720-001 · Slice S8 — formula version date-scoped resolution
-- Forward-only, additive. Applies the KPI-lineage effective-dating pattern (which the
-- shipped code applied to strata_kpis but NOT to formula versions) to
-- strata_kpi_formula_versions, so a calc date resolves exactly one effective approved
-- formula and two approved versions cannot be simultaneously effective.
--
-- Closes gap: STRATA-KPI-003 (structural). Wiring the calc engine to prefer this resolver
-- over "latest approved" is a follow-up (calc reproduction) noted in the ledger.
-- ---------------------------------------------------------------------------

ALTER TABLE public.strata_kpi_formula_versions
  ADD COLUMN IF NOT EXISTS effective_from timestamptz,
  ADD COLUMN IF NOT EXISTS effective_to timestamptz;
COMMENT ON COLUMN public.strata_kpi_formula_versions.effective_from IS
  'Effective-from for date-scoped formula resolution (STRATA-KPI-003). Backfilled from approved_at/created for existing approved rows.';

-- Backfill existing approved rows so resolution is deterministic AND non-overlapping:
-- effective_from from approved_at/created; effective_to = the next approved version's
-- start (NULL for the latest), so the EXCLUDE constraint below never conflicts even
-- when a KPI already carries several approved formula versions. Drafts stay NULL.
WITH ordered AS (
  SELECT id, kpi_id,
         COALESCE(effective_from, approved_at, created_at) AS eff_from,
         lead(COALESCE(effective_from, approved_at, created_at))
           OVER (PARTITION BY kpi_id ORDER BY version) AS next_from
    FROM public.strata_kpi_formula_versions
   WHERE status = 'approved'
)
UPDATE public.strata_kpi_formula_versions f
   SET effective_from = o.eff_from,
       effective_to   = o.next_from
  FROM ordered o
 WHERE f.id = o.id AND f.effective_from IS NULL;

-- One effective approved formula per KPI at any instant (no overlap). btree_gist may be
-- needed for the EXCLUDE; guard its creation so the migration is safe if unavailable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'btree_gist') THEN
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'strata_formula_no_overlap') THEN
      ALTER TABLE public.strata_kpi_formula_versions
        ADD CONSTRAINT strata_formula_no_overlap EXCLUDE USING gist (
          kpi_id WITH =,
          tstzrange(effective_from, COALESCE(effective_to, 'infinity'::timestamptz)) WITH &&
        ) WHERE (status = 'approved' AND effective_from IS NOT NULL);
    END IF;
  END IF;
END $$;

-- Date-scoped resolver: the one approved formula effective at p_as_of (STRATA-KPI-003).
CREATE OR REPLACE FUNCTION public.strata_resolve_kpi_formula(p_kpi uuid, p_as_of timestamptz DEFAULT now())
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid;
BEGIN
  p_as_of := COALESCE(p_as_of, now());
  -- prefer a version whose effective window contains p_as_of; fall back to latest approved
  SELECT id INTO v_id FROM public.strata_kpi_formula_versions
   WHERE kpi_id = p_kpi AND status = 'approved' AND effective_from IS NOT NULL
     AND effective_from <= p_as_of AND (effective_to IS NULL OR effective_to > p_as_of)
   ORDER BY effective_from DESC LIMIT 1;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.strata_kpi_formula_versions
     WHERE kpi_id = p_kpi AND status = 'approved'
     ORDER BY version DESC LIMIT 1;
  END IF;
  RETURN v_id;
END; $function$;
COMMENT ON FUNCTION public.strata_resolve_kpi_formula(uuid,timestamptz) IS
  'Resolves the single effective approved formula version for a KPI at an instant (STRATA-KPI-003). Falls back to latest approved when no effective window is set (compat with legacy rows).';
GRANT EXECUTE ON FUNCTION public.strata_resolve_kpi_formula(uuid,timestamptz) TO authenticated;
