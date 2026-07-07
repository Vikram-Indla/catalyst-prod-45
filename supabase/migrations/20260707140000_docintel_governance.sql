-- ============================================================================
-- DOCINTEL — S8 security/governance delta: export audit + artifact approval
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001
--
-- 1) docintel_log_export(p_document_id, p_format)
--    SECURITY DEFINER RPC that gates document export on project membership and
--    writes an immutable 'export' row into ai_docintel_audit_events. The
--    client-side export (exportDocument.ts) is otherwise invisible to the
--    server — this RPC is the audit chokepoint, and the UI blocks the export
--    when it raises (non-member).
--
-- 2) Artifact approval workflow: extend the ai_generated_artifacts status
--    CHECK (20260707030000: draft|verified|rejected|promoted) with 'approved',
--    and add rejection_reason (no existing suitable column on this table —
--    status_detail/error_message live on ai_documents, not here).
--    Audit trail for approve/reject comes free via the existing
--    trg_ai_generated_artifacts_audit trigger (INSERT OR UPDATE OR DELETE,
--    20260707031000).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Export audit RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.docintel_log_export(
  p_document_id uuid,
  p_format text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF p_format IS NULL OR btrim(p_format) = '' THEN
    RAISE EXCEPTION 'export format is required';
  END IF;

  SELECT d.project_id INTO v_project_id
  FROM public.ai_documents d
  WHERE d.id = p_document_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'document % not found', p_document_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ph_project_members m
    WHERE m.project_id = v_project_id
      AND m.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not a member of the document''s project';
  END IF;

  INSERT INTO public.ai_docintel_audit_events
    (entity_table, entity_id, action, actor_id, after)
  VALUES
    ('ai_documents', p_document_id, 'export', auth.uid(),
     jsonb_build_object('format', p_format));
END;
$$;

COMMENT ON FUNCTION public.docintel_log_export(uuid, text) IS
  'Audit chokepoint for client-side document export (PDF/HTML). Verifies project membership, then appends an ''export'' row to ai_docintel_audit_events. Raises for non-members — the UI blocks the export when this rejects.';

REVOKE ALL ON FUNCTION public.docintel_log_export(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.docintel_log_export(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2a) Status CHECK: add 'approved' (draft/verified -> approved transition).
--     Keeps every pre-existing value. Same drop/re-add pattern as
--     20260707120000_docintel_artifact_types.sql.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_generated_artifacts
  DROP CONSTRAINT IF EXISTS ai_generated_artifacts_status_check;

ALTER TABLE public.ai_generated_artifacts
  ADD CONSTRAINT ai_generated_artifacts_status_check
  CHECK (status IN ('draft', 'verified', 'approved', 'rejected', 'promoted'));

-- ---------------------------------------------------------------------------
-- 2b) Rejection reason. ai_generated_artifacts has no status_detail /
--     error_message column to reuse, so add a dedicated nullable column.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_generated_artifacts
  ADD COLUMN IF NOT EXISTS rejection_reason text;

COMMENT ON COLUMN public.ai_generated_artifacts.rejection_reason IS
  'Reviewer-entered reason captured when the artifact was rejected (status=''rejected''). Null otherwise.';
