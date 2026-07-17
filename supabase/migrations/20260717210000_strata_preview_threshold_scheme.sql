-- CAT-STRATA-IMPL-20260712-001 · R5 · capability 3 — preview-with-data (threshold schemes only)
-- Plan Lock: blueprint §2.3 (preview a configuration change against real data) · authorization R5.
--
-- ── WHAT THIS PREVIEWS ─────────────────────────────────────────────────────
-- "If these same scores were rated by the CANDIDATE bands instead of the scheme's current bands,
-- which values would land in a different band, and which ones exactly?" It re-bands the scores
-- already stored in strata_calculated_values. That is a pure read of existing rows.
--
-- ── WHY IT WRITES NOTHING — AND WHY THAT IS NOT MERELY AN OPTIMISATION ──────
-- D-1: approved governed entities are immutable. A preview is a QUESTION, not an act. It therefore
-- writes nothing at all — not even an audit event, because emitting one would record that something
-- HAPPENED when nothing did, and would make an idle preview indistinguishable from a change in the
-- trail. STABLE (not VOLATILE) is the enforcement, not the label: Postgres rejects INSERT/UPDATE/
-- DELETE inside a STABLE function at runtime, so this contract is checked by the engine rather than
-- by reviewer goodwill.
-- Precedent for "evaluate without writing": strata_import_execution_batch(p_dry_run boolean) —
-- 20260706201000_strata_execution_import_rpc.sql — "p_dry_run=true previews validation with zero
-- writes". Same contract, narrower subject.
--
-- ── ⚠️ WHAT "MOVED" DOES *NOT* MEAN — READ THIS BEFORE TRUSTING THE OUTPUT ──
-- Saving new bands does NOT re-rate the rows this preview reports. status_key is written ONCE, at
-- calculation time, by strata_calc_kpi_achievement / strata_calc_scorecard_instance. Editing bands
-- changes how FUTURE calculations rate; it never retro-rates stored history, and locked snapshots
-- are never re-rated at all (D-1). So `moves` is NOT a list of rows that will change when you save.
-- It is the honest answer to a counterfactual: "these are the values whose rating the new policy
-- disagrees with." That is precisely what a policy author needs to see — but calling it "rows that
-- will change" would be a lie, so this migration does not call it that anywhere.
--
-- ── REUSE OF THE RESOLVER — the F-3 failure mode, and why an extraction was unavoidable ─────
-- strata_band_from_score(p_score, p_scheme) reads bands FROM THE TABLE by scheme id. It physically
-- cannot rate a score against CANDIDATE bands that are not (and must never be) in the table — the
-- candidate is unsaved by definition. The options were:
--   (a) re-derive the predicate inside the preview → two copies of the banding rule that drift the
--       day either is touched. This is exactly the F-3 failure mode, so it is rejected.
--   (b) EXTRACT the predicate into a bands-taking helper and have strata_band_from_score DELEGATE
--       to it → ONE predicate, used by both the live resolver and the preview. Drift is then not
--       "avoided by discipline", it is impossible: there is only one copy.
-- (b) is taken. strata_band_from_bands below is the ORIGINAL query body, moved verbatim, with
-- `strata_threshold_schemes s, jsonb_array_elements(s.bands)` replaced by
-- `jsonb_array_elements(p_bands)` and nothing else altered — same floor predicate, same DESC/LIMIT 1
-- pick, same lowest-floor fallback, same NULL handling. strata_band_from_score keeps its exact
-- signature, volatility and behaviour; its two callers (strata_calc_kpi_achievement,
-- strata_calc_scorecard_instance) are untouched and unaware.
-- Behaviour preservation is PROVEN, not asserted: across all 7,156 stored values attributed to the
-- live scheme, the refactored resolver reproduces the stored status_key with 0 disagreements —
-- the same 0 the pre-refactor function scored (measured both sides; see 06_VALIDATION_EVIDENCE.md).
--
-- ── A BAND IS A FLOOR. THERE IS NO max, THERE IS NO rag ─────────────────────
-- {key, label, min_score, appearance?}. A score is rated by the HIGHEST floor at or below it; a
-- score under every floor falls back to the LOWEST floor. Anything that reintroduces a max/rag
-- notion here is inventing policy the resolver does not implement.
--
-- ── WHAT IT CANNOT SEE (declared, not hidden — see coverage_note) ───────────
-- A value is attributable to a scheme only through its calculation provenance
-- (config_context->>'threshold_scheme_id', written by the calc engine). Probed on staging today:
--   values whose provenance carries NO threshold_scheme_id .... 443  (invisible to every scheme)
--   values for the live scheme with NO score ................... ~40  (a NULL score has no band)
-- Those rows cannot be re-banded and are reported as counts, never silently dropped. Absence from
-- `moves` is NOT evidence that a value does not move — it may simply be unattributable. An honest
-- lower bound beats a false all-clear. Precedent: strata_data_source_blast_radius.coverage_note
-- (20260717150000).
--
-- ── NAMES, NOT JUST A COUNT ────────────────────────────────────────────────
-- `moves` NAMES the KPIs / scorecard lines / perspectives that move, the way blast_radius names its
-- blockers. "37 values would change band" is unactionable; a decision needs to know WHICH. Naming is
-- capped (500) to bound the payload, and the cap reports its own overflow rather than truncating in
-- silence. scorecard_line rows carry no name of their own (probed: the table has id + kpi_id only),
-- so they are named by their KPI. An entity_type with no known name table yields NULL — never a
-- fabricated label (zero-assumption).

-- ── 1. the banding predicate, extracted — ONE copy, shared by resolver + preview ────
CREATE OR REPLACE FUNCTION public.strata_band_from_bands(p_score numeric, p_bands jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE band text;
BEGIN
  IF p_score IS NULL OR p_bands IS NULL THEN RETURN NULL; END IF;
  -- Highest floor at or below the score.
  SELECT b->>'key' INTO band
    FROM jsonb_array_elements(p_bands) b
   WHERE (b->>'min_score')::numeric <= p_score
   ORDER BY (b->>'min_score')::numeric DESC
   LIMIT 1;
  -- Under every floor → the lowest band. (Verbatim from the original resolver.)
  IF band IS NULL THEN
    SELECT b->>'key' INTO band
      FROM jsonb_array_elements(p_bands) b
     ORDER BY (b->>'min_score')::numeric ASC
     LIMIT 1;
  END IF;
  RETURN band;
END;
$function$;

COMMENT ON FUNCTION public.strata_band_from_bands(numeric, jsonb) IS
  'The banding predicate, extracted so the live resolver and the R5 preview share ONE copy and cannot drift (F-3). A band is a FLOOR: highest min_score at or below the score wins; a score under every floor falls back to the lowest floor; NULL score or NULL bands -> NULL. Pure — reads no table, writes nothing.';

GRANT EXECUTE ON FUNCTION public.strata_band_from_bands(numeric, jsonb) TO authenticated;

-- ── 2. the live resolver, now DELEGATING — same signature, same behaviour ───────────
-- Deliberately behaviour-preserving. The scheme lookup and the NULL-scheme guard stay here; the
-- rating rule moves to the helper. A missing scheme yields NULL bands -> NULL, exactly as the old
-- body's two no-row queries did.
CREATE OR REPLACE FUNCTION public.strata_band_from_score(p_score numeric, p_scheme uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_bands jsonb;
BEGIN
  IF p_score IS NULL OR p_scheme IS NULL THEN RETURN NULL; END IF;
  SELECT s.bands INTO v_bands FROM public.strata_threshold_schemes s WHERE s.id = p_scheme;
  RETURN public.strata_band_from_bands(p_score, v_bands);
END;
$function$;

COMMENT ON FUNCTION public.strata_band_from_score(numeric, uuid) IS
  'Rates a score against a SAVED scheme''s bands. Delegates the rule to strata_band_from_bands so the R5 preview (which must rate against UNSAVED candidate bands) shares the identical predicate rather than re-deriving it. Behaviour unchanged: same floor rule, same lowest-floor fallback, same NULLs.';

-- ── 3. the preview — STABLE, zero writes, names what moves, declares what it misses ──
CREATE OR REPLACE FUNCTION public.strata_preview_threshold_scheme(p_scheme uuid, p_bands jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_scheme record;
  v_b jsonb;
  v_probe numeric;
  v_evaluated int; v_moved int; v_drift int; v_locked int;
  v_moves jsonb; v_named int; v_dist jsonb;
  v_no_scheme int; v_no_score int;
  c_cap constant int := 500;
BEGIN
  -- Matches the table's own SELECT policy (strata_threshold_schemes_select USING
  -- current_user_is_approved()) — probed, not assumed. A read-only preview is deliberately NOT
  -- gated harder than the read it is made of: over-gating a question invites saving-to-see.
  IF NOT public.current_user_is_approved() THEN
    RAISE EXCEPTION 'Not authorized to preview threshold schemes.';
  END IF;

  SELECT * INTO v_scheme FROM public.strata_threshold_schemes WHERE id = p_scheme;
  IF v_scheme.id IS NULL THEN RAISE EXCEPTION 'Threshold scheme not found.'; END IF;

  -- Validate the candidate exactly as far as the resolver's own contract requires — no further.
  IF p_bands IS NULL OR jsonb_typeof(p_bands) <> 'array' THEN
    RAISE EXCEPTION 'Candidate bands must be a JSON array — the bands column''s own CHECK.';
  END IF;
  IF jsonb_array_length(p_bands) = 0 THEN
    RAISE EXCEPTION 'Candidate bands must contain at least one band — with none, every score rates as no band at all.';
  END IF;
  FOR v_b IN SELECT * FROM jsonb_array_elements(p_bands) LOOP
    IF COALESCE(v_b->>'key', '') = '' THEN
      RAISE EXCEPTION 'Every candidate band needs a non-empty key — a rated value stores only the key.';
    END IF;
    IF v_b->>'min_score' IS NULL THEN
      RAISE EXCEPTION 'Band "%" needs a min_score — a band is a floor, and a floor is its number.', v_b->>'key';
    END IF;
    BEGIN
      v_probe := (v_b->>'min_score')::numeric;  -- the same cast the resolver performs
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'Band "%" has a min_score that is not a number — the rating query casts it to numeric.', v_b->>'key';
    END;
  END LOOP;

  -- Counts over the attributable, scoreable population.
  WITH scoped AS (
    SELECT cv.score, cv.status_key, cv.snapshot_id
      FROM public.strata_calculated_values cv
     WHERE cv.config_context->>'threshold_scheme_id' = p_scheme::text
       AND cv.score IS NOT NULL
  ), banded AS (
    SELECT s.*,
           public.strata_band_from_bands(s.score, v_scheme.bands) AS band_today,
           public.strata_band_from_bands(s.score, p_bands)        AS band_candidate
      FROM scoped s
  )
  SELECT count(*),
         count(*) FILTER (WHERE band_today IS DISTINCT FROM band_candidate),
         count(*) FILTER (WHERE status_key IS DISTINCT FROM band_today),
         count(*) FILTER (WHERE band_today IS DISTINCT FROM band_candidate AND snapshot_id IS NOT NULL)
    INTO v_evaluated, v_moved, v_drift, v_locked
    FROM banded;

  -- The movers, NAMED (blast_radius precedent), capped with an honest overflow.
  WITH scoped AS (
    SELECT cv.entity_type, cv.entity_id, cv.period_id, cv.metric_key,
           cv.value, cv.score, cv.snapshot_id
      FROM public.strata_calculated_values cv
     WHERE cv.config_context->>'threshold_scheme_id' = p_scheme::text
       AND cv.score IS NOT NULL
  ), banded AS (
    SELECT s.*,
           public.strata_band_from_bands(s.score, v_scheme.bands) AS band_today,
           public.strata_band_from_bands(s.score, p_bands)        AS band_candidate
      FROM scoped s
  ), movers AS (
    SELECT * FROM banded WHERE band_today IS DISTINCT FROM band_candidate
     ORDER BY entity_type, entity_id, period_id
     LIMIT c_cap
  )
  SELECT jsonb_agg(jsonb_build_object(
           'entity_type', m.entity_type,
           'entity_id',   m.entity_id,
           -- Zero-assumption: an entity_type with no name source stays NULL. Never invented.
           'entity_name', CASE m.entity_type
                            WHEN 'kpi'                THEN (SELECT k.name FROM public.strata_kpis k WHERE k.id = m.entity_id)
                            WHEN 'perspective'        THEN (SELECT x.name FROM public.strata_perspectives x WHERE x.id = m.entity_id)
                            WHEN 'scorecard_instance' THEN (SELECT x.name FROM public.strata_scorecard_instances x WHERE x.id = m.entity_id)
                            WHEN 'project_card'       THEN (SELECT x.name FROM public.strata_project_cards x WHERE x.id = m.entity_id)
                            -- scorecard_lines has no name of its own (id + kpi_id only) — named by its KPI.
                            WHEN 'scorecard_line'     THEN (SELECT k.name FROM public.strata_scorecard_lines l
                                                              JOIN public.strata_kpis k ON k.id = l.kpi_id
                                                             WHERE l.id = m.entity_id)
                            ELSE NULL
                          END,
           'period_id',      m.period_id,
           'period_name',    (SELECT p.name FROM public.strata_periods p WHERE p.id = m.period_id),
           'metric_key',     m.metric_key,
           'value',          m.value,
           'score',          m.score,
           'band_today',     m.band_today,
           'band_candidate', m.band_candidate,
           'in_locked_snapshot', (m.snapshot_id IS NOT NULL)
         ) ORDER BY m.entity_type, m.entity_id, m.period_id)
    INTO v_moves
    FROM movers m;

  v_named := COALESCE(jsonb_array_length(v_moves), 0);

  -- Band populations before/after, over the union of both band vocabularies.
  WITH scoped AS (
    SELECT cv.score FROM public.strata_calculated_values cv
     WHERE cv.config_context->>'threshold_scheme_id' = p_scheme::text AND cv.score IS NOT NULL
  ), banded AS (
    SELECT public.strata_band_from_bands(s.score, v_scheme.bands) AS band_today,
           public.strata_band_from_bands(s.score, p_bands)        AS band_candidate
      FROM scoped s
  ), keys AS (
    SELECT DISTINCT band_today AS k FROM banded WHERE band_today IS NOT NULL
    UNION
    SELECT DISTINCT band_candidate FROM banded WHERE band_candidate IS NOT NULL
  )
  SELECT jsonb_agg(jsonb_build_object(
           'key', k.k,
           'count_today',     (SELECT count(*) FROM banded b WHERE b.band_today = k.k),
           'count_candidate', (SELECT count(*) FROM banded b WHERE b.band_candidate = k.k)
         ) ORDER BY k.k)
    INTO v_dist FROM keys k;

  -- What the analysis cannot see. Counted, never quietly dropped.
  SELECT count(*) FILTER (WHERE cv.config_context->>'threshold_scheme_id' IS NULL),
         count(*) FILTER (WHERE cv.config_context->>'threshold_scheme_id' = p_scheme::text AND cv.score IS NULL)
    INTO v_no_scheme, v_no_score
    FROM public.strata_calculated_values cv;

  RETURN jsonb_build_object(
    'scheme', jsonb_build_object('id', v_scheme.id, 'name', v_scheme.name,
                                 'status', v_scheme.status, 'version', v_scheme.version),
    'current_bands', v_scheme.bands,
    'candidate_bands', p_bands,
    'evaluated', v_evaluated,
    'moved_count', v_moved,
    'moves', COALESCE(v_moves, '[]'::jsonb),
    'moves_named', v_named,
    'moves_not_named', greatest(v_moved - v_named, 0),
    'band_distribution', COALESCE(v_dist, '[]'::jsonb),
    'moves_in_locked_snapshots', v_locked,
    'stored_status_drift', v_drift,
    'not_visible', jsonb_build_object(
      'values_with_no_scheme_in_provenance', v_no_scheme,
      'values_for_this_scheme_with_no_score', v_no_score),
    'coverage_note',
      'This preview re-rates the scores ALREADY stored for this scheme against the candidate bands. '
      || 'It does not re-run the calculation engine, and saving these bands would NOT re-rate any row listed here: '
      || 'a rating is written once, at calculation time, so new bands govern FUTURE calculations only and locked '
      || 'snapshots are never re-rated. Read `moves` as "values the candidate policy would rate differently", not as '
      || '"rows that will change". Coverage is a LOWER BOUND: a value is attributable to a scheme only via its '
      || 'calculation provenance, so ' || v_no_scheme || ' value(s) carrying no threshold_scheme_id are invisible to '
      || 'every scheme, and ' || v_no_score || ' value(s) for this scheme have no score and therefore no band. '
      || 'Absence from `moves` is not evidence that a value does not move.'
  );
END;
$function$;

COMMENT ON FUNCTION public.strata_preview_threshold_scheme(uuid, jsonb) IS
  'R5 capability 3 — preview-with-data for threshold schemes. Re-bands stored strata_calculated_values scores against CANDIDATE bands and NAMES what moves (blast_radius precedent), never merely counting. STABLE: writes nothing, not even an audit event — a preview is a question, not an act (D-1), and Postgres enforces that at runtime. Shares the banding predicate with the live resolver via strata_band_from_bands, so it cannot drift from strata_band_from_score. `moves` is a counterfactual ("the candidate would rate these differently"), NOT a list of rows that saving would change — ratings are written at calculation time and locked snapshots never re-rate. See coverage_note: values with no threshold_scheme_id in provenance, or no score, are invisible; absence is not evidence.';

GRANT EXECUTE ON FUNCTION public.strata_preview_threshold_scheme(uuid, jsonb) TO authenticated;
