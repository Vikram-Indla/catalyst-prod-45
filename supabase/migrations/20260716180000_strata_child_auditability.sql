-- CAT-STRATA-IMPL-20260712-001 · P0-C / E-4 · governed-child auditability
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_BACKEND_PROGRAM.md §13
-- E-4 (Vikram): add updated_at, actor fields and INSERT/UPDATE/DELETE audit triggers to every
-- governed child table that can affect calculations. Capture old + new values, parent, actor,
-- timestamp, operation. Reuse strata_audit_events — do not mint a second audit store.
-- F-5 (Vikram, from "do not fabricate … update timestamps"): pre-existing rows get NULL, never
-- now(). Defaulting to now() would assert a change time that never happened — false provenance on
-- the very rows the integrity register is investigating.
--
-- WHY THIS MATTERS: until now these four tables had created_at ONLY. In-place UPDATEs were
-- literally undetectable, which is why every integrity audit to date is a LOWER BOUND and had to
-- say so (§3.7). After this, the register becomes a true census PROSPECTIVELY ONLY — it can never
-- retroactively recover the undetectable past.
--
-- SCOPE — census verified against pg_trigger + information_schema (2026-07-16), not inherited:
--   Exactly these 4 tables lack updated_at AND the touch trigger AND the audit trigger.
--   The other 10 calc-affecting tables (kpi_actuals, kpi_targets, kpi_formula_versions,
--   scorecard_lines, key_results, gate_model_stages, scorecard_instances, theme_charters,
--   upload_runs, benefit_values) ALREADY have all three. Blueprint §13.2 says triggers are "still
--   required" for them — that is FALSE; they are already attached. Nothing is done to them here.
--
-- REUSE (§13.3), verified by reading the shipped bodies:
--   * strata_audit() already inserts (entity_table, entity_id, TG_OP, auth.uid(), before=to_jsonb(OLD),
--     after=to_jsonb(NEW)) into strata_audit_events. It is generic over any table with an `id`.
--     E-4's "old + new values, parent, actor, timestamp, operation" is satisfied by it AS SHIPPED —
--     the parent travels inside the before/after payloads (model_id / kpi_id / element_id).
--     strata_audit_events ALREADY has `before` and `after` jsonb columns. No new audit store, no new
--     columns on it, no new function.
--   * strata_touch_updated_at() is reused VERBATIM for updated_at.
--   Only updated_by has nothing to reuse, so exactly one small function is added below. It is NOT
--   folded into strata_touch_updated_at: that function is shared by 10 other tables which have no
--   updated_by column, and assigning NEW.updated_by there would break every one of them.
--
-- Rollback: drop the triggers, the function, and the three columns per table. Additive; no data loss.

-- ── 1. the one genuinely missing piece ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_touch_updated_by()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$function$;

-- ── 2. columns + triggers on the four exposed children ───────────────────────
-- updated_at is added WITHOUT a default first, so existing rows get NULL (F-5), and only then
-- given a default so new rows are stamped. Same for created_by: we do not know who created the
-- historical rows and must not claim to.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'strata_scorecard_model_perspectives',
    'strata_scorecard_model_measures',
    'strata_element_kpis',
    'strata_initiative_kpis'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN updated_at SET DEFAULT now()', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by uuid', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN created_by SET DEFAULT auth.uid()', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by uuid', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_at()', t, t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_actor ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_actor BEFORE UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.strata_touch_updated_by()', t, t);

    -- E-4: INSERT *and* UPDATE *and* DELETE. A DELETE-blind audit cannot tell "never existed"
    -- from "removed", which is exactly the ambiguity the register exists to close.
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.strata_audit()', t, t);
  END LOOP;
END $$;

-- ── 3. F-5's "unaudited before <date>" marker, stated where it cannot be missed ──
-- NULL here means UNKNOWN, not UNCHANGED. Absence of a timestamp is not evidence of integrity.
COMMENT ON COLUMN public.strata_scorecard_model_perspectives.updated_at IS
  'NULL for rows written before 2026-07-16: this table was unaudited until then (created_at only, and the client''s raw .update() wrote no audit event). NULL means UNKNOWN, never UNCHANGED — in-place updates before that date are undetectable. See E-4/F-5.';
COMMENT ON COLUMN public.strata_scorecard_model_measures.updated_at IS
  'NULL for rows written before 2026-07-16: this table was unaudited until then. NULL means UNKNOWN, never UNCHANGED. See E-4/F-5.';
COMMENT ON COLUMN public.strata_element_kpis.updated_at IS
  'NULL for rows written before 2026-07-16: this table was unaudited until then. NULL means UNKNOWN, never UNCHANGED. See E-4/F-5.';
COMMENT ON COLUMN public.strata_initiative_kpis.updated_at IS
  'NULL for rows written before 2026-07-16: this table was unaudited until then. NULL means UNKNOWN, never UNCHANGED. See E-4/F-5.';
