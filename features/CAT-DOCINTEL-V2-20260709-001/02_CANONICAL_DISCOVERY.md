# Canonical Discovery — CAT-DOCINTEL-V2-20260709-001

This feature reuses discovery already performed in the same session, rather than re-running
duplicate agents. Primary sources:

1. `docs/audits/doc-intel-current-state-discovery.md` (this session, 2026-07-09) — 4 parallel
   read-only agents: frontend/service code inventory, Supabase live schema/data probe (staging
   `cyij`), docs/tests/seeds inventory, live browser probe of `localhost:8080`.
2. `docs/doc-intel-audit/` (pre-existing forensic audit, predates 2026-07-07 build).
3. `features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/` (the build that shipped current DocIntel
   v1) — especially `02_CANONICAL_DISCOVERY.md`, `06_VALIDATION_EVIDENCE.md`, `07_HANDOVER.md`.

## Canonical substrate (do not duplicate)

- Frontend module: `src/modules/docintel/` (pages, components, hooks, `domain/index.ts` API layer).
- Schema: `ai_*` tables on staging `cyij` (16 tables, pgvector 0.8.0, 378 embeddings @1536 dims
  live at audit time).
- Edge functions: `docintel-ingest`, `docintel-analyze`, `docintel-ask`, `docintel-generate`,
  `docintel-sync` (all ACTIVE, versions 5-7), plus `docex-import`.
- RPCs: `docintel_hybrid_search` (RRF vector+FTS), `docintel_match_facts` (confirmed dead — 0
  requirement-fact embeddings), `docintel_log_export`, `docintel_audit`, plumbing fns.
- Nav: `src/components/layout/WikiSidebar.tsx:106-127` — "Document Intelligence" under Folio.
- Legacy (deprecated, do not extend): `kb_*` tables (kb_embeddings=0, kb_query_log=0), `kb-*`
  edge functions (flagged "0 refs" in prior handover), `/kb-admin-setup`, `/kb-data-audit` (no
  nav link, direct-URL-only).

## Gap-to-slice mapping (from audit P0-P2 list)

| Gap | Priority | Likely touch points |
|---|---|---|
| `docintel_match_facts` dead (no fact embeddings) | P0 | `_shared/embed_stage.ts`, `docintel-analyze`, `ai_requirement_facts` embedding step |
| Citation confidence mis-scale (~0.01 vs 1.0) | P0 | `src/modules/docintel/components/confidence.ts`, `ArtifactView.tsx`, `AskPanel.tsx` |
| `ai_agent_prompts` placeholder / hardcoded prompts | P0 | `docintel-analyze`, `docintel-generate` inline prompt constants, new/wired `ai_agent_prompts` table |
| No theme/collection browsing | P0 | new UI concept — likely new page/component + `ai_theme_cache` table (4 rows exist, unclear current role — needs tracing before building) |
| `chunk.section_path` NULL (claimed fixed, unverified) | P1 | live DB re-query, `embed_stage.ts` |
| No manual re-index control | P1 | `DocintelHealthPage.tsx` or admin surface + new edge-fn-trigger wiring |
| Jira/git ingestion not proven in same pipeline | P1 | `docex-import`, `jira-ingest` — trace whether either can feed `ai_documents`/`ai_document_chunks`, or needs a new adapter |
| Promote-to-work-item unproven end-to-end | P1 | `PromoteArtifactModal.tsx` — needs a real click-through with rollback plan (test/staging data only) |
| No alerting for sync/ingestion failures | P2 | `docintel-sync` edge fn, `ai_sync_runs` table |
| No automated rollback | P2 | deploy tooling, out of app-code scope — may be process-level not code-level |
| `kb_*` cleanup | P2 | delete `kb-ingest`, `kb-generate-answers` edge fns (0 refs); assess `/kb-admin-setup`, `/kb-data-audit`, `src/services/knowledgeBase.ts`, `src/components/reqAssist/RAJiraSidePanel.tsx` dependency before touching |

## Open discovery questions (resolve before/during Slice 1)

1. Does `ai_theme_cache` (4 rows, live) already back some dormant theme concept, or is it
   unrelated cache infrastructure? Needs a direct read of its schema + any code referencing it
   before deciding to build new theme UI vs. wire up existing table.
2. Is `RAJiraSidePanel.tsx` (the only live consumer of `kb_*`) still in active use, or dead code
   itself? If dead, `kb_*` cleanup scope grows to include it.
3. What's the actual mechanism to re-embed `ai_requirement_facts` — is it a missing call in
   `docintel-analyze`, or does the extraction step never populate that table with content worth
   embedding in the first place? Needs a source read of `docintel-analyze/index.ts` before Slice 1
   plan-locks a fix.

These three questions are Slice 1's first task — a short, targeted discovery pass, not
implementation — before the Plan Lock's Slice 1 file list is finalized.
