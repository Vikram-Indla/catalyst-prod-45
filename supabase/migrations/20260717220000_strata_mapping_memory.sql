-- CAT-STRATA-IMPL-20260712-001 · R5 · N — mapping memory (capability 11)
-- Plan Lock: 03_PLAN_LOCK_BACKEND_PROGRAM.md:245 (R5 lane N), :336 (cap 11) · authorization R5.
-- Decision honoured: P4-D6 (09_DECISIONS.md:98-99) — mapping memory attaches to the lineageApi
-- staging path (strata_upload_runs / strata_staging_rows), NOT importExecutionBatch. Not re-opened.
--
-- ⚠️ ── READ THIS BEFORE EXTENDING: THE SPEC FOR CAP 11 IS THIN ────────────────
-- The blueprint NAMES cap 11 but never specifies it. The only stated rules are 12_CAPABILITY_MATRIX.md:85
-- ("source identity, source key, target entity/type, confidence, owner, status, effective dates,
-- last-confirmed, version/audit; suggest-not-assume; conflicts require human resolution; retired
-- targets not reused; evidence immutable") — and that line was written by a prior session, not ruled
-- by Vikram. This migration implements EXACTLY those rules and INVENTS NOTHING BEYOND THEM. Where a
-- rule is absent it is left absent and reported for a ruling, not filled in with a plausible guess.
--
-- ── WHAT A MAPPING ACTUALLY IS HERE — probed, not assumed ───────────────────
-- The brief says "maps a source column to a STRATA target (e.g. a KPI)". The SURFACE DOES NOT DO THAT.
-- StrataUploadWizardPage.tsx:69-81 (buildMapRows) maps an incoming file header to a TEMPLATE COLUMN
-- from strata_upload_templates.column_schema — never to a KPI. The KPI is a *cell value* inside the
-- mapped `kpi_slug` column, resolved server-side at promote, not a mapping target.
-- So the remembered decision is:  (data_source, template, source_key) -> target_column.
-- Modelling "column -> KPI" would have been a table with no producer and no consumer. Probed bound:
-- strata_promote_run is template-gated and consumes target_entity='kpi_actual' ONLY, and the single
-- approved template today is "KPI Actuals (Quarterly)" v1 with columns kpi_slug/period/value/confidence.
-- Inventing targets the promote path cannot consume was explicitly out of scope.
--
-- ── APPEND-ONLY, ZERO MUTATION — "evidence immutable" taken literally ───────
-- Precedent mirrored: strata_integrity_exceptions (20260716190000) — SELECT to approved users, INSERT
-- gated by role, NO update/delete policy plus an explicit REVOKE so the intent is stated rather than
-- resting on the absence of a policy, and strata_audit() on the table.
-- Every row is ONE confirmation event and is never rewritten. There is no `status` column and no
-- `effective_to`: both would require a supersede path, a supersede path requires a rule for what
-- supersedes what, and NO SUCH RULE IS STATED (see the RULING NEEDED block). A `status` column that
-- could only ever hold 'active' is not a fact, it is decoration. Current state is DERIVED by reading
-- the ledger, which is why the ledger can stay immutable.
--
-- ── suggest-not-assume — enforced by SHAPE, not by discipline ───────────────
-- strata_suggest_mapping is STABLE and returns rows. It cannot write, and it does not touch
-- strata_staging_rows. There is no code path by which a stored mapping binds a column: the wizard
-- receives a suggestion and a human presses confirm, which is the ONLY thing that inserts. A
-- suggestion is data, never an act.
--
-- ── conflicts: DETECTED and REFUSED, never resolved ─────────────────────────
-- If a source_key has >1 surviving candidate target, status='conflict', suggested_target is NULL and
-- every candidate is NAMED. The RPC does not pick, does not rank, does not prefer the most recent.
-- Recency-wins is the obvious guess and it is NOT a stated rule, so it is not implemented.
-- A standing conflict does not block anything: mapping memory is advisory, so the wizard still lets
-- the steward map by hand. It degrades to "no suggestion + here are the candidates", never to a lie.
--
-- ── retired targets are not reused — the states are PROBED, not guessed ─────
-- Probed 2026-07-17 on staging (cyijbdeuehohvhnsywig):
--   strata_upload_templates_status_check = (draft | pending_approval | approved | retired | superseded)
--   strata_data_sources_status_check     = (registered | active | suspended | retired)
-- A candidate is dropped when ANY of these hold:
--   1. the target_column is no longer present in the template's CURRENT column_schema (the contract
--      moved on — the memory is of a column that no longer exists);
--   2. the template is not 'approved' (covers BOTH 'retired' and 'superseded' without hardcoding a
--      guess about which of the two is "the" retired state);
--   3. the data source is 'retired'.
-- Dropped candidates are dropped SILENTLY from the suggestion, never downgraded into a weak suggestion.
--
-- ── role gate: the REAL import-path predicate, mirrored not copied ──────────
-- Probed pg_policies on staging: strata_upload_runs.strata_runs_insert WITH CHECK =
--   strata_has_role(ARRAY['data_steward','kpi_owner','strategy_office']) AND initiated_by = auth.uid()
-- That exact predicate is mirrored here (with confirmed_by = auth.uid()). It is NOT copied from
-- strata_integrity_exceptions, whose gate is strategy_office-only — that would have locked out the
-- data stewards who actually do the mapping. strata_has_role short-circuits on strata_is_admin, so
-- an admin passes without a role assignment; that is the existing platform behaviour, not new here.
-- Both RPCs are SECURITY INVOKER (the default) ON PURPOSE: the RLS policies ARE the gate. A
-- SECURITY DEFINER wrapper would bypass RLS and make the gate unprovable.
--
-- ── WHAT THIS MIGRATION DELIBERATELY DOES *NOT* BUILD, AND WHY ──────────────
--  · No `confidence` column. The matrix lists it, but NOTHING in the surface produces one. The wizard's
--    AUTO/CONFIRM/DECIDE (StrataUploadWizardPage.tsx:63) is a heuristic about the CURRENT filename
--    match, not a confidence in the remembered decision, and the template's own `confidence` column is
--    a KPI-actual value — a different thing that happens to share a name. A column with no producer
--    would be NULL forever and would invite a fabricated red/amber/green scale on top of it.
--  · No `version` column. Derivable from the ledger (count of prior confirmations); storing it would
--    add a second source of truth that can disagree with the rows.
--  · No `status` / `effective_to`. See the append-only note above — they need a supersede rule.
--  · No conflict-RESOLUTION RPC. "Conflicts require human resolution" states the DETECTION and the
--    REFUSAL; it does not state the resolution ACT. Guessing it is out of scope.
--  · No cross-version memory. Memory is keyed to a specific template_id. Templates version, and a new
--    version is a new row with a new id, so a version bump silently starts memory from empty rather
--    than carrying a mapping across a contract change nobody approved.
--  · data_source_id is NOT NULL. The wizard makes the source OPTIONAL (StrataUploadWizardPage.tsx:352).
--    A run with no source cannot be remembered: NULL means "not recorded", never "none", so two
--    NULL-source runs are NOT known to be the same source and matching them would be a fabricated join.
--    No source selected = no memory, and the UI says so rather than silently remembering nothing.
--
-- ── RULING NEEDED (do not resolve these by writing code) ────────────────────
--  R-1. Is re-mapping a header to a DIFFERENT column a CORRECTION (supersedes the old) or a genuine
--       CONFLICT (both stand)? This migration treats it as a conflict, because "conflicts require human
--       resolution" is stated and "recency wins" is not. If it is a correction, a supersede path is
--       needed and `status`/`effective_to` become real.
--  R-2. What ACT resolves a conflict, and who may perform it? Until ruled, a conflict is permanent —
--       harmless (it only withholds a suggestion) but never clearable.
--  R-3. Should memory carry across template VERSIONS? Today it does not.

-- ── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strata_mapping_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- source identity (matrix): the registered feed the decision was made about. NOT NULL — see above.
  data_source_id uuid NOT NULL REFERENCES public.strata_data_sources(id) ON DELETE CASCADE,
  -- the governed contract the decision was made against (a specific template VERSION).
  template_id uuid NOT NULL REFERENCES public.strata_upload_templates(id) ON DELETE CASCADE,
  -- source key (matrix): the incoming column header, retained VERBATIM for display/provenance.
  source_key text NOT NULL CHECK (btrim(source_key) <> ''),
  -- match key: mirrors the client's normName() (StrataUploadWizardPage.tsx:65) so "Net Revenue",
  -- "net_revenue" and "netrevenue" are recognised as the same incoming column. Kept as a stored
  -- column (not an expression index) so the exact normalisation is inspectable in the row.
  source_key_norm text NOT NULL CHECK (btrim(source_key_norm) <> ''),
  -- target (matrix "target entity/type"): a column of template.column_schema. The ENTITY is not
  -- duplicated here — it is strata_upload_templates.target_entity, one FK away. Denormalising it
  -- would let the copy drift from the template that owns it.
  target_column text NOT NULL CHECK (btrim(target_column) <> ''),
  -- owner + last-confirmed (matrix). confirmed_at is also the effective_from: the mapping is evidence
  -- from this instant onward. There is no effective_to (see header).
  confirmed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  -- provenance: the run the confirmation was made during. NULL = not recorded (never "no run").
  upload_run_id uuid REFERENCES public.strata_upload_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.strata_mapping_memory IS
  'Append-only ledger of column-mapping confirmations (capability 11). One row = one human confirming that an incoming source_key means target_column, for a given data source + template version. Rows are NEVER updated or deleted: current state is DERIVED, which is what keeps the evidence immutable. Read ONLY via strata_suggest_mapping, which SUGGESTS and never applies: a remembered mapping has no path to bind a column without a human pressing confirm. Where a source_key has more than one surviving candidate the suggestion is withheld and every candidate is named — the system reports conflicts, it does not resolve them.';
COMMENT ON COLUMN public.strata_mapping_memory.source_key_norm IS
  'Normalised source_key (lowercase, alphanumerics only) mirroring the wizard client heuristic. Match key.';
COMMENT ON COLUMN public.strata_mapping_memory.upload_run_id IS
  'Run during which the confirmation was made. NULL means NOT RECORDED — never "no run".';

CREATE INDEX IF NOT EXISTS strata_mapping_memory_lookup_idx
  ON public.strata_mapping_memory (data_source_id, template_id, source_key_norm, confirmed_at DESC);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.strata_mapping_memory ENABLE ROW LEVEL SECURITY;

-- Readable by every approved user: the suggestion carries provenance ("last confirmed by X on DATE")
-- and is shown to whoever is running the wizard, so a steward-only read would break the surface.
DROP POLICY IF EXISTS strata_mapping_memory_select ON public.strata_mapping_memory;
CREATE POLICY strata_mapping_memory_select ON public.strata_mapping_memory
  FOR SELECT USING (public.current_user_is_approved());

-- Mirrors strata_runs_insert exactly — same roles that may create the run may record what it mapped.
DROP POLICY IF EXISTS strata_mapping_memory_insert ON public.strata_mapping_memory;
CREATE POLICY strata_mapping_memory_insert ON public.strata_mapping_memory
  FOR INSERT WITH CHECK (
    public.strata_has_role(ARRAY['data_steward','kpi_owner','strategy_office'])
    AND confirmed_by = auth.uid()
  );

-- No UPDATE policy and no DELETE policy — append-only. The REVOKE states the intent explicitly rather
-- than leaving it to be inferred from a missing policy (strata_integrity_exceptions precedent).
REVOKE UPDATE, DELETE ON public.strata_mapping_memory FROM authenticated;

DROP TRIGGER IF EXISTS trg_strata_mapping_memory_audit ON public.strata_mapping_memory;
CREATE TRIGGER trg_strata_mapping_memory_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.strata_mapping_memory
  FOR EACH ROW EXECUTE FUNCTION public.strata_audit();

-- ── Suggest (read-only) ─────────────────────────────────────────────────────
-- STABLE + SECURITY INVOKER: it cannot write, and RLS applies to the caller so the gate is provable.
-- Returns one row per requested source_key, ALWAYS — a key with no memory returns status='none' with
-- NULL suggested_target, so the caller can render nothing rather than guess.
CREATE OR REPLACE FUNCTION public.strata_suggest_mapping(
  p_data_source_id uuid,
  p_template_id uuid,
  p_source_keys text[]
)
RETURNS TABLE (
  source_key text,
  status text,                 -- 'none' | 'suggested' | 'conflict'
  suggested_target text,       -- NULL unless status='suggested'
  candidates text[],           -- every surviving candidate, NAMED. NULL when status='none'.
  last_confirmed_by uuid,
  last_confirmed_by_name text,
  last_confirmed_at timestamptz,
  times_confirmed int
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH asked AS (
    SELECT DISTINCT
           k AS source_key,
           lower(regexp_replace(k, '[^a-zA-Z0-9]', '', 'g')) AS norm
    FROM unnest(coalesce(p_source_keys, ARRAY[]::text[])) AS k
    WHERE btrim(k) <> ''
  ),
  -- The template contract AS IT STANDS NOW. A memory of a column that has since left the schema is
  -- a memory of something that no longer exists.
  live_cols AS (
    SELECT t.id, (c.value ->> 'column') AS col
    FROM public.strata_upload_templates t
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(t.column_schema, '[]'::jsonb)) AS c(value)
    WHERE t.id = p_template_id AND t.status = 'approved'
  ),
  -- Surviving candidates only: template approved + column still in schema + source not retired.
  surviving AS (
    SELECT a.source_key,
           m.target_column,
           max(m.confirmed_at) AS last_confirmed_at,
           count(*)::int       AS times_confirmed
    FROM asked a
    JOIN public.strata_mapping_memory m
      ON m.source_key_norm = a.norm
     AND m.data_source_id  = p_data_source_id
     AND m.template_id     = p_template_id
    JOIN live_cols lc ON lc.col = m.target_column
    WHERE EXISTS (
      SELECT 1 FROM public.strata_data_sources ds
      WHERE ds.id = p_data_source_id AND ds.status <> 'retired'
    )
    GROUP BY a.source_key, m.target_column
  ),
  ranked AS (
    SELECT s.*,
           count(*)    OVER (PARTITION BY s.source_key) AS n_candidates,
           row_number() OVER (PARTITION BY s.source_key ORDER BY s.target_column) AS rn
    FROM surviving s
  )
  SELECT
    a.source_key,
    CASE
      WHEN r.n_candidates IS NULL  THEN 'none'
      WHEN r.n_candidates > 1      THEN 'conflict'
      ELSE 'suggested'
    END AS status,
    -- Withheld on conflict. The RPC names the candidates and refuses to choose between them.
    CASE WHEN r.n_candidates = 1 THEN r.target_column END AS suggested_target,
    CASE WHEN r.n_candidates IS NULL THEN NULL
         ELSE (SELECT array_agg(r2.target_column ORDER BY r2.target_column)
               FROM ranked r2 WHERE r2.source_key = a.source_key)
    END AS candidates,
    -- Provenance is for the SINGLE suggested mapping. On conflict there is no single "last confirmed
    -- by", so it stays NULL rather than arbitrarily attributing the conflict to one of the candidates.
    CASE WHEN r.n_candidates = 1 THEN lc.confirmed_by END AS last_confirmed_by,
    CASE WHEN r.n_candidates = 1 THEN lc.full_name END   AS last_confirmed_by_name,
    CASE WHEN r.n_candidates = 1 THEN r.last_confirmed_at END AS last_confirmed_at,
    CASE WHEN r.n_candidates = 1 THEN r.times_confirmed END   AS times_confirmed
  FROM asked a
  LEFT JOIN ranked r ON r.source_key = a.source_key AND r.rn = 1
  LEFT JOIN LATERAL (
    SELECT m.confirmed_by, p.full_name
    FROM public.strata_mapping_memory m
    LEFT JOIN public.profiles p ON p.id = m.confirmed_by
    WHERE m.data_source_id = p_data_source_id
      AND m.template_id    = p_template_id
      AND m.source_key_norm = a.norm
      AND m.target_column  = r.target_column
    ORDER BY m.confirmed_at DESC
    LIMIT 1
  ) lc ON true;
$$;

COMMENT ON FUNCTION public.strata_suggest_mapping(uuid, uuid, text[]) IS
  'SUGGESTS remembered column mappings — never applies them (capability 11, suggest-not-assume). STABLE and SECURITY INVOKER: it cannot write and RLS applies to the caller. One row per requested key: status none|suggested|conflict. Candidates whose target column has left the template schema, whose template is not approved, or whose source is retired are dropped (retired targets are not reused). On conflict the suggestion is WITHHELD and every candidate is named — resolution is a human act this function deliberately does not perform.';

-- ── Record / confirm ────────────────────────────────────────────────────────
-- SECURITY INVOKER: the RLS INSERT policy is the role gate. Appends one immutable confirmation.
-- Re-confirming the SAME target is allowed and meaningful — it is another dated piece of evidence
-- (times_confirmed), not a duplicate to be swallowed.
CREATE OR REPLACE FUNCTION public.strata_record_mapping(
  p_data_source_id uuid,
  p_template_id uuid,
  p_source_key text,
  p_target_column text,
  p_upload_run_id uuid DEFAULT NULL
)
RETURNS public.strata_mapping_memory
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.strata_mapping_memory;
BEGIN
  IF p_data_source_id IS NULL THEN
    -- The wizard allows a run with no registered source. Such a run cannot be remembered: NULL is
    -- "not recorded", not an identity, so it must not become a match key.
    RAISE EXCEPTION 'A registered data source is required to remember a mapping (source was not recorded).'
      USING ERRCODE = '23502';
  END IF;

  -- Only against the contract actually in force. Remembering a mapping to a draft/retired/superseded
  -- template would record a decision about a contract nobody may upload against.
  IF NOT EXISTS (
    SELECT 1 FROM public.strata_upload_templates t
    WHERE t.id = p_template_id AND t.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Template % is not an approved upload contract.', p_template_id
      USING ERRCODE = '23514';
  END IF;

  -- The target must be a real column of that contract. Without this the ledger could accumulate
  -- mappings to columns that never existed, which the suggest filter would silently hide forever.
  IF NOT EXISTS (
    SELECT 1 FROM public.strata_upload_templates t
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(t.column_schema, '[]'::jsonb)) AS c(value)
    WHERE t.id = p_template_id AND (c.value ->> 'column') = p_target_column
  ) THEN
    RAISE EXCEPTION 'Column % is not part of template %.', p_target_column, p_template_id
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.strata_data_sources ds
    WHERE ds.id = p_data_source_id AND ds.status = 'retired'
  ) THEN
    RAISE EXCEPTION 'Data source % is retired.', p_data_source_id USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.strata_mapping_memory (
    data_source_id, template_id, source_key, source_key_norm, target_column, confirmed_by, upload_run_id
  ) VALUES (
    p_data_source_id,
    p_template_id,
    p_source_key,
    lower(regexp_replace(p_source_key, '[^a-zA-Z0-9]', '', 'g')),
    p_target_column,
    auth.uid(),
    p_upload_run_id
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.strata_record_mapping(uuid, uuid, text, text, uuid) IS
  'Appends ONE immutable confirmation that source_key means target_column for a data source + template version (capability 11). SECURITY INVOKER — the RLS insert policy (data_steward | kpi_owner | strategy_office, mirroring strata_runs_insert) is the gate. Refuses a NULL source, a non-approved template, a column outside the template schema, and a retired source. Re-confirming the same target appends further evidence rather than deduplicating.';

GRANT EXECUTE ON FUNCTION public.strata_suggest_mapping(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_record_mapping(uuid, uuid, text, text, uuid) TO authenticated;
