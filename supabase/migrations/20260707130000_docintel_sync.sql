-- ============================================================================
-- DOCINTEL — Background Knowledge Sync Engine v1 (S5)
-- CAT-DOCINTEL-ARABIC-RAG-20260706-001
--
-- 1) ai_sync_runs — one summary row per docintel-sync run (per project touched
--    + one global row with project_id NULL). Service-role writes only;
--    authenticated members read their projects' rows (+ global rows).
-- 2) ai_extraction_issues.kind — allow 'fact_conflict' (cross-document fact
--    contradiction found by the sync engine's conflict scan).
-- 3) ai_document_jobs.stage — allow 'sync' (per-document repair/retry ledger
--    rows written by docintel-sync; details JSON carried in error_message —
--    the jobs table has no separate metadata column).
-- 4) pg_cron job 'docintel-sync-15min' POSTing to the docintel-sync edge
--    function every 15 minutes with the DOCINTEL_SYNC_SECRET bearer.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ai_sync_runs
-- ---------------------------------------------------------------------------

CREATE TABLE public.ai_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = the run's global summary row (whole-instance sweep).
  project_id uuid REFERENCES public.ph_projects(id) ON DELETE CASCADE,
  -- {docs_total, docs_ready, docs_failed, stuck_repaired, retried,
  --  facts_backfilled, conflicts_found}
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error')),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ai_sync_runs IS 'Summary ledger of docintel-sync background sweeps: one row per project touched per run, plus one global row (project_id NULL) per run.';
CREATE INDEX idx_ai_sync_runs_project_started ON public.ai_sync_runs (project_id, started_at DESC);
CREATE INDEX idx_ai_sync_runs_started ON public.ai_sync_runs (started_at DESC);

ALTER TABLE public.ai_sync_runs ENABLE ROW LEVEL SECURITY;

-- SELECT: project members read their projects' rows; every authenticated user
-- may read the global (project_id NULL) rows — they contain only counts.
-- No INSERT/UPDATE/DELETE policies: only RLS-bypassing service_role writes.
CREATE POLICY ai_sync_runs_select ON public.ai_sync_runs FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL
    OR project_id IN (SELECT project_id FROM public.ph_project_members WHERE user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 2) ai_extraction_issues.kind — allow 'fact_conflict'
--    (mirrors the ai_document_chunks_scope_check extension in
--     20260707100000_docintel_search_freshness.sql)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_extraction_issues DROP CONSTRAINT IF EXISTS ai_extraction_issues_kind_check;
ALTER TABLE public.ai_extraction_issues ADD CONSTRAINT ai_extraction_issues_kind_check
  CHECK (kind IN ('low_ocr_confidence','broken_table','unclear_image','missing_page','parse_error','fact_conflict','other'));

-- ---------------------------------------------------------------------------
-- 3) ai_document_jobs.stage — allow 'sync'
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_document_jobs DROP CONSTRAINT IF EXISTS ai_document_jobs_stage_check;
ALTER TABLE public.ai_document_jobs ADD CONSTRAINT ai_document_jobs_stage_check
  CHECK (stage IN ('ingest','extract','describe','translate','chunk','embed','structure','sync'));

-- ---------------------------------------------------------------------------
-- 4) pg_cron — docintel-sync every 15 minutes
--    (mirrors 20260707020100_docex_rag_cron.sql)
--
-- Requires: pg_cron extension + net (http) extension + DOCINTEL_SYNC_SECRET
--           edge-function secret set in Supabase dashboard (same mechanism
--           as KB_REINDEX_CRON_SECRET).
--
-- LOVABLE PASTE BLOCK — run this section in the SQL editor, not via
-- `supabase db push`. pg_cron and net are managed extensions; they are not
-- part of the migrations pipeline and cannot be applied via the CLI
-- migration runner. Replace the placeholders before running.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

SELECT cron.unschedule('docintel-sync-15min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'docintel-sync-15min'
);

-- Replace <PROJECT_REF> with the target project reference slug
-- (staging: cyijbdeuehohvhnsywig, prod: lmqwtldpfacrrlvdnmld) and
-- <DOCINTEL_SYNC_SECRET> with the value of that edge-function secret.
SELECT cron.schedule(
  'docintel-sync-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/docintel-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <DOCINTEL_SYNC_SECRET>"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
