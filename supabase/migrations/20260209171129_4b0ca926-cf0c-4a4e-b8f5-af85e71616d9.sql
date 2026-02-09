
-- Fix Security Definer Views by setting them to SECURITY INVOKER
ALTER VIEW wh_overview_stats SET (security_invoker = on);
ALTER VIEW wh_release_health SET (security_invoker = on);
ALTER VIEW wh_at_risk_items SET (security_invoker = on);
ALTER VIEW wh_person_workload SET (security_invoker = on);
ALTER VIEW wh_exceptions SET (security_invoker = on);
