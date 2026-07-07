-- ============================================================================
-- DOCINTEL — RLS + audit ledger
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001
-- Project scoping: project_id IN (SELECT project_id FROM ph_project_members
--   WHERE user_id = auth.uid()) — DocIntel binds to the ph_* id-space; mirrors
--   the current catalyst_issues policies / is_member_of_catalyst_issue
--   (supabase/migrations/20260425185223_*). service_role bypasses RLS implicitly.
-- Child tables (pages/blocks/tables/images/chunks/embeddings/issues/jobs/runs/
--   citations/versions) inherit scope through their parent ai_documents row.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Audit ledger (INSERT-only; rows arrive via SECURITY DEFINER trigger only)
-- ---------------------------------------------------------------------------

CREATE TABLE public.ai_docintel_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL,
  entity_id uuid,
  action text NOT NULL,   -- INSERT | UPDATE | DELETE
  actor_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_docintel_audit_events IS 'Immutable DocIntel audit ledger. INSERT-only; no UPDATE/DELETE policies exist.';
CREATE INDEX idx_ai_docintel_audit_entity ON public.ai_docintel_audit_events (entity_table, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.docintel_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ai_docintel_audit_events (entity_table, entity_id, action, actor_id, before, after)
  VALUES (
    TG_TABLE_NAME,
    COALESCE((CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END), NULL),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_ai_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_documents
  FOR EACH ROW EXECUTE FUNCTION public.docintel_audit();
CREATE TRIGGER trg_ai_requirement_facts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_requirement_facts
  FOR EACH ROW EXECUTE FUNCTION public.docintel_audit();
CREATE TRIGGER trg_ai_generated_artifacts_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_generated_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.docintel_audit();
CREATE TRIGGER trg_ai_artifact_citations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_artifact_citations
  FOR EACH ROW EXECUTE FUNCTION public.docintel_audit();

-- ---------------------------------------------------------------------------
-- Enable RLS on every DocIntel table
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_documents','ai_document_versions','ai_document_pages','ai_document_blocks',
    'ai_document_tables','ai_document_images','ai_document_chunks','ai_document_embeddings',
    'ai_requirement_facts','ai_agent_prompts','ai_agent_runs','ai_generated_artifacts',
    'ai_artifact_citations','ai_extraction_issues','ai_document_jobs','ai_docintel_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Membership predicate helper: is the current user a member of p_project?
-- Style mirrors is_member_of_catalyst_issue (20260425185223_*): join through
-- ph_projects → ph_project_members.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.docintel_is_project_member(p_project uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ph_projects p
    JOIN public.ph_project_members m ON m.project_id = p.id
    WHERE p.id = p_project AND m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Tables carrying their own project_id → direct membership scope
--   ai_documents, ai_document_embeddings, ai_agent_runs (nullable),
--   ai_generated_artifacts, ai_requirement_facts (nullable)
-- ---------------------------------------------------------------------------

-- ai_documents
CREATE POLICY ai_documents_select ON public.ai_documents FOR SELECT
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_documents_insert ON public.ai_documents FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_documents_update ON public.ai_documents FOR UPDATE
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));

-- ai_document_embeddings (project_id NOT NULL)
CREATE POLICY ai_document_embeddings_select ON public.ai_document_embeddings FOR SELECT
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_document_embeddings_insert ON public.ai_document_embeddings FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_document_embeddings_update ON public.ai_document_embeddings FOR UPDATE
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));

-- ai_generated_artifacts (project_id NOT NULL)
CREATE POLICY ai_generated_artifacts_select ON public.ai_generated_artifacts FOR SELECT
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_generated_artifacts_insert ON public.ai_generated_artifacts FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_generated_artifacts_update ON public.ai_generated_artifacts FOR UPDATE
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));

-- ai_agent_runs (project_id nullable — a null-project run is service-only, so
-- client access requires an explicit membership match on a non-null project_id)
CREATE POLICY ai_agent_runs_select ON public.ai_agent_runs FOR SELECT
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_agent_runs_insert ON public.ai_agent_runs FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_agent_runs_update ON public.ai_agent_runs FOR UPDATE
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));

-- ai_requirement_facts (project_id nullable — same rationale as agent_runs)
CREATE POLICY ai_requirement_facts_select ON public.ai_requirement_facts FOR SELECT
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_requirement_facts_insert ON public.ai_requirement_facts FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));
CREATE POLICY ai_requirement_facts_update ON public.ai_requirement_facts FOR UPDATE
  USING (project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Child tables scoped through parent ai_documents.project_id
--   ai_document_versions, ai_document_pages, ai_document_blocks,
--   ai_document_tables, ai_document_images, ai_document_chunks,
--   ai_extraction_issues, ai_document_jobs
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_document_versions','ai_document_pages','ai_document_blocks',
    'ai_document_tables','ai_document_images','ai_document_chunks',
    'ai_extraction_issues','ai_document_jobs'
  ] LOOP
    EXECUTE format($p$
      CREATE POLICY %1$s_select ON public.%1$I FOR SELECT
        USING (EXISTS (SELECT 1 FROM public.ai_documents d
                       WHERE d.id = %1$I.document_id
                         AND d.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())))
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY %1$s_insert ON public.%1$I FOR INSERT
        WITH CHECK (EXISTS (SELECT 1 FROM public.ai_documents d
                            WHERE d.id = %1$I.document_id
                              AND d.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())))
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY %1$s_update ON public.%1$I FOR UPDATE
        USING (EXISTS (SELECT 1 FROM public.ai_documents d
                       WHERE d.id = %1$I.document_id
                         AND d.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())))
    $p$, t);
  END LOOP;
END $$;

-- ai_artifact_citations scoped through parent ai_generated_artifacts.project_id
CREATE POLICY ai_artifact_citations_select ON public.ai_artifact_citations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ai_generated_artifacts a
                 WHERE a.id = ai_artifact_citations.artifact_id
                   AND a.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())));
CREATE POLICY ai_artifact_citations_insert ON public.ai_artifact_citations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_generated_artifacts a
                      WHERE a.id = ai_artifact_citations.artifact_id
                        AND a.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())));
CREATE POLICY ai_artifact_citations_update ON public.ai_artifact_citations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.ai_generated_artifacts a
                 WHERE a.id = ai_artifact_citations.artifact_id
                   AND a.project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())));

-- ---------------------------------------------------------------------------
-- ai_agent_prompts — readable by any authenticated user, writable by
-- service_role only (no INSERT/UPDATE/DELETE policy = only RLS-bypassing
-- service_role can write).
-- ---------------------------------------------------------------------------
CREATE POLICY ai_agent_prompts_select ON public.ai_agent_prompts FOR SELECT
  TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- ai_docintel_audit_events — service-role only (no client policies at all).
-- before/after jsonb carries full row content across projects, so an open
-- authenticated SELECT would leak cross-project data. Rows arrive solely via
-- the SECURITY DEFINER trigger; ledger is immutable (no UPDATE/DELETE).
-- ---------------------------------------------------------------------------
