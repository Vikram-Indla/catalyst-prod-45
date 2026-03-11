
-- Clean slate
DELETE FROM feature_flag_dependencies;
DELETE FROM feature_flag_audit;
DELETE FROM feature_flags;

-- Re-seed canonical 13 Catalyst modules (including legacy 'label' and 'is_enabled' columns)
INSERT INTO feature_flags (module_key, label, module_name, description, category, status, enabled, is_enabled, route, icon_name, icon_color, sort_order, updated_by_name, group_name) VALUES
  ('strategy_hub', 'StrategyHub', 'StrategyHub', 'Strategy room, themes, goals & key results', 'Strategy', 'live', true, true, '/strategy', 'Compass', 'blue', 1, 'Dr. Ahmed Al-Rashid', 'modules'),
  ('plan_hub', 'PlanHub', 'PlanHub', 'Planning library, scenarios, master plan & budget planner', 'Strategy', 'live', true, true, '/plans', 'Calendar', 'blue', 2, 'Eng. Fatima Al-Harbi', 'modules'),
  ('task_hub', 'TaskHub', 'TaskHub', 'Personal tasks, priorities & time management', 'Strategy', 'live', true, true, '/tasks', 'CheckSquare', 'neutral', 3, 'Eng. Fatima Al-Harbi', 'modules'),
  ('product_hub', 'ProductHub', 'ProductHub', 'Product backlog, ideation, roadmap, kanban & requirement assist', 'Product', 'live', true, true, '/products', 'Package', 'blue', 1, 'Dr. Ahmed Al-Rashid', 'modules'),
  ('project_hub', 'ProjectHub', 'ProjectHub', 'Project dashboard, boards, backlogs, hierarchy & resource 360', 'Delivery', 'live', true, true, '/projects', 'FolderKanban', 'blue', 1, 'Eng. Omar Al-Sayed', 'modules'),
  ('work_hub', 'WorkHub', 'WorkHub', 'Jira sync, work items, themes, releases & capacity views', 'Delivery', 'live', true, true, '/work', 'Layers', 'teal', 2, 'Eng. Omar Al-Sayed', 'modules'),
  ('capacity_hub', 'CapacityHub', 'CapacityHub', 'Team capacity planning, allocation heatmaps & sprint views', 'Delivery', 'draft', false, false, '/capacity', 'Users', 'neutral', 3, 'System', 'modules'),
  ('test_hub', 'TestHub', 'TestHub', 'Test repository, cycles, execution, defects & QA assistant', 'Quality', 'live', true, true, '/testing', 'ShieldCheck', 'teal', 1, 'Eng. Layla Al-Dosari', 'modules'),
  ('release_hub', 'ReleaseHub', 'ReleaseHub', 'Release command center, change management & production events', 'Quality', 'live', true, true, '/releases', 'Rocket', 'blue', 2, 'Eng. Layla Al-Dosari', 'modules'),
  ('incident_hub', 'IncidentHub', 'IncidentHub', 'Incident management, kanban, analytics & committee queue', 'Operations', 'live', true, true, '/incidents', 'AlertTriangle', 'red', 1, 'Eng. Khalid Al-Mutairi', 'modules'),
  ('wiki_hub', 'WikiHub', 'WikiHub', 'Knowledge base, articles, AI search & learning paths', 'Operations', 'live', true, true, '/wiki', 'BookOpen', 'teal', 2, 'Eng. Fatima Al-Harbi', 'modules'),
  ('analytics_hub', 'AnalyticsHub', 'AnalyticsHub', 'Cross-portfolio analytics, dashboards & executive reporting', 'Operations', 'draft', false, false, '/analytics', 'BarChart3', 'neutral', 3, 'System', 'modules'),
  ('budget_hub', 'BudgetHub', 'BudgetHub', 'Budget tracking, cost centers, forecasting & SAR allocations', 'Operations', 'draft', false, false, '/budgets', 'DollarSign', 'neutral', 4, 'System', 'modules');

-- Re-seed dependencies
INSERT INTO feature_flag_dependencies (flag_id, depends_on_key, dependency_type, description)
SELECT f.id, 'project_hub', 'requires', 'WorkHub requires ProjectHub for project context and hierarchy'
FROM feature_flags f WHERE f.module_key = 'work_hub';

INSERT INTO feature_flag_dependencies (flag_id, depends_on_key, dependency_type, description)
SELECT f.id, 'project_hub', 'requires', 'CapacityHub requires ProjectHub for team allocation data'
FROM feature_flags f WHERE f.module_key = 'capacity_hub';

INSERT INTO feature_flag_dependencies (flag_id, depends_on_key, dependency_type, description)
SELECT f.id, 'test_hub', 'recommended', 'ReleaseHub benefits from TestHub for quality gate data'
FROM feature_flags f WHERE f.module_key = 'release_hub';

INSERT INTO feature_flag_dependencies (flag_id, depends_on_key, dependency_type, description)
SELECT f.id, 'incident_hub', 'recommended', 'ReleaseHub benefits from IncidentHub for production event correlation'
FROM feature_flags f WHERE f.module_key = 'release_hub';
