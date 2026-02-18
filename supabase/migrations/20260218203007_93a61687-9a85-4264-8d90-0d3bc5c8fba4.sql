
-- Fix security definer views for es_* views
ALTER VIEW es_dashboard_pyramid_summary SET (security_invoker = on);
ALTER VIEW es_dashboard_okr_heatmap SET (security_invoker = on);
ALTER VIEW es_dashboard_okr_tree SET (security_invoker = on);
ALTER VIEW es_dashboard_execution_dials SET (security_invoker = on);
ALTER VIEW es_dashboard_health_composite SET (security_invoker = on);
ALTER VIEW es_dashboard_team_alignment SET (security_invoker = on);
