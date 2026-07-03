-- P1-S9: tm_requirement_links.requirement_id -> ph_issues FK + project_id column.
-- Orphan check (probe P0.3, re-verified live): 0 orphans out of 20 existing links.
-- Order per Plan Lock A4 F1: ADD COLUMN + backfill -> ADD CONSTRAINT NOT VALID -> VALIDATE.

alter table tm_requirement_links
  add column if not exists project_id uuid references tm_projects(id);

update tm_requirement_links l
set project_id = tc.project_id
from tm_test_cases tc
where tc.id = l.test_case_id
  and l.project_id is null;

alter table tm_requirement_links
  add constraint tm_requirement_links_requirement_id_fkey
  foreign key (requirement_id) references ph_issues(id)
  not valid;

alter table tm_requirement_links
  validate constraint tm_requirement_links_requirement_id_fkey;

-- DAT-031: backfill legacy tm_test_cases.linked_story_key rows into the links table.
-- Reader/writer repoint to this table happens in P1-S10 — linked_story_key is NOT
-- retired here (A2 S3: retire-first banned, backfill row-count proof comes first).
insert into tm_requirement_links (test_case_id, requirement_type, requirement_id, project_id, link_type)
select tc.id, 'story', i.id, tc.project_id, 'verifies'
from tm_test_cases tc
join ph_issues i on i.issue_key = tc.linked_story_key
where tc.linked_story_key is not null
on conflict (test_case_id, requirement_type, requirement_id) do nothing;
