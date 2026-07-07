# 01 — System Overview: Doc Intel / Knowledge Hub / RAG in Catalyst

> Forensic audit. Every claim below is sourced to a repository file. Where evidence conflicts between
> independent passes, both sides are shown — see `06_gaps.md` §"Evidence conflicts" rather than a single
> resolved answer. Nothing in this document was inferred from naming alone.

## Headline finding

**There is no single "Doc Intel" system in this repository.** The mission's search terms (Doc Intel,
Knowledge Hub, RAG, embeddings, OCR, chunking, citations, etc.) surface **at least seven structurally
separate systems** that share overlapping `kb_`/"knowledge" naming but do not call each other, do not
share a data pipeline, and in several cases are not even reachable from the live app. A fully-designed
RAG stack (pgvector, chunking, hybrid search, reranking, citations) exists in the schema and in code —
but its edge functions all live in `supabase/functions-parked/`, a directory Supabase does not deploy.

## The seven systems

| # | System | Status | Primary evidence |
|---|---|---|---|
| 1 | **Knowledge Hub** (Confluence clone: `kb_documents`/`kb_doc_spaces` authored pages) | **Orphaned dead code.** Routes unmounted; only reachable via a legacy-UUID redirect. | `src/routes/FullAppRoutes.tsx:979-981` redirects `/knowledge-hub*` → `/folio`; `src/pages/KnowledgeHubPage.tsx`/`KnowledgeHubDocumentPage.tsx`/`KnowledgeHubSpacePage.tsx` imported by nothing in the route tree |
| 2 | **Support-FAQ RAG chatbot** (`kb_embeddings`/`kb_sources`/`kb_training_questions`/`kb_cache`/`kb_query_log` + `kb-query`/`kb-train`/`kb-ingest`/`kb-sync`/`kb-eval`/`kb-cleanup`/`kb-feedback` functions) | **Backend fully parked/undeployed.** Frontend still calls it and will fail in production. | All 8 functions live in `supabase/functions-parked/`, not `supabase/functions/`; `src/services/knowledgeBase.ts:88-248` still invokes them by name |
| 3 | **Req Assist RAG pipeline** (`brd_documents` + `kb_embeddings` via `kb_hybrid_search()`) | **Depends on the same parked backend.** Its own sync function (`kb-sync`) is parked; `RAGAuditPage.tsx` audits it via raw SQL, not via the (non-existent) live function. | `src/pages/RAGAuditPage.tsx:91-227`; `src/components/reqAssist/RAJiraSidePanel.tsx:159` invokes parked `kb-sync` |
| 4 | **Knowledge Assist** (`KAFab` / `KnowledgeAssistPanel`, branded "AI") | **Live, but not RAG or search at all.** A hand-written NL-pattern router (`PersonalizedQueryProcessor.ts`) running plain `.select()` queries against `ph_issues`. No embeddings, no vector search, no LLM call in this path. | `src/components/knowledge-assist/KnowledgeAssistPanel.tsx:48-74` |
| 5 | **`caty-chat`** (chat-dock "Caty" assistant) | **Live LLM call, zero retrieval/grounding.** System-prompt-only Gemini call; no document context is fetched or injected. | `supabase/functions/caty-chat/index.ts:1-126` (no Supabase client is ever invoked despite being imported) |
| 6 | **`folio-ai-search` / `ai-search-issues`** | **Live, but not semantic search.** LLM translates a natural-language query into a structured filter object; the filter is applied client-side to an already-loaded list. | `supabase/functions/ai-search-issues/index.ts:1-11` docstring explicitly disclaims semantic search |
| 7 | **`docex-import`** | **Live, genuine AI feature — one-shot PDF→blocks conversion**, not RAG/search. Sends the PDF inline to Gemini's native multimodal endpoint, translates non-English content, returns structured blocks. | `supabase/functions/docex-import/index.ts:1-139` |
| 8 | **Folio** (formerly Docex, formerly Wiki — the *current* live document/wiki product, `/folio/*`) | **Live and actively developed**, reuses the `kb_documents`/`kb_doc_spaces` tables from system #1, plus a new Notion-style database layer (`kb_databases` etc., added 2026-07-06). **Not connected to any RAG/embedding pipeline** — `kb_embeddings.source_type` has no `'docex'`/`'wiki'` value and no writer function targets it from Folio content. | `src/routes/FullAppRoutes.tsx:847-858`; `src/hooks/useWiki.ts`; `supabase/migrations/20260706100000_docex_databases.sql` |

## What this means in one sentence

Catalyst has a **schema-complete, code-complete RAG system that isn't running**, and a **separate, currently-shipping
document product (Folio) that was never wired into it** — so today, no document uploaded to Folio, and no
FAQ ingested into the KB tables via the parked pipeline, is actually retrievable through semantic/vector search
in production.

## Timeline signal (important for interpreting this audit)

This domain is moving fast and self-contradicting within days:
- `features/CAT-DOCS-NOTION-20260704-001/02_CANONICAL_DISCOVERY.md` (2026-07-04) describes Knowledge Hub as **live**
  and explicitly warns not to build on "adjacent/dormant" wiki tables.
- Two days later, `FullAppRoutes.tsx` (as read in this audit, 2026-07-06 dated migrations) shows Knowledge Hub
  fully redirected away and the Wiki module renamed twice (Wiki → Docex → Folio) in the same window.
- `20260705170000_kb_versions_insert_policy.sql` and `20260706150000_kb_attachments_delete_policy.sql` are same-week
  hot-fixes to RLS gaps shipped days earlier.

Treat every "current state" claim in this audit as accurate to the commit examined, not as a stable target.

## Documents in this audit

1. `01_system_overview.md` — this file
2. `02_architecture.md` — full dependency diagrams per system
3. `03_data_flow.md` — one uploaded PDF traced through the live path and the parked/designed RAG path
4. `04_database.md` — table-by-table schema, RLS, triggers, storage, source-of-truth answers
5. `05_capability_matrix.md` — capability-by-capability existence table with evidence
6. `06_gaps.md` — every defect, risk, dead code path, and unresolved evidence conflict found
7. `07_recommendations.md` — decision points and verification steps (not a new architecture proposal)
