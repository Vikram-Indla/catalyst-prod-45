
-- Add new columns to wh_issues for description, comments, changelog, type icon, and parent summary
ALTER TABLE public.wh_issues
  ADD COLUMN IF NOT EXISTS description_adf jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description_text text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS changelog jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS type_icon_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_summary text DEFAULT NULL;

-- Backfill type_icon_url and parent_summary from existing raw_json
UPDATE public.wh_issues
SET
  type_icon_url = raw_json->'fields'->'issuetype'->>'iconUrl',
  parent_summary = raw_json->'fields'->'parent'->'fields'->>'summary'
WHERE raw_json IS NOT NULL;
