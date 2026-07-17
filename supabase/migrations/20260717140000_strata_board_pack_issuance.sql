-- CAT-STRATA-IMPL-20260712-001 · R2 / F1 · board-pack editorial lifecycle, issuance + supersession
-- Plan Lock: blueprint §6 (F1), §8.7 · authorization R2 · F-3 (qualification on packs and exports).
--
-- ── F-12 — DEVIATION FROM §6's LITERAL WORDING, and why ─────────────────────
-- §6 says: status "+issued, superseded". Probed 2026-07-17, `status` is already a GENERATION
-- lifecycle: CHECK (pending | generating | ready | failed) — it tracks whether the FILE rendered.
-- The authorization asks for an editorial builder, review, approval AND issuance. Piling
-- draft/in_review/approved/issued/superseded onto that same column conflates two ORTHOGONAL facts:
-- "has the file rendered?" and "has the Strategy Office approved and issued it?". `generating` and
-- `in_review` are not comparable states, and a pack that is `issued` would have LOST its generation
-- state — you could no longer tell whether the artefact exists.
-- So: `status` is left ALONE (it keeps its meaning, and its 3 existing rows stay valid), and the
-- editorial lifecycle gets its own `issue_status`. Smallest design that satisfies the approved
-- operating model without destroying a meaning that is already in use. Logged as F-12.
--
-- ── What issuance means here ────────────────────────────────────────────────
-- An issued pack is the artefact a board actually received. It is IMMUTABLE — not by convention but
-- by trigger, because "please don't edit issued packs" is not a control. A correction is a NEW
-- VERSION that supersedes the old one; the original stays exactly as issued, because the board saw
-- it and that fact cannot be unmade.
-- snapshot_id is NEVER changed by a correction (§8.7): the numbers a pack reports are the snapshot's,
-- and re-pointing a pack at different numbers while keeping its identity is the precise lie this
-- whole programme exists to prevent.

ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS supersedes_id uuid REFERENCES public.strata_board_packs(id);
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS issued_by uuid;
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS issued_at timestamptz;
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS sections jsonb;
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS change_reason text;

-- The editorial lifecycle, separate from `status` (see F-12 above).
-- Existing rows default to 'draft': they were generated but never issued, which is the truth.
ALTER TABLE public.strata_board_packs ADD COLUMN IF NOT EXISTS issue_status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.strata_board_packs DROP CONSTRAINT IF EXISTS strata_board_packs_issue_status_check;
ALTER TABLE public.strata_board_packs
  ADD CONSTRAINT strata_board_packs_issue_status_check
  CHECK (issue_status IN ('draft','in_review','approved','issued','superseded'));

COMMENT ON COLUMN public.strata_board_packs.status IS
  'GENERATION lifecycle only (pending|generating|ready|failed) — whether the artefact rendered. NOT the editorial lifecycle: see issue_status. The two are orthogonal (F-12).';
COMMENT ON COLUMN public.strata_board_packs.issue_status IS
  'EDITORIAL lifecycle (draft|in_review|approved|issued|superseded). `issued` rows are IMMUTABLE — enforced by trigger, not convention. A correction is a new version that supersedes; the original stays exactly as the board received it.';

CREATE INDEX IF NOT EXISTS strata_board_packs_snapshot_idx ON public.strata_board_packs (snapshot_id);
CREATE INDEX IF NOT EXISTS strata_board_packs_issue_idx ON public.strata_board_packs (issue_status, issued_at);

-- ── immutability of issued packs — a TRIGGER, not a policy ──────────────────
-- RLS cannot express "these columns are frozen once issued": a policy gates whether a row is
-- writable, not which of its fields changed. And the issue/supersede RPCs are SECURITY DEFINER, so
-- they bypass RLS anyway. A BEFORE UPDATE trigger is the only layer that sees old vs new and applies
-- to every writer — RPC, client, and a future migration alike.
-- Exactly two transitions are permitted on an issued pack, and neither alters what the board read:
--   issued -> superseded  (a successor was issued; recorded via supersedes_id on the NEW row)
--   setting supersedes_id/superseding bookkeeping is not permitted here at all.
CREATE OR REPLACE FUNCTION public.strata_board_pack_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.issue_status = 'issued' THEN
    -- The ONLY legal change to an issued pack is retiring it behind a successor.
    IF NEW.issue_status = 'superseded'
       AND NEW.snapshot_id     IS NOT DISTINCT FROM OLD.snapshot_id
       AND NEW.storage_path    IS NOT DISTINCT FROM OLD.storage_path
       AND NEW.sections        IS NOT DISTINCT FROM OLD.sections
       AND NEW.title           IS NOT DISTINCT FROM OLD.title
       AND NEW.version         IS NOT DISTINCT FROM OLD.version
       AND NEW.issued_by       IS NOT DISTINCT FROM OLD.issued_by
       AND NEW.issued_at       IS NOT DISTINCT FROM OLD.issued_at
       AND NEW.format          IS NOT DISTINCT FROM OLD.format THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'board pack % is ISSUED and cannot be changed — the board received this artefact. Issue a corrected version instead (strata_supersede_board_pack).', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.issue_status = 'superseded' AND NEW.issue_status <> 'superseded' THEN
    RAISE EXCEPTION 'board pack % is superseded — its successor is the current version; it cannot be reinstated', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_strata_board_packs_immutable ON public.strata_board_packs;
CREATE TRIGGER trg_strata_board_packs_immutable BEFORE UPDATE ON public.strata_board_packs
  FOR EACH ROW EXECUTE FUNCTION public.strata_board_pack_immutable();

DROP TRIGGER IF EXISTS trg_strata_board_packs_audit ON public.strata_board_packs;
CREATE TRIGGER trg_strata_board_packs_audit AFTER INSERT OR UPDATE OR DELETE ON public.strata_board_packs
  FOR EACH ROW EXECUTE FUNCTION public.strata_audit();

-- Deleting an issued pack would erase the record of what a board received.
CREATE OR REPLACE FUNCTION public.strata_board_pack_no_delete_issued()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.issue_status IN ('issued','superseded') THEN
    RAISE EXCEPTION 'board pack % was issued to a board and cannot be deleted', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$;
DROP TRIGGER IF EXISTS trg_strata_board_packs_no_delete ON public.strata_board_packs;
CREATE TRIGGER trg_strata_board_packs_no_delete BEFORE DELETE ON public.strata_board_packs
  FOR EACH ROW EXECUTE FUNCTION public.strata_board_pack_no_delete_issued();

-- ── F-3 · the snapshot-integrity qualification, exposed where packs are read ─
-- F-3 (Vikram): "Snapshot-integrity qualification on future packs and exports." The register
-- (strata_integrity_exceptions, 3 rows) is the source of truth; this view is how a pack, an export
-- or a board reader SEES it. Derived, never copied: a copied qualification would go stale the moment
-- the register gains a row, and the stale copy would be the one printed on a board pack.
-- A pack over a qualified snapshot is NOT wrong — its numbers are official and unchanged (§3.6).
-- What is qualified is the PROVENANCE claim. The view says exactly that, so a reader is never left
-- to guess whether the numbers moved.
CREATE OR REPLACE VIEW public.strata_board_pack_qualification AS
SELECT
  p.id                AS board_pack_id,
  p.snapshot_id,
  s.snapshot_key,
  p.issue_status,
  p.version,
  (e.id IS NOT NULL)  AS is_qualified,
  e.provenance_reproducibility,
  e.values_changed,
  e.resolution,
  e.detection_is_lower_bound,
  CASE WHEN e.id IS NULL THEN NULL ELSE
    'The figures in this pack are OFFICIAL and UNCHANGED — they were frozen when the snapshot was locked. '
    || 'What is qualified is their PROVENANCE: the configuration recorded for this snapshot can no longer be '
    || 're-resolved to the exact values that produced these numbers. See integrity exception '
    || e.id::text || ' (' || e.resolution || ').'
  END AS qualification_note
FROM public.strata_board_packs p
LEFT JOIN public.strata_snapshots s ON s.id = p.snapshot_id
LEFT JOIN public.strata_integrity_exceptions e
       ON e.affected_snapshot_id = p.snapshot_id
      AND e.exception_class = 'snapshot_provenance';

COMMENT ON VIEW public.strata_board_pack_qualification IS
  'F-3: whether a board pack reports over a snapshot carrying an integrity exception, and the exact wording to show. DERIVED from strata_integrity_exceptions — never copied onto the pack, because a copy goes stale the moment the register changes and the stale copy is what would get printed. is_qualified=false means no exception is on record; per E-4/§3.7 that is NOT proof of integrity for anything predating the child audit triggers.';

GRANT SELECT ON public.strata_board_pack_qualification TO authenticated;

-- ── strata_issue_board_pack ─────────────────────────────────────────────────
-- Strategy Office issuance (authorization R2). Requires an APPROVED pack over a LOCKED snapshot.
CREATE OR REPLACE FUNCTION public.strata_issue_board_pack(p_pack uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v record; v_snap record; v_qualified boolean;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'issuing a board pack requires the strategy_office or admin role';
  END IF;
  SELECT * INTO v FROM public.strata_board_packs WHERE id = p_pack;
  IF v.id IS NULL THEN RAISE EXCEPTION 'board pack not found'; END IF;
  IF v.issue_status = 'issued' THEN RAISE EXCEPTION 'this board pack is already issued'; END IF;
  IF v.issue_status = 'superseded' THEN RAISE EXCEPTION 'this board pack is superseded'; END IF;
  IF v.issue_status <> 'approved' THEN
    RAISE EXCEPTION 'a board pack must be approved before it is issued (current: %)', v.issue_status;
  END IF;

  -- Approver ≠ issuer, mirroring strata_approve_record's SoD. Issuance is the act that makes a pack
  -- a board record, so it gets the same segregation as every other governed approval.
  IF v.approved_by IS NOT DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'segregation of duties: the approver cannot also issue the pack';
  END IF;

  IF v.snapshot_id IS NULL THEN
    RAISE EXCEPTION 'a board pack cannot be issued without a snapshot — there would be no record of which numbers it reports';
  END IF;
  SELECT * INTO v_snap FROM public.strata_snapshots WHERE id = v.snapshot_id;
  IF v_snap.status <> 'locked' THEN
    RAISE EXCEPTION 'a board pack can only be issued over a LOCKED snapshot (this one is %) — its numbers could still change', v_snap.status;
  END IF;
  IF v.status <> 'ready' THEN
    RAISE EXCEPTION 'the pack artefact is not ready (generation status: %) — there is nothing to issue', v.status;
  END IF;

  UPDATE public.strata_board_packs
     SET issue_status = 'issued', issued_by = auth.uid(), issued_at = now()
   WHERE id = p_pack;

  -- F-3: record the qualification AT ISSUANCE, in the audit trail, so the pack's own history says
  -- whether it went out over qualified provenance. The view stays the live source; this is the
  -- point-in-time fact of what was known when the board received it.
  SELECT is_qualified INTO v_qualified FROM public.strata_board_pack_qualification WHERE board_pack_id = p_pack;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_board_packs', p_pack, 'RPC:issue_board_pack', auth.uid(),
          format('v%s issued over snapshot %s%s%s', v.version, v_snap.snapshot_key,
                 CASE WHEN v_qualified THEN ' [PROVENANCE QUALIFIED — see integrity register]' ELSE '' END,
                 COALESCE(': ' || p_note, '')));
END;
$function$;

-- ── strata_supersede_board_pack ─────────────────────────────────────────────
-- A correction is a NEW VERSION, never an edit. The original stays byte-identical because the board
-- received it. snapshot_id is COPIED, never re-pointed (§8.7): a corrected pack reports the SAME
-- numbers, corrected in presentation — if the numbers themselves changed, that is a new snapshot and
-- a new pack, not a correction.
CREATE OR REPLACE FUNCTION public.strata_supersede_board_pack(p_pack uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v record; v_new uuid; v_open uuid;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'superseding a board pack requires the strategy_office or admin role';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'a reason is required to supersede an issued board pack — the board must be told why it changed';
  END IF;
  SELECT * INTO v FROM public.strata_board_packs WHERE id = p_pack;
  IF v.id IS NULL THEN RAISE EXCEPTION 'board pack not found'; END IF;
  IF v.issue_status <> 'issued' THEN
    RAISE EXCEPTION 'only an ISSUED pack can be superseded (current: %) — an unissued pack is simply edited', v.issue_status;
  END IF;

  SELECT id INTO v_open FROM public.strata_board_packs
   WHERE supersedes_id = p_pack AND issue_status <> 'superseded' LIMIT 1;
  IF v_open IS NOT NULL THEN
    RAISE EXCEPTION 'a correction of this pack already exists (%) — finish or discard it first', v_open;
  END IF;

  INSERT INTO public.strata_board_packs
    (snapshot_id, format, status, title, sections, version, supersedes_id, issue_status, change_reason, generated_by)
  VALUES
    (v.snapshot_id,          -- SAME numbers. Never re-pointed.
     v.format, 'pending', v.title, v.sections,
     v.version + 1, p_pack, 'draft', p_reason, auth.uid())
  RETURNING id INTO v_new;

  -- The predecessor is retired only now, and ONLY its issue_status moves — the immutability trigger
  -- rejects any other change, so what the board read stays exactly as they read it.
  UPDATE public.strata_board_packs SET issue_status = 'superseded' WHERE id = p_pack;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_board_packs', v_new, 'RPC:supersede_board_pack', auth.uid(),
          format('v%s supersedes v%s (pack %s): %s', v.version + 1, v.version, p_pack, p_reason));
  RETURN v_new;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_issue_board_pack(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_supersede_board_pack(uuid, text) TO authenticated;
