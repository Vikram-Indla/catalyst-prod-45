-- Clean purge of work item data — skips tables that don't exist on fresh install
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'sla_records','committee_votes','committee_members','incident_committees','incidents',
    'defects','stories','features','epics','objectives',
    'change_cards','change_numbers','release_versions','releases',
    'business_requests',
    'capacity_allocations','capacity_bookings','capacity_plans',
    'iterations','anchor_sprints','program_increments',
    'team_members','teams',
    'projects',
    'risks','dependencies','milestones',
    'ideas','idea_groups','initiatives','goals',
    'kb_documents',
    'announcements','notifications','starred_items',
    'custom_field_values','board_configs','certifications',
    'forecast_entries','kanban_cards','kanban_columns','kanban_swim_lanes','kanban_boards'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('TRUNCATE TABLE %I CASCADE', t);
    EXCEPTION WHEN undefined_table THEN
      NULL; -- table doesn't exist, skip
    END;
  END LOOP;
END $$;
