-- CAT-DOCS-NOTION-20260704-001 — unbreak content autosave on kb_documents.
--
-- kb_document_versions has RLS enabled with ONLY a SELECT policy, so the
-- legacy AFTER UPDATE trigger (create_kb_document_version_trigger) fails
-- 42501 on its insert and rolls back EVERY content update — Docex/Wiki
-- autosave has never persisted on staging (probed live 2026-07-05, PATCH
-- content → "new row violates row-level security policy for table
-- kb_document_versions").
--
-- Fix:
-- 1. Allow authenticated version inserts (matches the current loose kb_*
--    posture; the D5 membership batch tightens later). Needed both for the
--    app's throttled snapshots and any trigger path.
-- 2. Drop the per-update trigger: it wrote a version row on EVERY 1.5s
--    autosave (version explosion). Docex writes versions client-side on a
--    10-minute throttle + manual save points + pre-restore snapshots.

create policy "Users can insert kb document versions"
  on public.kb_document_versions for insert to authenticated
  with check (auth.uid() is not null);

drop trigger if exists create_kb_document_version_trigger on public.kb_documents;
