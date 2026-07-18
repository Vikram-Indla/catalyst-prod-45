-- ============================================================================
-- STRATA — DL-DEF-002 foundation: shared entity-audit read RPC
-- CAT-STRATA-DLDEF-20260718-001 · Module 7 defect pack, Priority 3
--
-- MIGRATION OWNERSHIP (documented per the dispatch requirement):
-- The authoritative defining migration is 20260718120000_* on branch
-- strata/pb-defect-pack (PB-DEF-008), which is NOT merged into this branch and
-- cannot be merged inside this timebox without pulling in unrelated Module 5
-- work. This file therefore carries an IDENTICAL, idempotent CREATE OR REPLACE
-- of the definition **copied verbatim from the deployed staging function**
-- (pg_get_functiondef, catalyst-staging, 18 Jul 2026) — NOT a divergent
-- implementation. When strata/pb-defect-pack merges, both files define the
-- same function body and reconcile as a no-op.
--
-- The RPC is an RLS-safe, read-only window over the EXISTING append-only
-- strata_audit_events store (no parallel audit system): role-gated, newest
-- first, actor/before/after/note preserved verbatim.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.strata_entity_audit(p_entity_table text, p_entity_id uuid)
 RETURNS TABLE(id uuid, entity_table text, entity_id uuid, action text, actor_id uuid, before jsonb, after jsonb, note text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.entity_table, e.entity_id, e.action, e.actor_id, e.before, e.after, e.note, e.created_at
    FROM public.strata_audit_events e
   WHERE e.entity_table = p_entity_table
     AND e.entity_id = p_entity_id
     AND public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward','kpi_owner','strata_admin'])
   ORDER BY e.created_at DESC, e.id DESC;
$function$;
