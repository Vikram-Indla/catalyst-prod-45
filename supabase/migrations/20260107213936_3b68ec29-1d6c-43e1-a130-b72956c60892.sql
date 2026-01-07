-- ============================================================
-- JOB-151: Fix AI Assist Document Page Count Statistics
-- ============================================================
-- Problem: UI shows OCR tile count (59) instead of actual PDF pages (20)
-- Solution: Separate authoritative PDF stats from OCR processing stats
-- ============================================================

-- A) AUTHORITATIVE PDF STATS (read from PDF container, not OCR)
ALTER TABLE public.ai_assist_documents
ADD COLUMN IF NOT EXISTS pdf_page_count integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pdf_bytes bigint DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pdf_media_type text DEFAULT 'application/pdf',
ADD COLUMN IF NOT EXISTS pdf_info_json jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pdf_parsed_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pdf_parse_error text DEFAULT NULL;

-- B) OCR PROCESSING STATS (from OCR pipeline, may differ due to tiling)
ALTER TABLE public.ai_assist_documents
ADD COLUMN IF NOT EXISTS ocr_images_processed integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ocr_pages_attempted integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ocr_confidence_min numeric(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ocr_engine text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ocr_tiling_mode text DEFAULT 'none',
ADD COLUMN IF NOT EXISTS ocr_job_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ocr_completed_at timestamptz DEFAULT NULL;

-- C) CANONICAL & SECTIONING STATUS
ALTER TABLE public.ai_assist_documents
ADD COLUMN IF NOT EXISTS sectioning_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS canonical_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS pipeline_error_json jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recomputed_at timestamptz DEFAULT NULL;

-- D) COMMENTS for clarity
COMMENT ON COLUMN public.ai_assist_documents.pdf_page_count IS 'Authoritative page count from PDF container (not OCR). UI must display this as "Pages".';
COMMENT ON COLUMN public.ai_assist_documents.pdf_bytes IS 'Authoritative file size from PDF binary.';
COMMENT ON COLUMN public.ai_assist_documents.ocr_images_processed IS 'Number of images/tiles processed by OCR. May be > pdf_page_count if tiling is used.';
COMMENT ON COLUMN public.ai_assist_documents.ocr_pages_attempted IS 'Number of PDF pages sent to OCR. Should equal pdf_page_count unless failures.';
COMMENT ON COLUMN public.ai_assist_documents.ocr_tiling_mode IS 'Tiling mode used: none, 2x, 3x, adaptive. Explains discrepancy between pdf_page_count and ocr_images_processed.';
COMMENT ON COLUMN public.ai_assist_documents.canonical_status IS 'Status of canonical text reconstruction: pending, running, complete, failed.';
COMMENT ON COLUMN public.ai_assist_documents.sectioning_status IS 'Status of section detection: pending, running, complete, failed.';

-- E) Validation constraints using triggers (not CHECK for time-based safety)
CREATE OR REPLACE FUNCTION public.validate_ai_assist_document_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- pdf_page_count must be >= 1 if set
  IF NEW.pdf_page_count IS NOT NULL AND NEW.pdf_page_count < 1 THEN
    RAISE EXCEPTION 'pdf_page_count must be >= 1 when set, got %', NEW.pdf_page_count;
  END IF;
  
  -- ocr_images_processed must be >= 0 if set
  IF NEW.ocr_images_processed IS NOT NULL AND NEW.ocr_images_processed < 0 THEN
    RAISE EXCEPTION 'ocr_images_processed must be >= 0, got %', NEW.ocr_images_processed;
  END IF;
  
  -- sections_detected_count must be >= 0 if set
  IF NEW.sections_detected_count IS NOT NULL AND NEW.sections_detected_count < 0 THEN
    RAISE EXCEPTION 'sections_detected_count must be >= 0, got %', NEW.sections_detected_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_ai_assist_document_stats ON public.ai_assist_documents;
CREATE TRIGGER trg_validate_ai_assist_document_stats
  BEFORE INSERT OR UPDATE ON public.ai_assist_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ai_assist_document_stats();

-- F) Backfill existing records: copy pages_total to pdf_page_count where reasonable
-- Only copy if pages_total seems valid (e.g., <= file_size / 10000 bytes per page as sanity check)
UPDATE public.ai_assist_documents
SET 
  pdf_page_count = CASE 
    WHEN pages_total IS NOT NULL 
      AND pages_total >= 1 
      AND pages_total <= GREATEST(1, file_size / 10000)
    THEN pages_total 
    ELSE NULL 
  END,
  canonical_status = CASE 
    WHEN canonical_text_hash IS NOT NULL THEN 'complete' 
    ELSE 'pending' 
  END,
  sectioning_status = CASE 
    WHEN sections_detected_count IS NOT NULL AND sections_detected_count > 0 THEN 'complete'
    WHEN extraction_status IN ('completed', 'done') THEN 'complete'
    ELSE 'pending' 
  END
WHERE pdf_page_count IS NULL;