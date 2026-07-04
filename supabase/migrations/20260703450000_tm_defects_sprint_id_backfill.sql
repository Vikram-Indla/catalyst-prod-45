-- P1-S12 (DEF-012): backfill tm_defects.sprint_id from the legacy sprint
-- text column where it matches a real ph_jira_sprints.name. Zero-assumption:
-- if no exact name match exists, sprint_id stays null rather than guessing --
-- verified live that all 3 pre-existing tm_defects.sprint values (e.g.
-- 'BAU-6075') do NOT match any real sprint name (those look like issue keys,
-- not sprint names), so this is a correct no-op today, not dead code --
-- it protects any future row where the text does resolve.
UPDATE tm_defects d
SET sprint_id = s.id
FROM ph_jira_sprints s
WHERE d.sprint = s.name
  AND d.sprint_id IS NULL;
