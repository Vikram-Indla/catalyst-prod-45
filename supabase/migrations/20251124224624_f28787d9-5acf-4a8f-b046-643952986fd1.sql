-- Drop business_requests table (not part of standard Jira Align)
-- First drop foreign key constraints from epics table
ALTER TABLE epics DROP CONSTRAINT IF EXISTS epics_br_id_fkey;

-- Drop the business_requests table
DROP TABLE IF EXISTS business_requests CASCADE;