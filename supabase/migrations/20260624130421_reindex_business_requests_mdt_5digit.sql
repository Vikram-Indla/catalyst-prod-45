-- Recovered from staging migration history (applied 2026-06-24 13:04:21)
-- Migration: reindex_business_requests_mdt_5digit
-- Re-index all business_requests to MDT-00001 ... MDT-00081 (5-digit, sequential by created_at)
-- Also updates ph_issues.parent_key for the 8 rows that reference BR keys.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      id,
      request_key AS old_key,
      'MDT-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST)::text, 5, '0') AS new_key
    FROM business_requests
    WHERE request_key IS NOT NULL
      AND deleted_at IS NULL
  LOOP
    -- Update ph_issues that reference the old key BEFORE changing the BR
    UPDATE ph_issues
    SET parent_key = r.new_key
    WHERE parent_key = r.old_key;

    -- Rename the BR itself
    UPDATE business_requests
    SET request_key = r.new_key
    WHERE id = r.id;
  END LOOP;
END $$;
