-- Add extraction metadata columns to ai_assist_documents
ALTER TABLE public.ai_assist_documents 
  ADD COLUMN IF NOT EXISTS primary_language text DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS bilingual_confidence text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS pages_total integer,
  ADD COLUMN IF NOT EXISTS ocr_avg_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS ocr_quality_band text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS sections_detected_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canonical_text_hash text,
  ADD COLUMN IF NOT EXISTS extraction_warnings jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS document_version integer DEFAULT 1;

-- Add quality_mode to ai_assist_drafts for tracking WARN state
ALTER TABLE public.ai_assist_drafts
  ADD COLUMN IF NOT EXISTS quality_mode text DEFAULT 'NORMAL';

-- Add gaps column to ai_assist_drafts for storing quality gap records  
ALTER TABLE public.ai_assist_drafts
  ADD COLUMN IF NOT EXISTS quality_gaps jsonb DEFAULT '[]'::jsonb;

-- Add new audit event types for capture step
COMMENT ON TABLE public.ai_assist_audit_events IS 'Stores immutable audit trail for AI assist workflow including: document_uploaded, extraction_started, extraction_completed, extraction_reviewed, quality_warn_acknowledged, continue_blocked, document_replaced';

-- Create index for faster document version lookups
CREATE INDEX IF NOT EXISTS idx_ai_assist_documents_draft_version ON public.ai_assist_documents(draft_id, document_version);