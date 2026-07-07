-- ============================================================================
-- DOCINTEL — atomic stage helpers for the parallel fan-out pipeline
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001
-- Two correctness fixes proven necessary by the parallel-worker probe:
--   1. docintel_stamp_latency: atomic jsonb merge (JS read-modify-write loses
--      updates when N page workers stamp latency_ms concurrently).
--   2. docintel_advance_status: compare-and-set so exactly ONE worker triggers
--      the next stage when the last page of a document completes (prevents
--      double fan-out / double LLM cost under the ≤60s architecture).
-- Both SECURITY DEFINER (called by service-role edge workers) + pinned search_path.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.docintel_stamp_latency(
  p_document_id uuid,
  p_key text,
  p_ms int
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_documents
  SET latency_ms = coalesce(latency_ms, '{}'::jsonb) || jsonb_build_object(p_key, p_ms)
  WHERE id = p_document_id;
$$;

-- Compare-and-set the document status. Returns true only for the caller that
-- actually performed the transition (from_status → to_status); all racing
-- callers that find a different current status get false and must NOT fan out.
CREATE OR REPLACE FUNCTION public.docintel_advance_status(
  p_document_id uuid,
  p_from_status text,
  p_to_status text,
  p_detail text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hit int;
BEGIN
  UPDATE public.ai_documents
  SET status = p_to_status, status_detail = p_detail
  WHERE id = p_document_id AND status = p_from_status;
  GET DIAGNOSTICS hit = ROW_COUNT;
  RETURN hit = 1;
END;
$$;
