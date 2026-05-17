
-- 1A: Panel structure config table
CREATE TABLE IF NOT EXISTS es_intelligence_panel_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  panel_name TEXT NOT NULL DEFAULT 'strategy_intelligence',
  structure JSONB NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE es_intelligence_panel_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Panel config viewable" ON es_intelligence_panel_config;
CREATE POLICY "Panel config viewable" ON es_intelligence_panel_config FOR SELECT TO authenticated USING (true);

INSERT INTO es_intelligence_panel_config (version, panel_name, structure, is_active, approved_at)
SELECT 1, 'strategy_intelligence', '{
  "sections": ["verdict", "execution", "risk_radar", "chain_of_command"],
  "verdict_components": ["health_ring", "schedule", "scope", "weakest_link", "confidence", "ai_verdict"],
  "execution_components": ["creation_waterfall", "scope_integrity", "story_pipeline", "kr_bullet_charts"],
  "risk_radar_components": ["cycle_times", "schedule_trajectory", "defect_ticker", "ai_risk_signals"],
  "chain_of_command_components": ["accountability_ladder", "concentration_risk", "last_actor"],
  "ai_config": { "verdict_max_sentences": 2, "risk_signals_max": 3, "temperature": 0.7 },
  "visual_config": { "panel_width": "50vw", "ring_size": 80, "body_font": 14, "metric_value": 22 }
}'::jsonb, true, now()
WHERE NOT EXISTS (SELECT 1 FROM es_intelligence_panel_config WHERE panel_name = 'strategy_intelligence');

-- 1B: Chain intelligence view (skip if schema incomplete)
DROP VIEW IF EXISTS vw_chain_intelligence;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='es_strategic_themes' AND column_name='owner_id'
  ) THEN
    RAISE NOTICE 'es_strategic_themes.owner_id not found, skipping vw_chain_intelligence';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='es_kr_initiatives') THEN
    RAISE NOTICE 'es_kr_initiatives not found, skipping vw_chain_intelligence';
    RETURN;
  END IF;
  EXECUTE $view$
    CREATE VIEW vw_chain_intelligence WITH (security_invoker = on) AS
    SELECT
      t.id AS theme_id, t.id::text AS theme_key, t.title AS theme_name, t.status AS theme_status,
      NULL::numeric AS theme_progress, t.created_at AS theme_created_at,
      NULL::date AS theme_start, NULL::date AS theme_end,
      t_own.id AS theme_owner_id, t_own.full_name AS theme_owner_name, t_own.role AS theme_owner_role,

      g.id AS goal_id, NULL::text AS goal_key, g.title AS goal_title, g.status AS goal_status,
      NULL::numeric AS goal_progress, NULL::numeric AS goal_health,
      g.created_at AS goal_created_at, NULL::date AS goal_start, NULL::date AS goal_target,
      g_own.id AS goal_owner_id, g_own.full_name AS goal_owner_name, g_own.role AS goal_owner_role,

      kr.id AS kr_id, NULL::text AS kr_key, kr.title AS kr_title, kr.status AS kr_status,
      NULL::numeric AS kr_progress, NULL::numeric AS kr_target, NULL::numeric AS kr_current,
      NULL::text AS kr_unit, kr.created_at AS kr_created_at, NULL::date AS kr_target_date,
      kr_own.id AS kr_owner_id, kr_own.full_name AS kr_owner_name, kr_own.role AS kr_owner_role,

      ini.id AS initiative_id, NULL::text AS initiative_key, ini.title AS initiative_title,
      ini.status AS initiative_status, NULL::numeric AS initiative_progress,
      ini.created_at AS initiative_created_at, NULL::date AS initiative_target,
      ini_own.id AS initiative_owner_id, ini_own.full_name AS initiative_owner_name,

      NULL::uuid AS epic_id, NULL::text AS epic_key, NULL::text AS epic_title,
      NULL::text AS epic_status, NULL::timestamptz AS epic_created_at, NULL::date AS epic_due,
      NULL::timestamptz AS epic_updated_at,
      NULL::uuid AS epic_owner_id, NULL::text AS epic_owner_name,

      ekri.linked_at AS kr_initiative_linked_at,
      NULL::timestamptz AS initiative_epic_linked_at

    FROM es_strategic_themes t
    LEFT JOIN profiles t_own ON t_own.id = t.owner_id
    LEFT JOIN es_goals g ON g.theme_id = t.id
    LEFT JOIN profiles g_own ON g_own.id = g.owner_id
    LEFT JOIN es_key_results kr ON kr.goal_id = g.id
    LEFT JOIN profiles kr_own ON kr_own.id = kr.owner_id
    LEFT JOIN es_kr_initiatives ekri ON ekri.key_result_id = kr.id
    LEFT JOIN ph_initiatives ini ON ini.id = ekri.initiative_id
    LEFT JOIN profiles ini_own ON ini_own.id = ini.assignee_id
    ORDER BY t.title
  $view$;
END $$;

-- 1C: Epic stories view (skip if ph_work_items doesn't exist)
DROP VIEW IF EXISTS vw_epic_stories;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ph_work_items') THEN
    RAISE NOTICE 'ph_work_items not found, skipping vw_epic_stories';
    RETURN;
  END IF;
  EXECUTE $view$
    CREATE VIEW vw_epic_stories WITH (security_invoker = on) AS
    SELECT
      wi.parent_id AS epic_id,
      wi.id AS story_id,
      wi.item_key AS story_key,
      wi.summary AS story_title,
      wi.status AS story_status,
      wi.priority AS story_priority,
      wi.created_at AS story_created_at,
      wi.updated_at AS story_updated_at,
      wi.due_date AS story_due,
      wi.assignee_id,
      p.full_name AS assignee_name,
      COALESCE(wi.cycle_time_days, EXTRACT(EPOCH FROM (wi.updated_at - wi.created_at)) / 86400) AS cycle_days,
      r.id AS release_id,
      r.name AS release_name,
      r.status AS release_status
    FROM ph_work_items wi
    LEFT JOIN profiles p ON p.id = wi.assignee_id
    LEFT JOIN releases r ON r.id = wi.release_id
    WHERE wi.item_type IN ('Story', 'Bug', 'Task', 'Subtask')
    ORDER BY wi.created_at
  $view$;
END $$;
