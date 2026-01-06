-- ══════════════════════════════════════════════════════════════════════════════
-- MODULE 5: SETTINGS & ADMIN - STAGE 1 COMPLETION
-- Create audit_logs table with unique index names
-- ══════════════════════════════════════════════════════════════════════════════

-- Create audit_action enum type (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM (
      'create', 'update', 'delete', 'login', 'logout',
      'invite', 'join', 'leave', 'archive', 'restore',
      'export', 'import', 'connect', 'disconnect'
    );
  END IF;
END $$;

-- Create audit_logs table for settings module
CREATE TABLE IF NOT EXISTS public.tm_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Actor
  user_id UUID REFERENCES public.profiles(id),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  
  -- Action
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_name VARCHAR(255),
  
  -- Details
  changes JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tm_audit_logs_project ON public.tm_audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_tm_audit_logs_user ON public.tm_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tm_audit_logs_action ON public.tm_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_tm_audit_logs_entity ON public.tm_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_tm_audit_logs_created ON public.tm_audit_logs(created_at DESC);

-- RLS
ALTER TABLE public.tm_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and leads can view audit logs" ON public.tm_audit_logs;
CREATE POLICY "Admins and leads can view audit logs"
  ON public.tm_audit_logs FOR SELECT
  USING (project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'lead')
  ));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.tm_audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.tm_audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION tm_create_audit_log(
  p_project_id UUID,
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name VARCHAR DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email VARCHAR;
  v_user_name VARCHAR;
  v_log_id UUID;
BEGIN
  SELECT id, email, COALESCE(full_name, email) 
  INTO v_user_id, v_user_email, v_user_name
  FROM public.profiles
  WHERE id = auth.uid();
  
  INSERT INTO public.tm_audit_logs (
    project_id, user_id, user_email, user_name,
    action, entity_type, entity_id, entity_name,
    changes, metadata
  ) VALUES (
    p_project_id, v_user_id, v_user_email, v_user_name,
    p_action, p_entity_type, p_entity_id, p_entity_name,
    p_changes, p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;