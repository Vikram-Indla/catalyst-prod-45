-- ============================================================================
-- es_* legacy StrategyHub decommission — DRIFT-003 closure
-- CAT-STRATA-20260705-001 · Session 004 follow-up (owner-directed item 9)
--
-- D-009/Q2 (owner, 2026-07-05): "DECOMMISSION whatever is currently there."
-- The es_* model was the prototype StrategyHub, superseded by STRATA
-- (strata_*). Surfaces were unrouted on 2026-07-05 (DRIFT-003, unroute-only);
-- this migration completes the decommission: 7 dashboard views + 17 base
-- tables dropped. Frontend files removed in the same commit.
-- Applied STAGING-first; reaches prod only via the owner-gated prod apply.
-- ============================================================================

DROP VIEW IF EXISTS public.es_dashboard_execution_dials;
DROP VIEW IF EXISTS public.es_dashboard_health_composite;
DROP VIEW IF EXISTS public.es_dashboard_okr_heatmap;
DROP VIEW IF EXISTS public.es_dashboard_okr_tree;
DROP VIEW IF EXISTS public.es_dashboard_pyramid_summary;
DROP VIEW IF EXISTS public.es_dashboard_team_alignment;
DROP VIEW IF EXISTS public.es_goals_tree_view;

DROP TABLE IF EXISTS public.es_kr_checkins CASCADE;
DROP TABLE IF EXISTS public.es_key_results CASCADE;
DROP TABLE IF EXISTS public.es_goal_dependencies CASCADE;
DROP TABLE IF EXISTS public.es_goal_initiatives CASCADE;
DROP TABLE IF EXISTS public.es_initiative_epics CASCADE;
DROP TABLE IF EXISTS public.es_investment_allocations CASCADE;
DROP TABLE IF EXISTS public.es_health_scores CASCADE;
DROP TABLE IF EXISTS public.es_team_alignment CASCADE;
DROP TABLE IF EXISTS public.es_ai_recommendations CASCADE;
DROP TABLE IF EXISTS public.es_intelligence_panel_config CASCADE;
DROP TABLE IF EXISTS public.es_snapshots CASCADE;
DROP TABLE IF EXISTS public.es_goals CASCADE;
DROP TABLE IF EXISTS public.es_initiatives CASCADE;
DROP TABLE IF EXISTS public.es_strategic_themes CASCADE;
DROP TABLE IF EXISTS public.es_strategy_roles CASCADE;
DROP TABLE IF EXISTS public.es_missions CASCADE;
DROP TABLE IF EXISTS public.es_visions CASCADE;
