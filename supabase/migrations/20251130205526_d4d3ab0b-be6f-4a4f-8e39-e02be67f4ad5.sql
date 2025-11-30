-- Work Tree seed data (21 items total: 3 themes + 6 epics + 12 features)

DO $$
DECLARE
  v_snapshot_id uuid; v_portfolio_id uuid; v_program_id uuid; v_team_id uuid; v_pi_id uuid; v_sprint_id uuid;
BEGIN
  SELECT id INTO v_snapshot_id FROM strategy_snapshots ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO v_portfolio_id FROM portfolios LIMIT 1;
  SELECT id INTO v_program_id FROM programs LIMIT 1;
  SELECT id INTO v_team_id FROM teams LIMIT 1;
  SELECT id INTO v_pi_id FROM program_increments ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_sprint_id FROM iterations ORDER BY start_date DESC LIMIT 1;

  -- 3 Themes
  INSERT INTO strategic_themes (id, name, description, snapshot_id)
  VALUES
    (gen_random_uuid(), 'WT Theme: AI & ML', 'AI integration initiatives', v_snapshot_id),
    (gen_random_uuid(), 'WT Theme: Cloud', 'Cloud migration program', v_snapshot_id),
    (gen_random_uuid(), 'WT Theme: Customer', 'Customer experience improvements', v_snapshot_id)
  ON CONFLICT DO NOTHING;

  -- 6 Epics
  WITH themes AS (SELECT id, name FROM strategic_themes WHERE name LIKE 'WT Theme:%')
  INSERT INTO epics (id, name, description, theme_id, portfolio_id, primary_program_id, state, health, estimate, global_rank)
  SELECT gen_random_uuid(), v.name, v.description, t.id, v_portfolio_id, v_program_id,
    v.state::epic_state, CASE WHEN v.health = 'null' THEN NULL ELSE v.health::health_status END, v.estimate, v.rank
  FROM (VALUES
    ('WT Epic: Recommender', 'ML-powered recommendations', 'WT Theme: AI & ML', 'in_progress', 'green', 120, 11001),
    ('WT Epic: Pipeline', 'Automated ETL pipeline', 'WT Theme: AI & ML', 'in_progress', 'yellow', 150, 11002),
    ('WT Epic: AWS Migrate', 'AWS infrastructure migration', 'WT Theme: Cloud', 'in_progress', 'green', 200, 11003),
    ('WT Epic: K8s', 'Kubernetes orchestration', 'WT Theme: Cloud', 'not_started', 'null', 180, 11004),
    ('WT Epic: Portal', 'Unified customer portal', 'WT Theme: Customer', 'in_progress', 'green', 250, 11005),
    ('WT Epic: Mobile', 'Mobile app overhaul', 'WT Theme: Customer', 'in_progress', 'yellow', 180, 11006)
  ) v(name, description, theme_name, state, health, estimate, rank)
  JOIN themes t ON t.name = v.theme_name
  WHERE NOT EXISTS (SELECT 1 FROM epics e WHERE e.name = v.name);

  -- 12 Features
  WITH epics AS (SELECT id, name FROM epics WHERE name LIKE 'WT Epic:%')
  INSERT INTO features (id, name, description, epic_id, program_id, team_id, pi_id, status, health, estimate_points, global_rank)
  SELECT gen_random_uuid(), v.name, v.description, e.id, v_program_id, v_team_id, v_pi_id,
    v.status::feature_status, CASE WHEN v.health = 'null' THEN NULL ELSE v.health::health_status END, v.points, v.rank
  FROM (VALUES
    ('WT Feat: Analytics', 'User behavior tracking', 'WT Epic: Recommender', 'implementing', 'green', 40, 12001),
    ('WT Feat: ML Train', 'Model training pipeline', 'WT Epic: Recommender', 'implementing', 'yellow', 50, 12002),
    ('WT Feat: Rec API', 'Recommendation API service', 'WT Epic: Recommender', 'backlog', 'null', 30, 12003),
    ('WT Feat: Ingest', 'Data ingestion framework', 'WT Epic: Pipeline', 'implementing', 'green', 35, 12004),
    ('WT Feat: Validate', 'Data quality validation', 'WT Epic: Pipeline', 'implementing', 'yellow', 25, 12005),
    ('WT Feat: Transform', 'ETL transformation engine', 'WT Epic: Pipeline', 'backlog', 'null', 30, 12006),
    ('WT Feat: ECS', 'ECS container migration', 'WT Epic: AWS Migrate', 'done', 'green', 45, 12007),
    ('WT Feat: RDS', 'RDS database upgrade', 'WT Epic: AWS Migrate', 'implementing', 'green', 30, 12008),
    ('WT Feat: S3', 'S3 lifecycle policies', 'WT Epic: AWS Migrate', 'implementing', 'green', 20, 12009),
    ('WT Feat: Dashboard', 'React dashboard v2', 'WT Epic: Portal', 'implementing', 'green', 55, 12010),
    ('WT Feat: iOS', 'iOS native rebuild', 'WT Epic: Mobile', 'implementing', 'yellow', 60, 12011),
    ('WT Feat: Android', 'Android native rebuild', 'WT Epic: Mobile', 'implementing', 'yellow', 60, 12012)
  ) v(name, description, epic_name, status, health, points, rank)
  JOIN epics e ON e.name = v.epic_name
  WHERE NOT EXISTS (SELECT 1 FROM features f WHERE f.name = v.name);

END $$;