-- Update artifact_type check constraint to include all types used by the application
ALTER TABLE public.ai_assist_artifacts DROP CONSTRAINT IF EXISTS ai_assist_artifacts_artifact_type_check;

ALTER TABLE public.ai_assist_artifacts ADD CONSTRAINT ai_assist_artifacts_artifact_type_check 
CHECK (artifact_type = ANY (ARRAY[
  'epic'::text, 
  'epics'::text,
  'feature'::text, 
  'story'::text, 
  'acceptance_criteria'::text, 
  'summary'::text, 
  'summary_pdf'::text,
  'compliance_report'::text, 
  'quality_report'::text,
  'evidence'::text,
  'glossary'::text,
  'memo'::text,
  'functional_requirements'::text,
  'justification'::text,
  'open_questions'::text,
  'brd'::text
]));