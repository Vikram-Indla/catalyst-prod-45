# 02 — Architecture Audit (Doc Intel, current state)

> All facts verified against staging `cyij` (live SQL via MCP) and the `main` codebase
> (`20260707030000_docintel_schema.sql`, `src/modules/docintel/*`, `supabase/functions/docintel-*`).

## Runtime flow (what actually happens)

```
Client (/doc-intelligence/upload)
  │  upload 2–3 files (PDF/DOCX) → Storage bucket `docintel-documents` (private)
  ▼
docintel-ingest  [verify_jwt, requireMember→ph_project_members]
  │  insert ai_documents(status=ingesting) + ai_document_versions + ai_document_jobs
  │  unpdf → page_count → insert ai_document_pages(pending)
  │  status→extracting; FAN OUT per 8-page BATCH → docintel-analyze (EdgeRuntime.waitUntil)
  ▼
docintel-analyze  [service-role only]  ── per page, routed:
  │   NATIVE PATH (text layer ≥40 chars): unpdf extractText → deterministic segmenter
  │       (Arabic = source of truth, never re-emitted) → LLM returns EN + kind only
  │   OCR PATH (scanned/sparse): pdf-lib slice → base64 inlineData → Gemini VISION reads page
  │   DOCX: mammoth extractRawText → text prompt
  │  writes ai_document_blocks / ai_document_tables / ai_document_images / ai_extraction_issues
  │  low-confidence blocks/tables → ai_extraction_issues
  │  CAS winner (extracting→chunking) → runEmbedStage IN-PROCESS (no separate fn)
  ▼
runEmbedStage (_shared/embed_stage.ts)
  │  chunk → embed(gemini-embedding-001, 1536-dim) → ai_document_embeddings(project_id, content_kind, lang)
  │  document → status=ready
  ▼
docintel-generate  [verify_jwt, requireMember]  (USER-triggered)
  │  hybrid RAG: docintel_hybrid_search(query_embed, project, filters) → E1..En chunks
  │  grounded generation (per-artifact inline system prompt) via _shared/llm.ts
  │  deterministic [E<n>] citation parse → grounding_score
  │  persist ai_agent_runs + ai_generated_artifacts + ai_artifact_citations
  ▼
UI: workspace (translated view / evidence / facts / artifacts / traceability),
    processing board, project health rollup
```

## Component inventory

| Layer | Artifact | Evidence |
|---|---|---|
| **Frontend module** | `src/modules/docintel/` — 3 pages, 10 components, `domain/index.ts` (`docintelApi`), `hooks/useDocintel.tsx`, `types.ts` | sweep item 7 |
| **Routes** | `/doc-intelligence/*` (`""`, `upload`, `health`, `:slug`) | `DocintelRoutes.tsx`, `routes.ts:290`, `FullAppRoutes.tsx:641` |
| **Nav** | WikiSidebar "Document Intelligence" | `WikiSidebar.tsx:121-127` |
| **Edge functions** | `docintel-ingest`, `docintel-analyze`, `docintel-generate` (all ACTIVE on cyij) + shared `docintel.ts` / `llm.ts` / `embed_stage.ts` | `list_edge_functions` |
| **Schema** | `20260707030000_docintel_schema.sql` — 15 `ai_*` tables | migration |
| **Vector store** | `ai_document_embeddings.embedding vector(1536)`, model `gemini-embedding-001` | live |
| **Retrieval** | `docintel_hybrid_search()` RRF; + `docintel_match_facts`, `docintel_advance_status`, `docintel_stamp_latency`, `docintel_is_project_member`, `docintel_audit`, `docintel_slugify`, `docintel_generate_slug`, `docintel_touch_updated_at` (9 RPCs) | live |
| **Storage** | bucket `docintel-documents` (private) | live |
| **AI** | `_shared/llm.ts` provider chain gemini→anthropic→qwen; `gemini-2.5-flash` text, `gemini-embedding-001` embed | `llm.ts:21,62` |
| **Governance** | `ai_usage_log` (logUsage best-effort) | `llm.ts`, live |

## The 15 `ai_*` tables (schema-complete for documents)

`ai_documents`, `ai_document_versions`, `ai_document_pages`, `ai_document_jobs`,
`ai_document_blocks`, `ai_document_tables`, `ai_document_images`, `ai_document_chunks`,
`ai_document_embeddings`, `ai_extraction_issues`, `ai_agent_runs`, `ai_agent_prompts`,
`ai_generated_artifacts`, `ai_artifact_citations`, `ai_requirement_facts`.

- **Provenance / lineage**: citations resolve to `(document_id, page, block, quoted_text)`.
- **Versioning**: `ai_document_versions` (per document, not per knowledge node).
- **Checksum**: `ai_documents.content_hash` (SHA-256, per document — dedup at document level only).
- **Prompt registry**: `ai_agent_prompts` **exists but is bypassed** — no function reads it;
  prompts are inline constants (`docintel-analyze:186,239`, `docintel-generate:605`). Provenance
  of *which prompt version* produced an artifact is therefore unreliable.

## Deployment reality

- docintel functions deployed **directly via MCP `deploy_edge_function`**, bypassing the
  **broken CI** (`SUPABASE_ACCESS_TOKEN` dead since 2026-07-05).
- Schema applied via migration `20260707030000`.
- No CI/CD path currently lands docintel changes; no rollback path.

## Dependency graph (external)

```
docintel-* ──► Gemini (GEMINI_API_KEY)         [primary: text 2.5-flash, embed 001, vision]
           ├─► Anthropic (ANTHROPIC_API_KEY)   [failover]
           ├─► Qwen/DashScope (DASHSCOPE_API_KEY) [failover, DORMANT — no key]
           ├─► Supabase Postgres + pgvector + Storage
           └─► ph_project_members (permission source of truth)
```

## Architectural assessment

**Correct where it counts, narrow everywhere else.** The document pipeline is well-factored
(CAS status transitions, in-process embed to stay under the edge-function cap, deterministic
segmentation with Arabic-as-source-of-truth, per-page OCR fallback). But the architecture is a
**closed vertical**: every table, function, and route is document-scoped. There is no ingestion
adapter for other Catalyst entities, no compilation layer, no graph, and no scheduler — so the
architecture as built **cannot become a reservoir without net-new horizontal infrastructure**,
not just configuration.
