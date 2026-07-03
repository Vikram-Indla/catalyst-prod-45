-- P1-S10b data-repair: the P1-S9 backfill (20260703410000) set requirement_id
-- but never external_key/external_title on those 16 rows. TestCoveragePanel.tsx
-- and TestCasesSection.tsx both read tm_requirement_links by external_key, so
-- those rows were invisible to both readers despite having a valid FK.
UPDATE tm_requirement_links l
SET external_key = i.issue_key,
    external_title = i.summary
FROM ph_issues i
WHERE l.requirement_id = i.id
  AND l.requirement_type = 'story'
  AND l.external_key IS NULL;
