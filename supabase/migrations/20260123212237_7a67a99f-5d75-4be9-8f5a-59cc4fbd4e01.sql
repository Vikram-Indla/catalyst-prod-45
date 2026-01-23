-- Add missing columns to test_folders table
ALTER TABLE public.test_folders ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.test_folders ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Create index on organization_id for better query performance
CREATE INDEX IF NOT EXISTS idx_test_folders_organization_id ON public.test_folders(organization_id);