-- CAT-STRATA-IMPL-20260712-001 · R2/F1 follow-on · board-pack APPROVAL verb
--
-- WHY THIS EXISTS. R2/F1 (20260717140000) shipped the editorial lifecycle
-- draft → in_review → approved → issued → superseded and `strata_issue_board_pack`, which refuses
-- anything not already `approved` and enforces SoD via `approved_by <> auth.uid()`. But NOTHING
-- moves a pack INTO `approved`. Found while wiring the R2 UI: Issue was unreachable end-to-end —
-- the lifecycle had a state with no entry verb.
--
-- WHY IT MUST BE AN RPC AND NOT A CLIENT UPDATE. `strata_board_packs_write` (20260705100400) is
-- `FOR ALL USING (strata_has_role(ARRAY['strategy_office']))`. So a plain client UPDATE could set
-- `approved_by` to ANY uuid — including someone else's. `strata_issue_board_pack`'s entire SoD check
-- is `approved_by IS NOT DISTINCT FROM auth.uid()`. A spoofable `approved_by` therefore defeats the
-- SoD control completely: a single user could name a colleague as approver and then issue the pack
-- themselves. The approver identity must be stamped by the server from auth.uid(), never accepted
-- from the caller. That is the whole reason this function is SECURITY DEFINER and takes no actor
-- parameter.
--
-- SCOPE. This adds the missing entry verb ONLY. It does not touch the immutability triggers, the
-- issue/supersede RPCs, or the qualification view. `status` (generation) is untouched — F-12: it is
-- a separate lifecycle and issuance already checks it independently.

CREATE OR REPLACE FUNCTION public.strata_approve_board_pack(p_pack uuid, p_note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v record;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office']) THEN
    RAISE EXCEPTION 'approving a board pack requires the strategy_office or admin role';
  END IF;

  SELECT * INTO v FROM public.strata_board_packs WHERE id = p_pack;
  IF v.id IS NULL THEN RAISE EXCEPTION 'board pack not found'; END IF;

  -- Terminal states are refused by name rather than by a generic "invalid state", so the caller is
  -- told which rule they hit. `issued` is also refused by the immutability trigger underneath; this
  -- raises the readable error before the trigger raises the blunt one.
  IF v.issue_status = 'issued' THEN
    RAISE EXCEPTION 'this board pack is already issued — the board received it; a change is a new version (strata_supersede_board_pack)';
  END IF;
  IF v.issue_status = 'superseded' THEN
    RAISE EXCEPTION 'this board pack is superseded — approve its successor instead';
  END IF;
  IF v.issue_status = 'approved' THEN
    RAISE EXCEPTION 'this board pack is already approved';
  END IF;
  IF v.issue_status NOT IN ('draft','in_review') THEN
    RAISE EXCEPTION 'a board pack can only be approved from draft or in_review (current: %)', v.issue_status;
  END IF;

  -- A pack cannot be approved without a snapshot: approval is a statement about WHICH NUMBERS were
  -- reviewed, and without a snapshot there are none to point at. Deliberately NOT requiring the
  -- snapshot to be LOCKED here — issuance already enforces that, and a pack may legitimately be
  -- reviewed and approved while its period is still open. Duplicating the lock check here would
  -- invent a gate that R2/F1 chose not to impose.
  IF v.snapshot_id IS NULL THEN
    RAISE EXCEPTION 'a board pack cannot be approved without a snapshot — there would be no record of which numbers were approved';
  END IF;

  UPDATE public.strata_board_packs
     SET issue_status = 'approved',
         approved_by  = auth.uid(),   -- stamped by the server; never accepted from the caller (SoD)
         approved_at  = now()
   WHERE id = p_pack;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note, before, after)
  VALUES ('strata_board_packs', p_pack, 'RPC:approve_board_pack', auth.uid(),
          COALESCE(p_note, 'board pack approved'),
          jsonb_build_object('issue_status', v.issue_status, 'approved_by', v.approved_by),
          jsonb_build_object('issue_status', 'approved', 'approved_by', auth.uid()));
END;
$function$;

COMMENT ON FUNCTION public.strata_approve_board_pack(uuid, text) IS
  'R2/F1 follow-on: the missing entry verb into issue_status=''approved''. SECURITY DEFINER because approved_by is stamped from auth.uid() — strata_board_packs_write would let a client UPDATE spoof approved_by and thereby defeat the approver<>issuer SoD check in strata_issue_board_pack.';

GRANT EXECUTE ON FUNCTION public.strata_approve_board_pack(uuid, text) TO authenticated;
