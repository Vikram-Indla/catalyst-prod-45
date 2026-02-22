
-- Add project_name to ph_issues for quick lookup
ALTER TABLE public.ph_issues ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Create index for project_name filtering
CREATE INDEX IF NOT EXISTS idx_ph_issues_project_name ON public.ph_issues(project_name);

-- Populate project_name from known Jira space names
-- These are the Jira project keys and their full space names
UPDATE public.ph_issues SET project_name = CASE project_key
  WHEN 'BAU' THEN 'BAU Operations'
  WHEN 'COM' THEN 'Communications'
  WHEN 'DATA' THEN 'Data Platform'
  WHEN 'DET' THEN 'Digital Transformation'
  WHEN 'ESS' THEN 'Enterprise Shared Services'
  WHEN 'ICP' THEN 'ICP Platform'
  WHEN 'IN' THEN 'Innovation'
  WHEN 'INV' THEN 'Investment Platform'
  WHEN 'IP' THEN 'Industrial Platform'
  WHEN 'IRP' THEN 'IR Platform'
  WHEN 'ISA' THEN 'ISA Services'
  WHEN 'MDT' THEN 'MIM Digital Twin'
  WHEN 'MIMI' THEN 'MIM Integration'
  WHEN 'MP' THEN 'Mining Platform'
  WHEN 'MWR' THEN 'MIM Website Revamp'
  WHEN 'ONE' THEN 'One Platform'
  WHEN 'SAPI' THEN 'Senaei API'
  WHEN 'SIMP' THEN 'Sectorial Services'
  WHEN 'SS' THEN 'Shared Services'
  ELSE project_key
END
WHERE project_name IS NULL;
