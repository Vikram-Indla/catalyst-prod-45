-- Fix ambiguous RPC overload resolution for aqd_checkout_week
-- PostgREST cannot reliably resolve overloaded functions with the same arg names/types.
-- Keep: aqd_checkout_week(uuid, uuid, jsonb)
-- Drop: aqd_checkout_week(uuid, jsonb, uuid)

DROP FUNCTION IF EXISTS public.aqd_checkout_week(uuid, jsonb, uuid);