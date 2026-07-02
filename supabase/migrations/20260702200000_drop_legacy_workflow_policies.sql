-- CAT-WORKFLOW-STUDIO-20260702-001 / P0.2 — retire out-of-band workflow policies
-- Prod carried 4 hand-created policies alongside the canonical set from
-- 20260702120000_workflow_wiring_repair:
--   type_statuses_select / transitions_select        — SELECT qual=true (open read, wider than
--                                                      the member-scoped model on ph_workflow_statuses)
--   type_statuses_admin_write / transitions_admin_write — global user_roles admin write, a different
--                                                      model from project-admin write
-- Permissive policies OR together, so the open SELECT won over member scoping. The canonical
-- policies ("Members view …" / "Admins manage …") remain and match the parent table's model.
-- Verified 2026-07-02 on prod: sole workflow project (Senaei BAU) has its admin covered by
-- ph_project_members, so no access is lost. No-op on environments without the legacy policies.

DROP POLICY IF EXISTS type_statuses_select ON public.ph_workflow_type_statuses;
DROP POLICY IF EXISTS type_statuses_admin_write ON public.ph_workflow_type_statuses;
DROP POLICY IF EXISTS transitions_select ON public.ph_workflow_transitions;
DROP POLICY IF EXISTS transitions_admin_write ON public.ph_workflow_transitions;
