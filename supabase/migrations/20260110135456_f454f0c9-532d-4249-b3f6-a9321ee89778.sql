-- Drop EFD Wizard tables (deleted module)
DROP TABLE IF EXISTS public.efd_trace_links CASCADE;
DROP TABLE IF EXISTS public.efd_atoms CASCADE;
DROP TABLE IF EXISTS public.efd_features CASCADE;
DROP TABLE IF EXISTS public.efd_epics CASCADE;
DROP TABLE IF EXISTS public.efd_documents CASCADE;
DROP TABLE IF EXISTS public.efd_audit_log CASCADE;
DROP TABLE IF EXISTS public.efd_wizard_sessions CASCADE;

-- Drop OKR tables (not implemented)
DROP TABLE IF EXISTS public.okr_check_ins CASCADE;
DROP TABLE IF EXISTS public.okr_key_result_periods CASCADE;
DROP TABLE IF EXISTS public.okr_key_results CASCADE;
DROP TABLE IF EXISTS public.okr_objectives CASCADE;
DROP TABLE IF EXISTS public.okr_periods CASCADE;
DROP TABLE IF EXISTS public.okr_settings CASCADE;

-- Drop Retrospective tables (not used)
DROP TABLE IF EXISTS public.retrospective_action_items CASCADE;
DROP TABLE IF EXISTS public.retrospective_items CASCADE;
DROP TABLE IF EXISTS public.retrospectives CASCADE;

-- Drop Skills tables (not used)
DROP TABLE IF EXISTS public.skill_assessments CASCADE;
DROP TABLE IF EXISTS public.skill_categories CASCADE;
DROP TABLE IF EXISTS public.skill_inventory CASCADE;

-- Drop Sprint/Team tables (not used)
DROP TABLE IF EXISTS public.sprint_backlogs CASCADE;
DROP TABLE IF EXISTS public.team_iterations CASCADE;
DROP TABLE IF EXISTS public.team_pi_capacities CASCADE;
DROP TABLE IF EXISTS public.team_products CASCADE;
DROP TABLE IF EXISTS public.team_relations CASCADE;
DROP TABLE IF EXISTS public.team_sprints CASCADE;

-- Drop Story History tables (not used)
DROP TABLE IF EXISTS public.story_history CASCADE;
DROP TABLE IF EXISTS public.story_state_history CASCADE;
DROP TABLE IF EXISTS public.story_work_logs CASCADE;

-- Drop Vendor/WSJF tables (not used)
DROP TABLE IF EXISTS public.vendor_forecast_summaries CASCADE;
DROP TABLE IF EXISTS public.vendor_rate_cards CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.wsjf_history CASCADE;

-- Drop Layout/Links tables (not used)
DROP TABLE IF EXISTS public.layout_user_states CASCADE;
DROP TABLE IF EXISTS public.link_types CASCADE;
DROP TABLE IF EXISTS public.lov_kv CASCADE;
DROP TABLE IF EXISTS public.lov_audit_log CASCADE;

-- Drop Portfolio/Planning tables (not used)
DROP TABLE IF EXISTS public.planning_horizons CASCADE;
DROP TABLE IF EXISTS public.platform_feedbacks CASCADE;
DROP TABLE IF EXISTS public.portfolio_budget_snapshots_backup CASCADE;
DROP TABLE IF EXISTS public.portfolio_budget_snapshots CASCADE;

-- Drop Project tables (not used)
DROP TABLE IF EXISTS public.project_key_sequences CASCADE;
DROP TABLE IF EXISTS public.project_links CASCADE;
DROP TABLE IF EXISTS public.project_portfolio_links CASCADE;
DROP TABLE IF EXISTS public.project_statuses CASCADE;

-- Drop old TM module tables (duplicate)
DROP TABLE IF EXISTS public.tm_case_review_comments CASCADE;
DROP TABLE IF EXISTS public.tm_case_review_items CASCADE;
DROP TABLE IF EXISTS public.tm_review_sessions CASCADE;
DROP TABLE IF EXISTS public.tm_case_test_step_links CASCADE;
DROP TABLE IF EXISTS public.tm_case_histories CASCADE;
DROP TABLE IF EXISTS public.tm_case_folders CASCADE;

-- Drop Snapshots table (not used)
DROP TABLE IF EXISTS public.snapshots CASCADE;

-- Drop Solution Train tables (not used)
DROP TABLE IF EXISTS public.solution_train_releases CASCADE;
DROP TABLE IF EXISTS public.solution_trains CASCADE;

-- Drop Release Management tables (module being deleted)
DROP TABLE IF EXISTS public.release_changelog CASCADE;
DROP TABLE IF EXISTS public.release_artifacts CASCADE;
DROP TABLE IF EXISTS public.release_milestones CASCADE;
DROP TABLE IF EXISTS public.release_windows CASCADE;