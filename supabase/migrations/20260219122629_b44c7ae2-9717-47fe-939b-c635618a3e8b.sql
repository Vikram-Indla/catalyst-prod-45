
DROP VIEW IF EXISTS es_themes_list_view;

CREATE VIEW es_themes_list_view AS
SELECT
  t.id, t.title, t.vision_statement, t.description, t.color,
  t.status, t.priority, t.bsc_perspective, t.fiscal_year,
  t.start_date, t.target_completion, t.planned_budget, t.sort_order,
  t.owner_id, t.theme_group_id, t.ai_health_score, t.success_metrics,
  t.process_step, t.is_major, t.created_at, t.updated_at,
  p.full_name AS owner_name,
  p.avatar_url AS owner_avatar,
  tg.name AS theme_group_name,
  COALESCE(g.goal_count, 0)::INTEGER AS goal_count,
  COALESCE(kr.kr_count, 0)::INTEGER AS kr_count,
  COALESCE(ini.initiative_count, 0)::INTEGER AS initiative_count,
  COALESCE(ms.milestone_count, 0)::INTEGER AS milestone_count,
  CASE WHEN COALESCE(g.goal_count, 0) > 0 THEN COALESCE(g.avg_progress, 0)::INTEGER ELSE COALESCE(t.progress_pct, 0) END AS progress_pct,
  COALESCE(ini.total_budget_allocated, 0)::NUMERIC AS budget_allocated,
  COALESCE(ini.total_budget_spent, 0)::NUMERIC AS budget_spent
FROM es_strategic_themes t
LEFT JOIN profiles p ON t.owner_id = p.id
LEFT JOIN es_theme_groups tg ON t.theme_group_id = tg.id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS goal_count, AVG(progress_pct)::NUMERIC AS avg_progress
  FROM es_goals WHERE theme_id = t.id
) g ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS kr_count
  FROM es_key_results kr2 JOIN es_goals g2 ON kr2.goal_id = g2.id
  WHERE g2.theme_id = t.id
) kr ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS initiative_count,
    SUM(budget_allocated) AS total_budget_allocated,
    SUM(budget_spent) AS total_budget_spent
  FROM es_initiatives ini2
  JOIN es_key_results kr3 ON ini2.key_result_id = kr3.id
  JOIN es_goals g3 ON kr3.goal_id = g3.id
  WHERE g3.theme_id = t.id
) ini ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS milestone_count FROM es_theme_milestones WHERE theme_id = t.id
) ms ON true;
