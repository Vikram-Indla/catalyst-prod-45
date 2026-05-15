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
    WITH theme_keys AS (
      SELECT id, 'ST-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 3, '0') AS theme_key
      FROM es_strategic_themes
    )
    SELECT t.id AS theme_id,
        tk.theme_key,
        t.title AS theme_name,
        t.status AS theme_status,
        NULL::numeric AS theme_progress,
        t.created_at AS theme_created_at,
        NULL::date AS theme_start,
        NULL::date AS theme_end,
        t_own.id AS theme_owner_id,
        t_own.full_name AS theme_owner_name,
        t_own.role AS theme_owner_role,
        g.id AS goal_id,
        NULL::text AS goal_key,
        g.title AS goal_title,
        g.status AS goal_status,
        NULL::numeric AS goal_progress,
        NULL::numeric AS goal_health,
        g.created_at AS goal_created_at,
        NULL::date AS goal_start,
        NULL::date AS goal_target,
        g_own.id AS goal_owner_id,
        g_own.full_name AS goal_owner_name,
        g_own.role AS goal_owner_role,
        kr.id AS kr_id,
        NULL::text AS kr_key,
        kr.title AS kr_title,
        kr.status AS kr_status,
        NULL::numeric AS kr_progress,
        NULL::numeric AS kr_target,
        NULL::numeric AS kr_current,
        NULL::text AS kr_unit,
        kr.created_at AS kr_created_at,
        NULL::date AS kr_target_date,
        kr_own.id AS kr_owner_id,
        kr_own.full_name AS kr_owner_name,
        kr_own.role AS kr_owner_role,
        ini.id AS initiative_id,
        NULL::text AS initiative_key,
        ini.title AS initiative_title,
        ini.status AS initiative_status,
        NULL::numeric AS initiative_progress,
        ini.created_at AS initiative_created_at,
        NULL::date AS initiative_target,
        ini_own.id AS initiative_owner_id,
        ini_own.full_name AS initiative_owner_name,
        NULL::uuid AS epic_id,
        NULL::text AS epic_key,
        NULL::text AS epic_title,
        NULL::text AS epic_status,
        NULL::timestamptz AS epic_created_at,
        NULL::date AS epic_due,
        NULL::timestamptz AS epic_updated_at,
        NULL::uuid AS epic_owner_id,
        NULL::text AS epic_owner_name,
        ekri.linked_at AS kr_initiative_linked_at,
        NULL::timestamptz AS initiative_epic_linked_at
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
      ORDER BY t.title
  $view$;
END $$;
