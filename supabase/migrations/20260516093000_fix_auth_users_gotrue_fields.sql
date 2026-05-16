-- Fix auth.users rows that were SQL-inserted without GoTrue's required fields.
-- Root cause discovered 2026-05-16: direct SQL inserts bypass GoTrue which normally
-- sets instance_id, aud, role, and empty-string token fields. Missing these causes:
--   - instance_id=NULL  → GoTrue admin list/get returns user_not_found
--   - aud/role=NULL     → GoTrue can't authenticate the user
--   - token fields=NULL → GoTrue scan error "converting NULL to string is unsupported"
--
-- This migration is idempotent — safe to re-run.
UPDATE auth.users SET
  instance_id            = COALESCE(instance_id, '00000000-0000-0000-0000-000000000000'),
  aud                    = COALESCE(aud, 'authenticated'),
  role                   = COALESCE(role, 'authenticated'),
  confirmation_token     = COALESCE(confirmation_token, ''),
  recovery_token         = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change           = COALESCE(email_change, ''),
  phone_change           = COALESCE(phone_change, ''),
  phone_change_token     = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, '')
WHERE
  instance_id IS NULL
  OR aud IS NULL
  OR role IS NULL
  OR confirmation_token IS NULL
  OR recovery_token IS NULL;
