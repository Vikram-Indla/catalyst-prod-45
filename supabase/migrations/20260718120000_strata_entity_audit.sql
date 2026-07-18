-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-008 · discoverable entity audit / lineage
--
-- strata_audit_events already records (entity_table, entity_id, action, actor_id, before, after,
-- note, created_at) for every governed write (benefit definition, benefit value, assurance decision,
-- attribution, gate/decision, etc.), and it is append-only under RLS. What was missing is a reachable,
-- RLS-safe read path from a Portfolio & Benefits record to its history. This adds exactly that — a
-- single read RPC over the EXISTING store (no parallel audit system).
--
-- SECURITY DEFINER bypasses RLS, so the role check IS the access control: unauthorized callers get
-- zero rows (restricted information is never exposed). Append-only is preserved — this only reads.
CREATE OR REPLACE FUNCTION public.strata_entity_audit(p_entity_table text, p_entity_id uuid)
RETURNS TABLE(
  id uuid, entity_table text, entity_id uuid, action text,
  actor_id uuid, before jsonb, after jsonb, note text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.entity_table, e.entity_id, e.action, e.actor_id, e.before, e.after, e.note, e.created_at
    FROM public.strata_audit_events e
   WHERE e.entity_table = p_entity_table
     AND e.entity_id = p_entity_id
     AND public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward','kpi_owner','strata_admin'])
   ORDER BY e.created_at DESC, e.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.strata_entity_audit(text, uuid) TO authenticated;
