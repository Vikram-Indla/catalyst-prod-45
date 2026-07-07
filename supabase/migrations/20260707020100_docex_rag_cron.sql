-- Folio/Docex RAG reindex — pg_cron (mirrors 20260511200000_lifecycle_cron.sql)
--
-- Runs kb-ingest's ingest_folio_batch action every 15 minutes to (re)embed
-- published Folio pages flagged by kb_documents_flag_reindex_trigger
-- (20260707020000_docex_rag_wiring.sql). Batched + dirty-flagged rather than
-- per-save, since Folio autosaves every ~1.5s (CAT-DOCS-NOTION-20260704-001)
-- — embedding on every keystroke would be both slow and needlessly expensive.
--
-- Requires: pg_cron extension + net (http) extension + KB_REINDEX_CRON_SECRET
--           edge-function secret set in Supabase dashboard (same mechanism
--           as LIFECYCLE_CRON_SECRET) + OPENAI_API_KEY already required by
--           kb-ingest for embedding generation.
--
-- LOVABLE PASTE BLOCK — run in SQL editor, not via `supabase db push`.
-- pg_cron and net are managed extensions; they are not part of the
-- migrations pipeline and cannot be applied via the CLI migration runner.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

SELECT cron.unschedule('docex-rag-reindex')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'docex-rag-reindex'
);

-- Replace <PROJECT_REF> with the target project reference slug
-- (staging: cyijbdeuehohvhnsywig, prod: lmqwtldpfacrrlvdnmld) and
-- <KB_REINDEX_CRON_SECRET> with the value of that edge-function secret.
SELECT cron.schedule(
  'docex-rag-reindex',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/kb-ingest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <KB_REINDEX_CRON_SECRET>"}'::jsonb,
    body    := '{"action": "ingest_folio_batch", "batch_size": 50}'::jsonb
  );
  $$
);
