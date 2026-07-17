-- CAT-STRATA-IMPL-20260712-001 · P0-D / A1 · integrity-exception register (E-1)
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_BACKEND_PROGRAM.md §3.8
-- E-1 (Vikram): preserve and annotate the affected locked snapshots. Do NOT restate — the exact
-- historical child configuration cannot be reconstructed reliably. Frozen values remain OFFICIAL
-- and UNCHANGED; their configuration provenance is QUALIFIED. **Never modify the locked payload.**
-- E-2: B2B Sector Scorecard v1 is a THIRD exception class — legacy/unverified approval provenance
-- (status='approved' with approved_at NULL; never approved via strata_approve_record).
--
-- This register is the ONLY thing that changes about the affected records. It is append-only and
-- additive: it touches no snapshot, no snapshot_items payload, no model, and no calculated value.
-- That is the entire point — D-1 forbids silently rewriting history, and §3.6 established that the
-- NUMBERS are safe (strata_lock_snapshot freezes snapshot_items.payload and calcResult reads the
-- frozen payload for locked instances). What is broken is RESOLUTION: "model v1" no longer
-- re-resolves to the weights that produced the frozen numbers. So the values stay; the provenance
-- claim gets qualified.
--
-- APPEND-ONLY, enforced not merely intended: there is a SELECT policy and an INSERT policy, and
-- deliberately NO UPDATE and NO DELETE policy, plus an explicit REVOKE. An accountability record
-- that can be edited or deleted is not evidence of anything.
--
-- strategy_office_owner is NOT NULL BY DESIGN (F-1). E-1 mandates the field. A NULL owner on an
-- accountability record is precisely the zero-assumption violation this register exists to
-- prevent, and an owner cannot be inferred from schema — it names a person who accepts
-- accountability. Until Vikram names one, the table exists and stays empty. That is the honest
-- state: no rows is visibly "not yet recorded", whereas rows with a NULL//guessed owner would be a
-- fabricated audit trail.
--
-- detection_is_lower_bound defaults TRUE and is NOT NULL: §3.7/§13.4 make this mandatory on every
-- record discovered before the E-4 triggers existed (migration 20260716180000). Absence of evidence
-- of a change is NOT evidence of integrity, and the register must never imply otherwise.

CREATE TABLE IF NOT EXISTS public.strata_integrity_exceptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which kind of integrity failure this record documents.
  --   snapshot_provenance        — a locked snapshot whose stamped config no longer re-resolves (E-1)
  --   model_approval_provenance  — an 'approved' record with no verifiable approval event (E-2)
  exception_class             text NOT NULL
                              CHECK (exception_class IN ('snapshot_provenance','model_approval_provenance')),

  -- NULL for model_approval_provenance: E-2's is a MODEL exception, not a snapshot one.
  affected_snapshot_id        uuid REFERENCES public.strata_snapshots(id),
  affected_model_id           uuid NOT NULL REFERENCES public.strata_scorecard_models(id),
  affected_model_version      integer NOT NULL,

  discovered_on               date NOT NULL,

  -- Prose, deliberately: the finding is "1 model_perspective row written post-lock at
  -- 2026-07-12 07:02:46", which no enum captures. It must be readable by whoever inherits this.
  known_child_changes         text NOT NULL,

  -- §3.6: for both known records this is FALSE — the frozen payload means no number changed.
  -- It is a column rather than an assumption because a future exception might not be so lucky.
  values_changed              boolean NOT NULL,

  provenance_reproducibility  text NOT NULL
                              CHECK (provenance_reproducibility IN ('complete','incomplete','unknown')),

  -- F-1. NOT NULL: see the header.
  strategy_office_owner       uuid NOT NULL,

  resolution                  text NOT NULL
                              CHECK (resolution IN ('preserved_with_qualification','superseded_prospectively','open')),

  -- §3.7 / §13.4 — mandatory on every record predating the E-4 triggers.
  detection_is_lower_bound    boolean NOT NULL DEFAULT true,

  note                        text,
  created_by                  uuid DEFAULT auth.uid(),
  created_at                  timestamptz NOT NULL DEFAULT now(),

  -- A snapshot_provenance record without a snapshot documents nothing; a model_approval_provenance
  -- record with one is misfiled.
  CONSTRAINT strata_integrity_exceptions_snapshot_shape CHECK (
    (exception_class = 'snapshot_provenance'       AND affected_snapshot_id IS NOT NULL) OR
    (exception_class = 'model_approval_provenance' AND affected_snapshot_id IS NULL)
  ),
  -- One record per (class, snapshot, model, version): re-running the audit must not duplicate.
  CONSTRAINT strata_integrity_exceptions_unique
    UNIQUE (exception_class, affected_snapshot_id, affected_model_id, affected_model_version)
);

CREATE INDEX IF NOT EXISTS strata_integrity_exceptions_snapshot_idx
  ON public.strata_integrity_exceptions (affected_snapshot_id);
CREATE INDEX IF NOT EXISTS strata_integrity_exceptions_model_idx
  ON public.strata_integrity_exceptions (affected_model_id, affected_model_version);

ALTER TABLE public.strata_integrity_exceptions ENABLE ROW LEVEL SECURITY;

-- Readable by every approved user: §3.8's surfacing rule says the qualification is visible wherever
-- the qualified numbers appear (scorecard detail, review cockpit, board pack — F-3). A register only
-- strategy_office can read cannot satisfy that.
DROP POLICY IF EXISTS strata_integrity_exceptions_select ON public.strata_integrity_exceptions;
CREATE POLICY strata_integrity_exceptions_select ON public.strata_integrity_exceptions
  FOR SELECT USING (public.current_user_is_approved());

DROP POLICY IF EXISTS strata_integrity_exceptions_insert ON public.strata_integrity_exceptions;
CREATE POLICY strata_integrity_exceptions_insert ON public.strata_integrity_exceptions
  FOR INSERT WITH CHECK (public.strata_has_role(ARRAY['strategy_office']));

-- No UPDATE policy and no DELETE policy — append-only. The REVOKE makes the intent explicit rather
-- than resting on the absence of a policy.
REVOKE UPDATE, DELETE ON public.strata_integrity_exceptions FROM authenticated;

-- Audit the register itself. It is append-only, so in practice this records INSERTs — which is
-- exactly what an accountability record needs: who filed it, when, with what content.
DROP TRIGGER IF EXISTS trg_strata_integrity_exceptions_audit ON public.strata_integrity_exceptions;
CREATE TRIGGER trg_strata_integrity_exceptions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.strata_integrity_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.strata_audit();

COMMENT ON TABLE public.strata_integrity_exceptions IS
  'Append-only register of integrity exceptions (E-1/E-2). Documents locked snapshots whose stamped configuration no longer re-resolves, and governed records approved without a verifiable approval event. Records QUALIFY provenance; they never restate values. The locked payload is never modified. detection_is_lower_bound=true means the finding predates the E-4 child audit triggers: absence of a row is NOT evidence of integrity.';
