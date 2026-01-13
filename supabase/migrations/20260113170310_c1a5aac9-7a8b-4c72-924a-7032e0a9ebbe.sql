-- ================================================================
-- EVIDENCE SYSTEM - OCR, AI ANALYSIS, AND ANNOTATIONS
-- TC-261 to TC-330: OCR, defect detection, annotations storage
-- ================================================================

-- Add OCR and AI analysis columns
ALTER TABLE public.test_evidence
ADD COLUMN IF NOT EXISTS ocr_text text,
ADD COLUMN IF NOT EXISTS ocr_confidence numeric(5,4),
ADD COLUMN IF NOT EXISTS ocr_processed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS annotations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS annotations_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS annotated_file_path text;

-- Create full-text search index on OCR text (TC-265)
CREATE INDEX IF NOT EXISTS idx_test_evidence_ocr_text_fts 
ON public.test_evidence 
USING GIN (to_tsvector('english', COALESCE(ocr_text, '')));

-- Create index for AI analysis status
CREATE INDEX IF NOT EXISTS idx_test_evidence_ocr_processed 
ON public.test_evidence(ocr_processed_at) 
WHERE ocr_processed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_evidence_ai_analyzed 
ON public.test_evidence(ai_analyzed_at) 
WHERE ai_analyzed_at IS NOT NULL;

-- Create annotations index for JSON queries
CREATE INDEX IF NOT EXISTS idx_test_evidence_annotations 
ON public.test_evidence 
USING GIN (annotations) 
WHERE annotations != '[]'::jsonb;

-- Function to search evidence by OCR text (TC-265)
CREATE OR REPLACE FUNCTION public.search_evidence_by_ocr(
  search_query text,
  execution_step_id uuid DEFAULT NULL
)
RETURNS SETOF public.test_evidence
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.test_evidence
  WHERE 
    is_deleted = false
    AND ocr_text IS NOT NULL
    AND to_tsvector('english', ocr_text) @@ plainto_tsquery('english', search_query)
    AND (execution_step_id IS NULL OR test_evidence.execution_step_id = search_evidence_by_ocr.execution_step_id)
  ORDER BY created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_evidence_by_ocr TO authenticated;