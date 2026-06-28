-- Phase 3b (work-item canon): normalize ph_issues issue_type + status, then
-- constrain issue_type. Applied to PROD after the priority/severity pass.
--
-- Legacy issue_type remap (3+3+2 rows): Defect->QA Bug, BRD Task->Task,
-- API Requirement->Story. Status casing merges fold dupes onto canon labels.
-- issue_type is then locked to the canonical set + the real Jira subtask
-- kinds (Backend/Frontend/Integration/Sub-task). status is left unconstrained
-- on purpose — valid values are workflow-scheme driven, not a fixed enum.

update ph_issues set issue_type = 'QA Bug' where issue_type = 'Defect';
update ph_issues set issue_type = 'Task'   where issue_type = 'BRD Task';
update ph_issues set issue_type = 'Story'  where issue_type = 'API Requirement';

update ph_issues set status = 'To Do'       where status = 'ToDo';
update ph_issues set status = 'In Progress' where status = 'In-Progress';
update ph_issues set status = 'On Hold'     where status = 'hold';
update ph_issues set status = 'Beta Ready'  where status = 'BETA READY';

alter table ph_issues
  drop constraint if exists ph_issues_issue_type_chk,
  add constraint ph_issues_issue_type_chk
    check (issue_type in (
      'Story','Epic','Feature','Business Gap','QA Bug','Production Incident',
      'Change Request','Task','Sub-task','Backend','Frontend','Integration'
    ));
