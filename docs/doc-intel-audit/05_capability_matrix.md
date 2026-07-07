# 05 — Capability Matrix

Legend: **Live** = deployed and reachable in production · **Parked** = code exists, not deployed ·
**Schema-only** = database objects exist, nothing populates/calls them in production · **Dead UI** =
frontend renders it but the backend doesn't work · **Not found** = no evidence anywhere in the repo ·
**Unverified** = code exists but was not read in this audit; scope/behavior not confirmed.

| Capability | Exists? | Evidence | File | Limitations |
|---|---|---|---|---|
| **PDF ingestion** | Live | Gemini native multimodal read + translation | `supabase/functions/docex-import/index.ts:1-139` | Whole-document single request; no chunking, no storage of the source PDF, no retrieval afterward |
| **Word (DOCX) ingestion** | Live | `mammoth.convertToHtml()` client-side | `src/components/wiki-hub/editor/importDoc.ts:80-93` | No AI round-trip; pure HTML conversion into the BlockNote editor |
| **Excel/CSV ingestion** | Live | `xlsx` + `papaparse` | `src/modules/strata/pages/StrataUploadWizardPage.tsx` | Business-data import for Strata module — unrelated to document intelligence/RAG |
| **Images (as a document source)** | Not found | — | — | No image-upload-for-analysis path found outside `docex-import`'s incidental PDF-page rendering |
| **OCR** | Dead UI | `OcrPanel.tsx` renders an "Extract Text (OCR)" button reading `ocrText`/`ocrConfidence` props | `src/components/evidence/ocr/OcrPanel.tsx` | Component is never mounted by any real page (only barrel-export/generated-registry references); no backend function of any kind exists to populate it |
| **Vision (multimodal document reading)** | Live | Gemini reads the PDF natively (de facto vision) | `supabase/functions/docex-import/index.ts:27-63` | Only inside the one-shot import flow; not a general vision/analysis capability |
| **Arabic language support** | Schema-only | `fts_ar` generated tsvector column (`simple` stemmer), `kb_hybrid_search(..., use_simple_fts)` param | `bootstrap_full_schema.sql:31748`; `20260307235209...sql:1-80` | Only exists inside the parked RAG pipeline; no evidence of Arabic handling in the live Folio editor |
| **RTL support** | Not found (in reviewed evidence) | — | — | Not examined beyond the Arabic-FTS finding above; no explicit RTL editor logic was located |
| **Complex tables (extraction/preservation)** | Partial / degraded | `docex-import` flattens table rows into bullets rather than preserving table structure | `supabase/functions/docex-import` (per UI-layer discovery pass) | Naive flattening, not structured table extraction |
| **Charts** | Not found | — | — | No chart-extraction or chart-understanding logic identified anywhere |
| **Citations / source attribution** | Parked | `[SOURCE-N]` tagging mapped to `source_url`/`source_type`/score | `supabase/functions-parked/kb-query/index.ts:1347-1363` | Not reachable — function is undeployed; no live feature produces citations |
| **Source links** | Parked | `KBReference` type (`similarity`, `metadata`) | `src/services/knowledgeBase.ts:31-36` | Same — depends on the undeployed `kb-query` |
| **Confidence scoring** | Parked/Schema-only | `kb_query_log.confidence_score`, hallucination-risk check (`confidence < 0.25`) | `20260228222951...sql:24-33`; `src/pages/RAGAuditPage.tsx` (health-check, not live scoring) | Column and audit-check exist; nothing live writes a real confidence value in production |
| **Audit trail (document actions)** | Not functioning | `kb_audit_log` table has RLS but zero application references (dead schema) *or* was dropped entirely — see `06_gaps.md` conflict | — | `AuditTrailPage.tsx` is unrelated (governance/ghost-ticket closures, not documents) |
| **Versioning** | **Live** | `kb_document_versions` + `useSaveVersion()` throttled client-side snapshots (10-min cadence, manual + pre-restore points) | `src/hooks/useWiki.ts:797-830` | No retention/pruning policy — unbounded row growth; no UPDATE/DELETE RLS |
| **Incremental / background sync** | Parked | `kb-sync` (`discoverDataSources`/`syncTable`/`syncAllTables`/`getSyncStatus`) | `supabase/functions-parked/kb-sync/index.ts`; `src/services/knowledgeBase.ts:165-206` | Undeployed; no live incremental sync of any document source into the RAG pipeline |
| **Hybrid retrieval (vector + keyword)** | Schema/RPC exists, no live caller | `kb_hybrid_search()` — RRF fusion of cosine similarity + `ts_rank_cd` | `bootstrap_full_schema.sql:13109` | Only ever called by the parked `kb-query` function |
| **Keyword / full-text search** | **Live** (two independent implementations) | (1) Folio: `search_vector` tsvector + ILIKE, `useDocexSearch` (2) Work items: plain `.ilike()` in `SearchPage.tsx` | `src/hooks/useWiki.ts:634`; `src/pages/SearchPage.tsx:159-261` | Neither is embedding-based; both are real and reachable today |
| **Vector / semantic search** | Schema/RPC exists, no live caller | `kb_match_embeddings()`, ivfflat index | `bootstrap_full_schema.sql:13306,61741` | Not reachable in production — see `03_data_flow.md` Path B |
| **Metadata-filtered search** | Schema/RPC exists, no live caller | `kb_hybrid_search(..., filter_source, filter_tags)` | `bootstrap_full_schema.sql:13109` | Same — parked only |
| **Graph / Knowledge Graph search** | Not found | — | — | No graph data structure or graph-traversal query found anywhere |
| **Reranking** | Parked | LLM-judge rerank (`gpt-4o-mini`, top 30 → top 6, floor 0.3) | `supabase/functions-parked/kb-query/index.ts:1322-1339` | Not a dedicated cross-encoder; prompt-based; undeployed |
| **Structured output (JSON-schema-constrained LLM responses)** | **Live** | Response-schema-constrained Gemini/Anthropic calls | `supabase/functions/ai-search-issues/index.ts`, `ai-tm-assist/index.ts`, `docex-import/index.ts` | Real and working, but for filter-generation/test-assist/import — not document Q&A |
| **Artifact generation** (test artefacts, workflows) | Unverified | Functions present in directory listing (`ai-generate-test-artefacts`, `ai-generate-workflow`) | `supabase/functions/ai-generate-test-artefacts/`, `ai-generate-workflow/` | Not opened/read in this audit; no evidence found (positive or negative) of document/RAG grounding |
| **Business process generation** | Unverified | `workflow-ai` function present in directory listing | `supabase/functions/workflow-ai/` | Not opened/read in this audit |
| **Epic generation** | Unverified | `ai-generate-epics` function present in directory listing | `supabase/functions/ai-generate-epics/` | Not opened/read in this audit; no evidence found of document-grounded input in the functions this audit did inspect |
| **Story generation** | Unverified | `ai-generate-stories` function present in directory listing | `supabase/functions/ai-generate-stories/` | Same caveat as above |
| **AI chat over documents** | Not found | `caty-chat` is system-prompt-only with zero retrieval; Knowledge Assist is a structured-DB-query router, not document chat | `supabase/functions/caty-chat/index.ts:1-126`; `src/components/knowledge-assist/KnowledgeAssistPanel.tsx:48-74` | No feature in this repo lets a user "ask a question and get an answer grounded in an uploaded document" |
| **Permission enforcement on documents** | Live but narrow, with a known non-functioning sub-feature | Owner-based RLS on `kb_documents`; `kb_document_restrictions` table/UI exists but is not consulted by any policy | See `04_database.md` RLS table | No workspace-membership model; `kb_doc_spaces` itself has no DELETE policy and `true`-gated read/write |
| **Deletion (cascade correctness)** | Partially live | FK `ON DELETE CASCADE` for DB rows | `bootstrap_full_schema.sql:74942-75034` | Storage objects (attachments) are never cleaned up on a whole-document delete, only on single-attachment delete |
| **Re-indexing on content change** | Not found | No trigger/cron targets `kb_embeddings` from `kb_documents` changes | — | Moot today since nothing indexes Folio content at all; would need to be built if RAG is revived |
