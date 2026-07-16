-- CAT-STRATA-IMPL-20260712-001 · slice F2 · audit the "View as" preview (anchor 27)
--
-- 5F shipped View-as as a read-only client preview whose banner states plainly that it is
-- "not audit-logged yet" (P5-D4: "audit the view event if a write RPC exists; else client-only
-- preview + FLAG the audit-log write"). No such RPC existed. This adds it.
--
-- Why an RPC and not a client insert: `strata_audit_events` has RLS enabled with a SELECT policy
-- ONLY — there is no INSERT policy for `authenticated`, by design. Audit rows are written solely by
-- SECURITY DEFINER RPCs so the actor cannot be forged: `actor_id` is taken from auth.uid() here,
-- never from a client argument. That is exactly why SECURITY DEFINER is warranted on this one
-- (contrast strata_check_role_sod, which reads only what the caller may already read and is
-- therefore deliberately NOT definer).
--
-- Gated to strata_admin: View-as exposes another person's access surface, so the server enforces
-- the same restriction the page does rather than trusting the client.
--
-- entity_table='profiles' + entity_id=<subject> reads as "this person's access was previewed".
-- action follows the table's existing convention (RPC:assign_role, RPC:create_kpi, ...).
--
-- Honest scope: this records that a preview was OPENED. It is NOT a session switch — nothing about
-- the admin's own permissions changes — and the note says so, so the audit trail cannot later be
-- misread as impersonation.

CREATE OR REPLACE FUNCTION public.strata_log_view_as(p_subject uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strata_admin']) THEN
    RAISE EXCEPTION 'view-as preview requires the strata_admin role';
  END IF;
  IF p_subject IS NULL THEN
    RAISE EXCEPTION 'view-as: a subject is required';
  END IF;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('profiles', p_subject, 'RPC:view_as', auth.uid(),
          'read-only access preview opened — no session switch, the viewer''s own permissions are unchanged');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.strata_log_view_as(uuid) TO authenticated;
