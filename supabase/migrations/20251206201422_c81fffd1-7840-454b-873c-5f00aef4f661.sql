-- Add RLS policy to allow public inserts to business_request_discussions for system comments
-- This allows the external form to insert system comments without authentication

-- First check if policy exists and drop if so
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_request_discussions' 
    AND policyname = 'Allow public insert for system comments'
  ) THEN
    DROP POLICY "Allow public insert for system comments" ON public.business_request_discussions;
  END IF;
END $$;

-- Create policy allowing public inserts with the system user placeholder UUID
CREATE POLICY "Allow public insert for system comments"
ON public.business_request_discussions
FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000');

-- Add RLS policy to allow public inserts to business_request_audit_logs for system logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_request_audit_logs' 
    AND policyname = 'Allow public insert for system audit logs'
  ) THEN
    DROP POLICY "Allow public insert for system audit logs" ON public.business_request_audit_logs;
  END IF;
END $$;

-- Create policy allowing public inserts where actor_name is 'System'
CREATE POLICY "Allow public insert for system audit logs"
ON public.business_request_audit_logs
FOR INSERT
WITH CHECK (actor_name = 'System');

-- Also ensure public can read system comments and audit logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_request_discussions' 
    AND policyname = 'Allow read system comments'
  ) THEN
    DROP POLICY "Allow read system comments" ON public.business_request_discussions;
  END IF;
END $$;

CREATE POLICY "Allow read system comments"
ON public.business_request_discussions
FOR SELECT
USING (user_id = '00000000-0000-0000-0000-000000000000');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'business_request_audit_logs' 
    AND policyname = 'Allow read system audit logs'
  ) THEN
    DROP POLICY "Allow read system audit logs" ON public.business_request_audit_logs;
  END IF;
END $$;

CREATE POLICY "Allow read system audit logs"
ON public.business_request_audit_logs
FOR SELECT
USING (actor_name = 'System');