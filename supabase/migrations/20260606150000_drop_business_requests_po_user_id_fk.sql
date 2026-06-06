-- Drop the FK constraint business_requests.po_user_id → auth.users(id).
--
-- Why: project_manager_user_id (Delivery Manager) was added with no FK
-- (see 20251211141446_remix_migration_from_pg_dump.sql:2253). po_user_id
-- (Product Owner) was added with a FK to auth.users in
-- 20260427120000_business_request_feature_unification.sql:45. Both pickers
-- in BrSidebarDetails populate options from `profiles`. profiles.id is
-- linked to auth.users.id (CASCADE), but the database holds at least one
-- profile whose id is not in auth.users (orphan / imported / test row),
-- making the picker offer options that cannot be saved.
--
-- This migration removes the FK so po_user_id behaves identically to
-- project_manager_user_id: any UUID writes. The picker is independently
-- being filtered to approved profiles only (BrSidebarDetails.useProfiles)
-- to reduce the chance of orphan ids being assigned in the first place.
--
-- Reversibility: re-add the FK with
--   ALTER TABLE public.business_requests
--     ADD CONSTRAINT business_requests_po_user_id_fkey
--     FOREIGN KEY (po_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- (Cleanup of any non-auth.users po_user_id values is required first.)

ALTER TABLE public.business_requests
  DROP CONSTRAINT IF EXISTS business_requests_po_user_id_fkey;
