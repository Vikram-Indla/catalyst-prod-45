-- Add is_default column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create a unique partial index to ensure only one default project exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_single_default ON public.projects (is_default) WHERE is_default = TRUE;

-- Insert the default project (using the existing program)
INSERT INTO public.projects (id, program_id, name, key, is_default, status, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Default',
  'DEFAULT',
  TRUE,
  'active',
  'Default project for features without a specific project assignment'
)
ON CONFLICT (id) DO UPDATE SET
  name = 'Default',
  is_default = TRUE;