
-- Add project_id to test_activity_log for project-scoped reporting
ALTER TABLE public.test_activity_log 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_test_activity_log_project_id 
ON public.test_activity_log(project_id);

CREATE INDEX IF NOT EXISTS idx_test_activity_log_user_created 
ON public.test_activity_log(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_test_activity_log_activity_type 
ON public.test_activity_log(activity_type);

-- Add effort_hours column if not exists for effort tracking
ALTER TABLE public.test_activity_log 
ADD COLUMN IF NOT EXISTS effort_hours NUMERIC(8, 2);

-- Add metadata column for additional context
ALTER TABLE public.test_activity_log 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
