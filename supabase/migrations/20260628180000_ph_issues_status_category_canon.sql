-- Phase: status canonicalization. status_category is now the canonical
-- lowercase StatusCategory (todo|in_progress|done) — see work-item-canon.
-- Normalize legacy Title-case + null, then constrain. Applied cyij + lmqw.
-- Per-status -> category assignment remains workflow-scheme driven (the
-- fresh-status rebuild owns that); this locks the category vocabulary only.

update ph_issues set status_category='todo'        where status_category in ('To Do','todo','To do','TODO');
update ph_issues set status_category='in_progress' where status_category in ('In Progress','In-Progress','in progress');
update ph_issues set status_category='done'        where status_category in ('Done','DONE');
update ph_issues set status_category='todo'        where status_category is null;

alter table ph_issues
  drop constraint if exists ph_issues_status_category_chk,
  add constraint ph_issues_status_category_chk
    check (status_category in ('todo','in_progress','done'));
