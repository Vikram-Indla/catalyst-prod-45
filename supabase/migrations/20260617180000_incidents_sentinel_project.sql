-- ════════════════════════════════════════════════════════════════════════════
-- Incidents — sentinel "projects" row for cross-project dashboards
-- 2026-06-17
--
-- The incident hub dashboard uses the canonical ProjectDashboardPage in
-- mode='incident'. Each user's widget layout persists into
-- `dashboard_widget_config`, which has an FK to `projects(id)`. Incidents
-- aren't tied to a single project (they're aggregated cross-project from
-- ph_issues WHERE issue_type='Production Incident'), so we insert a single
-- sentinel "Incidents" row in projects to satisfy that FK. The id is a
-- deterministic UUID — every user's incident dashboard config row points
-- at this same sentinel.
--
-- Idempotent — ON CONFLICT DO NOTHING.
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.projects (id, key, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'INCIDENTS', 'Incidents')
ON CONFLICT (id) DO NOTHING;
