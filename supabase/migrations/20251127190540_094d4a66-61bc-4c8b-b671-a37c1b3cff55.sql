-- Seed data for OKR Tree testing
-- Focus on objectives hierarchy only

DO $$
DECLARE
  v_snapshot_id UUID;
  v_profile_id UUID;
  v_strategic_level_id UUID := '4133134f-6924-446f-ae0d-2c4552449177';
  v_portfolio_level_id UUID := 'c99a4bc0-88e5-4ce4-aa34-bfd9e59f7c62';
  v_program_level_id UUID := 'f6d5c019-b17b-4dbc-9142-451ad754b6d4';
  v_team_level_id UUID := '9f1926f9-1482-42c9-b004-901e9d498c51';
  v_sg1_id UUID;
  v_sg2_id UUID;
  v_po1_id UUID;
  v_po2_id UUID;
  v_po3_id UUID;
  v_pr1_id UUID;
  v_pr2_id UUID;
  v_pr3_id UUID;
BEGIN
  -- Get or create snapshot
  SELECT id INTO v_snapshot_id FROM strategy_snapshots WHERE name = 'Corporate Strategy 2025' LIMIT 1;
  IF v_snapshot_id IS NULL THEN
    INSERT INTO strategy_snapshots (name, start_date, end_date, description)
    VALUES ('Corporate Strategy 2025', '2025-01-01', '2025-12-31', 'Annual corporate strategy')
    RETURNING id INTO v_snapshot_id;
  END IF;
  
  -- Get profile
  SELECT id INTO v_profile_id FROM profiles LIMIT 1;
  
  -- Insert Strategic Goals
  SELECT id INTO v_sg1_id FROM objectives WHERE name = 'Drive Digital Transformation' AND level = 'strategic_goal' LIMIT 1;
  IF v_sg1_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id)
    VALUES (v_snapshot_id, v_strategic_level_id, 'Drive Digital Transformation', 'strategic_goal', 0.75, 68, v_profile_id)
    RETURNING id INTO v_sg1_id;
  END IF;
  
  SELECT id INTO v_sg2_id FROM objectives WHERE name = 'Expand Market Presence' AND level = 'strategic_goal' LIMIT 1;
  IF v_sg2_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id)
    VALUES (v_snapshot_id, v_strategic_level_id, 'Expand Market Presence', 'strategic_goal', 0.65, 55, v_profile_id)
    RETURNING id INTO v_sg2_id;
  END IF;
  
  -- Insert Portfolio Objectives
  SELECT id INTO v_po1_id FROM objectives WHERE name = 'Modernize Core Platform' LIMIT 1;
  IF v_po1_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_portfolio_level_id, 'Modernize Core Platform', 'portfolio', 0.80, 72, v_profile_id, v_sg1_id)
    RETURNING id INTO v_po1_id;
  END IF;
  
  SELECT id INTO v_po2_id FROM objectives WHERE name = 'Launch Mobile Experience' LIMIT 1;
  IF v_po2_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_portfolio_level_id, 'Launch Mobile Experience', 'portfolio', 0.70, 65, v_profile_id, v_sg1_id)
    RETURNING id INTO v_po2_id;
  END IF;
  
  SELECT id INTO v_po3_id FROM objectives WHERE name = 'Enter APAC Markets' LIMIT 1;
  IF v_po3_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_portfolio_level_id, 'Enter APAC Markets', 'portfolio', 0.60, 50, v_profile_id, v_sg2_id)
    RETURNING id INTO v_po3_id;
  END IF;
  
  -- Insert Program Objectives
  SELECT id INTO v_pr1_id FROM objectives WHERE name = 'API Gateway Migration' LIMIT 1;
  IF v_pr1_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_program_level_id, 'API Gateway Migration', 'program', 0.85, 78, v_profile_id, v_po1_id)
    RETURNING id INTO v_pr1_id;
  END IF;
  
  SELECT id INTO v_pr2_id FROM objectives WHERE name = 'Database Modernization' LIMIT 1;
  IF v_pr2_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_program_level_id, 'Database Modernization', 'program', 0.75, 68, v_profile_id, v_po1_id)
    RETURNING id INTO v_pr2_id;
  END IF;
  
  SELECT id INTO v_pr3_id FROM objectives WHERE name = 'iOS App Development' LIMIT 1;
  IF v_pr3_id IS NULL THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_program_level_id, 'iOS App Development', 'program', 0.72, 67, v_profile_id, v_po2_id)
    RETURNING id INTO v_pr3_id;
  END IF;
  
  -- Insert Team Objectives
  IF NOT EXISTS (SELECT 1 FROM objectives WHERE name = 'Gateway Performance Optimization') THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_team_level_id, 'Gateway Performance Optimization', 'team', 0.88, 82, v_profile_id, v_pr1_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM objectives WHERE name = 'Security Hardening') THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_team_level_id, 'Security Hardening', 'team', 0.82, 75, v_profile_id, v_pr1_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM objectives WHERE name = 'PostgreSQL Migration') THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_team_level_id, 'PostgreSQL Migration', 'team', 0.78, 70, v_profile_id, v_pr2_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM objectives WHERE name = 'iOS UI Components') THEN
    INSERT INTO objectives (snapshot_id, objective_level_id, name, level, confidence_score, progress_pct, owner_id, parent_objective_id)
    VALUES (v_snapshot_id, v_team_level_id, 'iOS UI Components', 'team', 0.75, 68, v_profile_id, v_pr3_id);
  END IF;
  
END $$;