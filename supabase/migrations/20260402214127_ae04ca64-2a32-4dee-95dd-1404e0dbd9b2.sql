
-- Disable protective triggers
ALTER TABLE ph_project_members DISABLE TRIGGER ph_prevent_last_admin_removal;
ALTER TABLE ph_project_members DISABLE TRIGGER ph_prevent_last_admin_demotion;
ALTER TABLE ph_workflow_statuses DISABLE TRIGGER ph_protect_default_status;
ALTER TABLE ph_work_items DISABLE TRIGGER trg_guard_ph_work_items_no_delete;
ALTER TABLE ph_issues DISABLE TRIGGER trg_guard_ph_issues_no_delete;

-- Clear non-cascading child tables first
DELETE FROM ph_dashboard_activity;
DELETE FROM ph_defects;
DELETE FROM ph_incidents;
DELETE FROM ph_ideas;
DELETE FROM ph_initiative_budget_items;
DELETE FROM ph_initiative_links;
DELETE FROM ph_initiative_milestones;
DELETE FROM ph_initiative_risks;
DELETE FROM ph_initiative_scores;
DELETE FROM ph_initiatives;
DELETE FROM jira_deleted_items;
DELETE FROM ph_jira_sync_log;
DELETE FROM ph_sdlc_issues;
DELETE FROM ph_sdlc_releases;
DELETE FROM ph_comments;
DELETE FROM ph_issues;
DELETE FROM ph_work_items;
DELETE FROM ph_boards;
DELETE FROM ph_saved_views;
DELETE FROM ph_config;
DELETE FROM ph_resources;

-- Now delete ph_projects (cascades: ph_project_members, ph_workflow_statuses, ph_labels, ph_components, ph_releases, ph_work_types, etc.)
DELETE FROM ph_projects;

-- Clear legacy tables
DELETE FROM project_members;
DELETE FROM sync_events;
DELETE FROM projects WHERE key != 'TH-DEFAULT';

-- Re-enable triggers
ALTER TABLE ph_project_members ENABLE TRIGGER ph_prevent_last_admin_removal;
ALTER TABLE ph_project_members ENABLE TRIGGER ph_prevent_last_admin_demotion;
ALTER TABLE ph_workflow_statuses ENABLE TRIGGER ph_protect_default_status;
ALTER TABLE ph_work_items ENABLE TRIGGER trg_guard_ph_work_items_no_delete;
ALTER TABLE ph_issues ENABLE TRIGGER trg_guard_ph_issues_no_delete;
