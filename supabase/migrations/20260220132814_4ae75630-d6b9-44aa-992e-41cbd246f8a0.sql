CREATE OR REPLACE VIEW vw_chain_intelligence WITH (security_invoker = on) AS
WITH theme_keys AS (
  SELECT id, 'ST-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 3, '0') AS theme_key
  FROM es_strategic_themes
)
SELECT t.id AS theme_id,
    tk.theme_key,
    t.title AS theme_name,
    t.status AS theme_status,
    t.progress_pct AS theme_progress,
    t.created_at AS theme_created_at,
    t.start_date AS theme_start,
    t.target_completion AS theme_end,
    t_own.id AS theme_owner_id,
    t_own.full_name AS theme_owner_name,
    t_own.role AS theme_owner_role,
    g.id AS goal_id,
    g.goal_key,
    g.title AS goal_title,
    g.status AS goal_status,
    g.progress_pct AS goal_progress,
    g.ai_health_score AS goal_health,
    g.created_at AS goal_created_at,
    g.start_date AS goal_start,
    g.target_date AS goal_target,
    g_own.id AS goal_owner_id,
    g_own.full_name AS goal_owner_name,
    g_own.role AS goal_owner_role,
    kr.id AS kr_id,
    kr.kr_key,
    kr.title AS kr_title,
    kr.status AS kr_status,
    kr.progress_pct AS kr_progress,
    kr.target_value AS kr_target,
    kr.current_value AS kr_current,
    kr.unit AS kr_unit,
    kr.created_at AS kr_created_at,
    kr.due_date AS kr_target_date,
    kr_own.id AS kr_owner_id,
    kr_own.full_name AS kr_owner_name,
    kr_own.role AS kr_owner_role,
    ini.id AS initiative_id,
    ini.initiative_key,
    ini.title AS initiative_title,
    ini.status AS initiative_status,
    ini.progress AS initiative_progress,
    ini.created_at AS initiative_created_at,
    ini.target_complete AS initiative_target,
    ini_own.id AS initiative_owner_id,
    ini_own.full_name AS initiative_owner_name,
    wi.id AS epic_id,
    wi.item_key AS epic_key,
    wi.summary AS epic_title,
    wi.status AS epic_status,
    wi.created_at AS epic_created_at,
    wi.due_date AS epic_due,
    wi.updated_at AS epic_updated_at,
    ep_own.id AS epic_owner_id,
    ep_own.full_name AS epic_owner_name,
    ekri.linked_at AS kr_initiative_linked_at,
    eie.created_at AS initiative_epic_linked_at
   FROM es_strategic_themes t
     JOIN theme_keys tk ON tk.id = t.id
     LEFT JOIN profiles t_own ON t_own.id = t.owner_id
     LEFT JOIN es_goals g ON g.theme_id = t.id
     LEFT JOIN profiles g_own ON g_own.id = g.owner_id
     LEFT JOIN es_key_results kr ON kr.goal_id = g.id
     LEFT JOIN profiles kr_own ON kr_own.id = kr.owner_id
     LEFT JOIN es_kr_initiatives ekri ON ekri.key_result_id = kr.id
     LEFT JOIN ph_initiatives ini ON ini.id = ekri.initiative_id
     LEFT JOIN profiles ini_own ON ini_own.id = ini.assignee_id
     LEFT JOIN es_initiative_epics eie ON eie.initiative_id = ini.id
     LEFT JOIN ph_work_items wi ON wi.id::text = eie.epic_id::text AND wi.item_type = 'Epic'::text
     LEFT JOIN profiles ep_own ON ep_own.id = wi.assignee_id
  ORDER BY t.title, g.goal_key, kr.kr_key;