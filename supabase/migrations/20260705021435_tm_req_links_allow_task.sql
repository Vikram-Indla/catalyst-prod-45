-- CAT-TESTHUB-REBUILD-20260704-001 Phase C
-- Widen tm_requirement_links.requirement_type CHECK to allow 'task'.
-- 'defect' and 'incident' were already permitted; only 'task' was missing, so
-- Task work-item links had to route through the generic 'external' bucket.
-- Adding 'task' lets Task requirement links be first-class (typed, filterable).

ALTER TABLE tm_requirement_links
  DROP CONSTRAINT IF EXISTS tm_requirement_links_requirement_type_check;

ALTER TABLE tm_requirement_links
  ADD CONSTRAINT tm_requirement_links_requirement_type_check
  CHECK (requirement_type = ANY (ARRAY[
    'story'::text,
    'epic'::text,
    'feature'::text,
    'business_request'::text,
    'task'::text,
    'defect'::text,
    'incident'::text,
    'external'::text
  ]));
