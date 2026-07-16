-- CAT-STRATA-IMPL-20260712-001 · A3b-2 · canonical KPI effective-version resolver (F-9)
-- Plan Lock: F-9 ruling — "EFFECTIVE VERSION RESOLUTION" + "RELATIONSHIPS".
-- Ruling: relationships express CONTINUING BUSINESS INTENT and must resolve through the KPI lineage
-- to the approved version effective for the relevant date. **"Do not allow different UI surfaces to
-- invent their own version resolution."** This migration is that single rule, in one place.
--
-- THE COMPATIBILITY DESIGN (explicitly sanctioned by the ruling, and taken deliberately):
--   Relationship tables (strata_element_kpis, strata_initiative_kpis, strata_scorecard_model_measures)
--   keep their EXISTING kpi_id FK. That column is now read as a LINEAGE ENTRY POINT, not as "the
--   version this relationship is about": strata_resolve_kpi_effective() hops kpi_id -> lineage_id ->
--   the approved version effective at the requested date. Nothing is repointed and no FK changes, so
--   there is no migration risk to live relationships — the ruling's stated condition for this route.
--   Indexes for the hop are added below.
--
-- WHY A FUNCTION AND NOT A VIEW PER SURFACE: the resolution rule has four separate ways to be got
-- wrong (wrong status, wrong date bound, silently picking one of several matches, or defaulting to
-- "latest"). Every one of those is an invisible wrong number. Centralising it means a surface can
-- only be wrong by NOT calling this.
--
-- ZERO-ASSUMPTION, deliberately: NULL is returned when nothing is effective. It is NOT "fall back to
-- the latest version" and NOT "fall back to a draft". A caller that gets NULL must render Missing.
-- Silently substituting a version nobody approved for the requested date is exactly the class of lie
-- this programme exists to remove.

-- ── 1. resolve from a lineage ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_resolve_kpi_version(
  p_lineage uuid,
  p_as_of   timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_ids uuid[];
BEGIN
  IF p_lineage IS NULL THEN RETURN NULL; END IF;

  -- status='approved' ONLY. Draft and pending_approval versions are excluded here, at the single
  -- resolution point, so no official calculation can reach one by construction (E-7, DEF-010).
  SELECT array_agg(k.id) INTO v_ids
    FROM public.strata_kpis k
   WHERE k.lineage_id = p_lineage
     AND k.status = 'approved'
     AND tstzrange(k.effective_from, k.effective_to, '[)') @> p_as_of;

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RETURN NULL;  -- nothing approved is effective then. Render Missing; never guess.
  END IF;

  -- Unreachable while strata_kpis_no_overlapping_effective holds. Kept because if that constraint
  -- is ever dropped or a future exception is granted, the alternative is silently picking one of
  -- several versions — an invisible wrong number. Refuse instead.
  IF array_length(v_ids, 1) > 1 THEN
    RAISE EXCEPTION 'KPI lineage % has % simultaneously effective approved versions at % — refusing to guess which one produced a number',
      p_lineage, array_length(v_ids, 1), p_as_of;
  END IF;

  RETURN v_ids[1];
END;
$function$;

-- ── 2. resolve from ANY version's row id (the relationship entry point) ──────
CREATE OR REPLACE FUNCTION public.strata_resolve_kpi_effective(
  p_kpi   uuid,
  p_as_of timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_lineage uuid;
BEGIN
  IF p_kpi IS NULL THEN RETURN NULL; END IF;
  SELECT lineage_id INTO v_lineage FROM public.strata_kpis WHERE id = p_kpi;
  IF v_lineage IS NULL THEN RETURN NULL; END IF;   -- unknown KPI: render nothing
  RETURN public.strata_resolve_kpi_version(v_lineage, p_as_of);
END;
$function$;

-- ── 3. set-based resolution, for calculations and joins ──────────────────────
-- Per-row function calls do not belong in a calculation over thousands of rows. This is the same
-- rule expressed as a joinable relation, so callers never hand-roll the predicate.
CREATE OR REPLACE FUNCTION public.strata_kpi_effective_at(
  p_as_of timestamptz DEFAULT now()
)
RETURNS TABLE (lineage_id uuid, kpi_id uuid, version integer, effective_from timestamptz, effective_to timestamptz)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT k.lineage_id, k.id, k.version, k.effective_from, k.effective_to
    FROM public.strata_kpis k
   WHERE k.status = 'approved'
     AND tstzrange(k.effective_from, k.effective_to, '[)') @> p_as_of;
$function$;

-- ── 4. the common "as of now" case ───────────────────────────────────────────
-- Current objective/initiative screens show the currently effective approved version (ruling).
-- Historical screens must pass an explicit date to the functions above instead.
CREATE OR REPLACE VIEW public.strata_kpi_current_effective AS
  SELECT lineage_id, kpi_id, version, effective_from, effective_to
    FROM public.strata_kpi_effective_at(now());

COMMENT ON VIEW public.strata_kpi_current_effective IS
  'The approved KPI version effective RIGHT NOW, one row per lineage. For any other date call strata_kpi_effective_at(<date>) or strata_resolve_kpi_effective(<kpi_id>, <date>) — never re-implement the predicate. A lineage with no currently effective approved version is absent from this view: that means Missing, not "use the latest".';

GRANT EXECUTE ON FUNCTION public.strata_resolve_kpi_version(uuid, timestamptz)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_resolve_kpi_effective(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_kpi_effective_at(timestamptz)            TO authenticated;
GRANT SELECT ON public.strata_kpi_current_effective TO authenticated;

-- ── 5. indexes for the lineage hop (the ruling asks for these explicitly) ────
CREATE INDEX IF NOT EXISTS strata_element_kpis_kpi_idx    ON public.strata_element_kpis (kpi_id);
CREATE INDEX IF NOT EXISTS strata_initiative_kpis_kpi_idx ON public.strata_initiative_kpis (kpi_id);
CREATE INDEX IF NOT EXISTS strata_model_measures_kpi_idx  ON public.strata_scorecard_model_measures (kpi_id);
