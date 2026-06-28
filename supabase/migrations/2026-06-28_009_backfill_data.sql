-- Migration: Backfill data from planned_quarter → business_request_milestone_links

BEGIN;

-- Step 1: Populate quarter in product_milestones (if not already done)
UPDATE product_milestones
SET quarter = CASE
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '1' THEN 'Q1'
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '2' THEN 'Q2'
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '3' THEN 'Q3'
  WHEN EXTRACT(quarter FROM target_date)::TEXT = '4' THEN 'Q4'
END
WHERE quarter IS NULL AND target_date IS NOT NULL;

-- Step 2: Populate key in product_milestones (if not already done)
UPDATE product_milestones
SET key = 'PDM-' || EXTRACT(YEAR FROM target_date)::TEXT || '-' || quarter || '-' ||
  LPAD(sequence::TEXT, 3, '0')
WHERE key IS NULL;

-- Step 3: Link BRs to milestones based on planned_quarter
INSERT INTO business_request_milestone_links (
  business_request_id,
  milestone_id,
  sequence_in_milestone,
  is_primary,
  created_by
)
SELECT DISTINCT
  br.id,
  pm.id,
  1 as sequence_in_milestone,
  TRUE as is_primary,
  '00000000-0000-0000-0000-000000000001'::UUID as created_by
FROM business_requests br
JOIN product_milestones pm
  ON br.product_id = pm.product_id
WHERE br._deprecated_planned_quarter IS NOT NULL
  AND br._deprecated_planned_quarter = pm.quarter
  AND NOT EXISTS (
    SELECT 1 FROM business_request_milestone_links brml
    WHERE brml.business_request_id = br.id AND brml.milestone_id = pm.id
  )
ON CONFLICT DO NOTHING;

-- Step 4: Backfill feature milestone links
UPDATE project_features pf
SET linked_milestone_ids = (
  SELECT ARRAY_AGG(DISTINCT brml.milestone_id)
  FROM business_request_milestone_links brml
  WHERE brml.business_request_id = ANY(pf.linked_business_request_ids)
    AND brml.milestone_id IS NOT NULL
)
WHERE pf.deleted_at IS NULL
  AND ARRAY_LENGTH(pf.linked_business_request_ids, 1) > 0;

-- Step 5: Verify backfill
DO $$
DECLARE
  br_count INTEGER;
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO br_count FROM business_request_milestone_links;
  RAISE NOTICE 'Backfilled % BR-milestone links', br_count;

  SELECT COUNT(*) INTO orphaned_count FROM business_requests
    WHERE _deprecated_planned_quarter IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM business_request_milestone_links
        WHERE business_request_id = business_requests.id
      );

  IF orphaned_count > 0 THEN
    RAISE WARNING 'WARNING: % BRs have planned_quarter but no milestone link', orphaned_count;
  END IF;
END $$;

COMMIT;
