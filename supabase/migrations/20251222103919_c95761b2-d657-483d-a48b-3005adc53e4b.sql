-- Add missing columns to features table for Board View
ALTER TABLE public.features 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.releases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_features_workflow_status ON public.features(workflow_status);
CREATE INDEX IF NOT EXISTS idx_features_priority ON public.features(priority);
CREATE INDEX IF NOT EXISTS idx_features_release_id ON public.features(release_id);
CREATE INDEX IF NOT EXISTS idx_features_assignee_id ON public.features(assignee_id);
CREATE INDEX IF NOT EXISTS idx_features_project_id ON public.features(project_id);

-- Add comment for documentation
COMMENT ON COLUMN public.features.priority IS 'Feature priority: critical, high, medium, low';
COMMENT ON COLUMN public.features.workflow_status IS 'Workflow status: backlog, design, ready_for_dev, in_development, qa_testing, uat_testing, in_beta, ready_for_prod, in_production, on_hold';