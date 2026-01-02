-- Add import audit log
CREATE TABLE IF NOT EXISTS public.injira_import_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  import_job_id UUID REFERENCES public.injira_import_jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add external tracking to issues
ALTER TABLE public.injira_issues 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS import_job_id UUID REFERENCES public.injira_import_jobs(id),
ADD COLUMN IF NOT EXISTS ai_suggestions_pending BOOLEAN DEFAULT false;

-- Enable RLS on audit log
ALTER TABLE public.injira_import_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Approved users can view import audit" ON public.injira_import_audit_log
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Approved users can insert import audit" ON public.injira_import_audit_log
  FOR INSERT WITH CHECK (public.current_user_is_approved());