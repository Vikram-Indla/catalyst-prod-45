-- CAT-STRATA-IMPL-20260712-001 · P0-D2 · integrity-exception register — owner-role correction
-- Plan Lock: features/CAT-STRATA-IMPL-20260712-001/03_PLAN_LOCK_BACKEND_PROGRAM.md §3.8
--
-- ALIGNMENT WITH THE ALREADY-APPROVED F-1 DECISION — NOT a new product decision.
-- F-1 (Vikram, 2026-07-16): "Accountability belongs to the Strategy Office ROLE; a named person is
-- optional." 20260716190000 modelled the owner as `strategy_office_owner NOT NULL`, which required
-- a named individual and therefore CONTRADICTED that ruling — it made the register unfillable and
-- left the three known exceptions unrecorded. This migration corrects the design and files them.
--
-- The previous session read F-1 as "a name is required and cannot be inferred". The ruling is the
-- opposite: the ROLE is the accountable party, so the register was blocked by its own schema rather
-- than by a missing fact. The zero-assumption principle is still honoured — see assigned_owner_id.
--
-- Safe to restructure: the register is EMPTY (0 rows — it shipped blocked), so the rename cannot
-- lose data and no backfill is needed.
--
-- WHAT IS PRESERVED: append-only (no UPDATE/DELETE policy + REVOKE), the class/shape CHECK, the
-- uniqueness guard, detection_is_lower_bound, and the audit trigger. None are touched.

-- ── 1. accountability is a ROLE ──────────────────────────────────────────────
-- Vocabulary is the shipped one, copied from strata_role_assignments' own CHECK (probed
-- 2026-07-16) rather than invented: narrowing it to a bespoke "accountable roles" subset would mint
-- a second role dictionary — the same failure M-D0/M-D1 exist to prevent, one table over.
ALTER TABLE public.strata_integrity_exceptions
  ADD COLUMN IF NOT EXISTS owner_role text NOT NULL DEFAULT 'strategy_office';

ALTER TABLE public.strata_integrity_exceptions
  DROP CONSTRAINT IF EXISTS strata_integrity_exceptions_owner_role_check;
ALTER TABLE public.strata_integrity_exceptions
  ADD CONSTRAINT strata_integrity_exceptions_owner_role_check
  CHECK (owner_role IN ('strata_admin','strategy_office','executive_viewer','kpi_owner','vmo_validator','data_steward'));

-- ── 2. the personal owner becomes OPTIONAL, and says so in its name ───────────
-- Renamed rather than dropped+added so the column's identity (and any future FK) is continuous.
-- NULL here means "no individual assigned" — accountability rests with owner_role. It does NOT
-- mean "unknown owner": the owner IS the Strategy Office. That distinction is why the personal
-- field is nullable and the role field is not.
ALTER TABLE public.strata_integrity_exceptions
  RENAME COLUMN strategy_office_owner TO assigned_owner_id;
ALTER TABLE public.strata_integrity_exceptions
  ALTER COLUMN assigned_owner_id DROP NOT NULL;

-- ── 3. status + due date — tracked separately from resolution ─────────────────
-- These are NOT the same field. `resolution` is the RULED disposition (E-1: preserve with
-- qualification; E-2: supersede prospectively) and is decided the moment the record is filed.
-- `status` is whether that disposition has been CARRIED OUT. B2B v1 makes the difference concrete:
-- its resolution is 'superseded_prospectively' (ruled), but its status is 'open' (v2 does not exist
-- yet). Collapsing them would let a ruled-but-unperformed remediation read as done.
ALTER TABLE public.strata_integrity_exceptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
ALTER TABLE public.strata_integrity_exceptions
  DROP CONSTRAINT IF EXISTS strata_integrity_exceptions_status_check;
ALTER TABLE public.strata_integrity_exceptions
  ADD CONSTRAINT strata_integrity_exceptions_status_check
  CHECK (status IN ('open','in_progress','closed'));

ALTER TABLE public.strata_integrity_exceptions
  ADD COLUMN IF NOT EXISTS due_on date;

COMMENT ON COLUMN public.strata_integrity_exceptions.owner_role IS
  'The accountable ROLE (F-1). Required. Accountability for an integrity exception belongs to the Strategy Office as a role, not to an individual.';
COMMENT ON COLUMN public.strata_integrity_exceptions.assigned_owner_id IS
  'OPTIONAL named individual (F-1). NULL means no individual is assigned and accountability rests with owner_role — it does NOT mean the owner is unknown. Never populate this by inference: assigning accountability to a person who did not accept it is a fabricated audit trail.';
COMMENT ON COLUMN public.strata_integrity_exceptions.status IS
  'Whether the ruled resolution has been carried out (open | in_progress | closed). Distinct from `resolution`, which is the ruled disposition itself.';

-- ── 3b. fix the duplicate guard for model-class records ──────────────────────
-- 20260716190000's UNIQUE(exception_class, affected_snapshot_id, affected_model_id,
-- affected_model_version) does NOT hold for model_approval_provenance records: their
-- affected_snapshot_id is NULL, and a default UNIQUE treats NULLs as DISTINCT, so the same B2B
-- record could be filed any number of times. Exactly the class the guard most needs to cover was
-- the one it did not. NULLS NOT DISTINCT (PG15+; staging runs 17.6) closes it.
ALTER TABLE public.strata_integrity_exceptions
  DROP CONSTRAINT IF EXISTS strata_integrity_exceptions_unique;
ALTER TABLE public.strata_integrity_exceptions
  ADD CONSTRAINT strata_integrity_exceptions_unique
  UNIQUE NULLS NOT DISTINCT (exception_class, affected_snapshot_id, affected_model_id, affected_model_version);

-- ── 4. the three known exception records (§3.8) ──────────────────────────────
-- Every figure below was RE-PROBED on 2026-07-16 against staging, not copied from prose:
--   SNAP-1    (locked 2026-07-05 22:18:34) stamps CEO model v1 -> 1 perspective row written post-lock
--   SNAP-1001 (locked 2026-04-08 06:00:00) stamps CEO model v1 -> 5 perspective rows written post-lock
--   B2B Sector Scorecard v1: status='approved' with approved_at NULL; 3 perspective weights + 2
--     measures written after it became effective.
-- values_changed = FALSE for all three (§3.6): strata_lock_snapshot freezes snapshot_items.payload
-- and calcResult reads the frozen payload for locked instances, so no reported number moved. What
-- broke is RESOLUTION, which is why provenance_reproducibility = 'incomplete'.
-- created_by is left to its auth.uid() default and will be NULL here: these records are filed by a
-- migration, not by a user action. That is honest — do not stamp a person who did not file them.
INSERT INTO public.strata_integrity_exceptions (
  exception_class, affected_snapshot_id, affected_model_id, affected_model_version,
  discovered_on, known_child_changes, values_changed, provenance_reproducibility,
  owner_role, assigned_owner_id, status, resolution, detection_is_lower_bound, note)
SELECT
  'snapshot_provenance',
  s.id,
  'a5a1a000-0000-4000-8000-000000001501',
  1,
  DATE '2026-07-16',
  '1 strata_scorecard_model_perspectives row written AFTER lock (2026-07-12 07:02:46). Re-probed 2026-07-16.',
  false,
  'incomplete',
  'strategy_office', NULL, 'open', 'preserved_with_qualification', true,
  'E-1: preserve and annotate; do NOT restate. The frozen snapshot_items.payload means no reported number changed, and it must never be modified. But "CEO Enterprise Scorecard v1" no longer re-resolves to the weights that produced these numbers, because the child rows moved under a static version. The values remain official; the configuration that produced them can no longer be proven. Detection is a LOWER BOUND: before migration 20260716180000 these child tables had created_at only, so in-place UPDATEs are undetectable.'
FROM public.strata_snapshots s WHERE s.snapshot_key = 'SNAP-1'
ON CONFLICT ON CONSTRAINT strata_integrity_exceptions_unique DO NOTHING;

INSERT INTO public.strata_integrity_exceptions (
  exception_class, affected_snapshot_id, affected_model_id, affected_model_version,
  discovered_on, known_child_changes, values_changed, provenance_reproducibility,
  owner_role, assigned_owner_id, status, resolution, detection_is_lower_bound, note)
SELECT
  'snapshot_provenance',
  s.id,
  'a5a1a000-0000-4000-8000-000000001501',
  1,
  DATE '2026-07-16',
  '5 strata_scorecard_model_perspectives rows written AFTER lock (locked 2026-04-08 06:00:00). Re-probed 2026-07-16.',
  false,
  'incomplete',
  'strategy_office', NULL, 'open', 'preserved_with_qualification', true,
  'E-1: preserve and annotate; do NOT restate. Same class as SNAP-1 and with a wider gap: this snapshot was locked 2026-04-08 and five child rows were written after it. The frozen payload means no reported number changed and must never be modified; "CEO Enterprise Scorecard v1" no longer re-resolves to the configuration that produced these numbers. Detection is a LOWER BOUND (see 20260716180000).'
FROM public.strata_snapshots s WHERE s.snapshot_key = 'SNAP-1001'
ON CONFLICT ON CONSTRAINT strata_integrity_exceptions_unique DO NOTHING;

INSERT INTO public.strata_integrity_exceptions (
  exception_class, affected_snapshot_id, affected_model_id, affected_model_version,
  discovered_on, known_child_changes, values_changed, provenance_reproducibility,
  owner_role, assigned_owner_id, status, resolution, detection_is_lower_bound, note)
VALUES (
  'model_approval_provenance',
  NULL,
  'a5a1a000-0000-4000-8000-000000001502',
  1,
  DATE '2026-07-16',
  '3 strata_scorecard_model_perspectives rows + 2 strata_scorecard_model_measures rows written after the model became effective (effective_from 2026-07-09 10:48; approved_at is NULL). The 2 measure rows were written 2026-07-16 18:20:39 by this feature''s own part-2b live verification, onto an approved model, because no status gate existed — the defect demonstrating itself. E-3: RETAIN them; do not clean the approved model in place.',
  false,
  'incomplete',
  'strategy_office', NULL, 'open', 'superseded_prospectively', true,
  'E-2: legacy/unverified approval provenance — status=''approved'' with approved_at NULL, i.e. never approved through strata_approve_record (seeded directly), so any control keyed on approved_at silently skips it. Do NOT backfill or infer approved_at. Resolution path: freeze v1 (done — P0-A gates its children) -> clone to v2 Draft via strata_create_model_draft_version (available — 20260716170000) -> proper Strategy Office approval -> explicit effective date -> supersede v1 PROSPECTIVELY. status stays ''open'' until v2 is approved: the resolution is ruled, not yet performed.'
)
ON CONFLICT ON CONSTRAINT strata_integrity_exceptions_unique DO NOTHING;
