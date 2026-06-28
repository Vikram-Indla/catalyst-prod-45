-- Phase 3 (work-item canon): DB-level enum constraints on ph_issues.
-- Pre-prod ratchet — locks priority/severity to the canonical Title-case
-- vocabulary (src/types/work-item-canon.ts). Data probed clean before apply:
-- priority ∈ {Highest,High,Medium,Low,Lowest,null}; severity all null.
--
-- issue_type and status are intentionally NOT constrained here — both carry
-- legacy/dirty values (subtask types Backend/Frontend/Integration, casing
-- dupes ToDo/To Do, In-Progress/In Progress) that need a normalization pass
-- first. See follow-up migration.

alter table ph_issues
  drop constraint if exists ph_issues_priority_chk,
  add constraint ph_issues_priority_chk
    check (priority is null or priority in ('Highest','High','Medium','Low','Lowest'));

alter table ph_issues
  drop constraint if exists ph_issues_severity_chk,
  add constraint ph_issues_severity_chk
    check (severity is null or severity in ('Blocker','Critical','Major','Minor','Trivial'));
