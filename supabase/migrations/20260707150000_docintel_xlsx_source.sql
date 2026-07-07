-- ai_document_blocks.extraction_source: allow 'xlsx' — S11 spreadsheet
-- ingestion stamps native SheetJS extraction honestly instead of borrowing
-- the 'docx' value (interim compromise while this DDL was deferred).
ALTER TABLE public.ai_document_blocks DROP CONSTRAINT IF EXISTS ai_document_blocks_extraction_source_check;
ALTER TABLE public.ai_document_blocks ADD CONSTRAINT ai_document_blocks_extraction_source_check
  CHECK (extraction_source IN ('native_pdf','docx','xlsx','llm_ocr','llm_semantic'));
