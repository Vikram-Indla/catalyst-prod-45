# 03 — Capability Matrix

Legend: **PASS** = architecture+runtime+UI+security+evidence all present · **PARTIAL** = works
but incomplete/unhardened/untested · **FAILED** = attempted but non-functional/insufficient ·
**NOT FOUND** = no evidence in repo or runtime.

## Area 2 — Knowledge Reservoir (object indexing)

Evidence baseline: `ai_document_embeddings` content = `ar_text`(170) + `en_text`(195), **all FK
to `ai_documents`**. No other entity family is embedded/indexed.

| Object type | Verdict | Evidence |
|---|---|---|
| Documents | **PASS** | 2 docs, 365 embeddings, retrievable via `docintel_hybrid_search` |
| Images | **PARTIAL** | `ai_document_images` extracted + described, but **not embedded** (no image vectors; only derived text) |
| Tables | **PARTIAL** | `ai_document_tables` extracted; not independently indexed |
| Arabic content | **PARTIAL** | `ar_text` embedded (170); but `source_language` NULL on both docs — no language detection persisted |
| Attachments | **NOT FOUND** | no ingestion path |
| Business Requests | **NOT FOUND** | not indexed |
| Epics / Features / Stories / Sub-tasks | **NOT FOUND** | not indexed (epics/stories are *generated outputs*, not indexed inputs) |
| Releases / Changes | **NOT FOUND** | not indexed |
| Defects / Incidents | **NOT FOUND** | not indexed |
| Test Cases | **NOT FOUND** | not indexed |
| Comments / Activities | **NOT FOUND** | not indexed |
| Workflows / Business Rules | **NOT FOUND** | not indexed |
| APIs / DB metadata | **NOT FOUND** | not indexed |
| Users / Roles / Permissions | **NOT FOUND** | consumed for RLS (`ph_project_members`), not indexed as knowledge |

**Area verdict: FAILED** as an enterprise reservoir — 1 of 21 object families indexed.

## Area 3 — OKF (Open Knowledge Format)

| Facet | Verdict | Evidence |
|---|---|---|
| Named OKF schema / format | **NOT FOUND** | zero `okf`/"open knowledge format" in repo (sweep #2) |
| Generator | **NOT FOUND** | no OKF generator |
| Validator | **NOT FOUND** | — |
| Compiler | **NOT FOUND** | see Area 4 |
| Versioning | **PARTIAL** | `ai_document_versions` (per document, not per knowledge node) |
| Checksum | **PARTIAL** | `ai_documents.content_hash` (per document) |
| Provenance / citations | **PASS (documents)** | `ai_artifact_citations` → doc/page/block/quote (78 rows) |
| Relationships | **NOT FOUND** | no cross-entity relationships |
| Permissions | **PASS (documents)** | project-scoped RLS |
| Freshness | **NOT FOUND** | no freshness field/logic on knowledge nodes |
| Confidence | **PARTIAL** | block/table/image confidence, `grounding_score` |
| Lineage | **PARTIAL** | citation lineage for artifacts only |

**Area verdict: PARTIAL (low)** — provenance/citation/confidence primitives exist for documents,
but there is no OKF *as a format* (schema, generator, validator, checksum-per-node, freshness,
cross-entity relationships).

## Area 4 — Knowledge Compiler

| Facet | Verdict | Evidence |
|---|---|---|
| Normalization | **NOT FOUND** | no knowledge-normalization stage |
| Deduplication | **PARTIAL (claim)** | comments only ("dedupe server-side" `domain/index.ts:418`, `FactsReviewPanel.tsx:7`); doc-level `content_hash`; no fact/knowledge dedup stage proven |
| Entity resolution | **NOT FOUND** | — |
| Relationship discovery | **NOT FOUND** | — |
| Conflict detection | **NOT FOUND** | — |
| Knowledge validation | **PARTIAL** | grounding-marker check in generate; extraction issues |
| Observed vs inferred separation | **NOT FOUND** | — |
| Approval workflow | **PARTIAL** | `ai_requirement_facts` review (confirmed/rejected) via `FactsReviewPanel` — facts only |
| Human approval | **PARTIAL** | facts review + artifact promote-to-work-item |

**Area verdict: NOT FOUND** as a compiler — no compilation stage exists.

## Area 5 — Knowledge Sync Engine

| Facet | Verdict | Evidence |
|---|---|---|
| Incremental sync | **FAILED** | per-upload only |
| Event-driven | **PARTIAL** | fan-out within one ingest (EdgeRuntime.waitUntil); not source-change driven |
| Scheduled sync | **FAILED** | 0 docintel cron jobs (6 total, none docintel) |
| Retry | **PARTIAL** | per-page single retry in analyze; `ai_document_jobs` has `attempts` |
| Dead letter / replay | **NOT FOUND** | — |
| Queue | **PARTIAL** | `ai_document_jobs` (0 rows live; transient) |
| Parallel processing | **PASS** | concurrent 8-page batches |
| Change detection | **NOT FOUND** | no source-change trigger (docintel); (`kb_documents.needs_reindex` is the parked `kb_*` path, not docintel) |
| Deleted-source handling | **NOT FOUND** | — |
| Stale detection | **NOT FOUND** | — |
| Partial / full / manual rebuild | **NOT FOUND** | no rebuild controls |

**Area verdict: FAILED** — a one-shot per-upload pipeline, not a synchronization engine.

## Area 6 — Knowledge Health (dashboards)

| Dashboard | Verdict | Evidence |
|---|---|---|
| Per-document processing/health | **PASS** | `ProcessingStatusBoard.tsx` (stepper, per-page grid, latency) |
| Project coverage/freshness/failures | **PARTIAL** | `DocintelHealthPage.tsx` (this session) — coverage, avg time, embeddings, artifacts, grounding, open issues |
| Confidence | **PARTIAL** | avg grounding shown |
| Failed OCR/compilation | **NOT FOUND** | no dedicated surface (extraction issues not dashboarded) |
| Sync queue / graph / embedding health | **NOT FOUND** | — |
| New/updated/deleted-today | **NOT FOUND** | — |
| Stale / orphaned / broken relationships / knowledge debt | **NOT FOUND** | — |

**Area verdict: PARTIAL** — ~5 of 17 enterprise metrics across 2 surfaces.

## Area 7 — OCR & Vision

| Facet | Verdict | Evidence |
|---|---|---|
| PDF (native text) | **PASS** | unpdf extractText, native path |
| Word (DOCX) | **PASS** | mammoth extractRawText |
| Excel / CSV | **NOT FOUND** | no xlsx/papaparse in docintel (sweep #5) |
| Scanned PDFs (vision OCR) | **PARTIAL (unexercised)** | code exists (pdf-lib slice→Gemini vision); **0 scanned pages processed live** |
| Arabic OCR | **PARTIAL** | Arabic text path PASS; Arabic *vision* OCR unexercised |
| RTL | **NOT FOUND** | no explicit RTL handling proven |
| Complex tables | **PASS** | `ai_document_tables` (header rows + rows + summary) |
| Charts | **NOT FOUND** | no chart understanding |
| Handwriting | **NOT FOUND** | not claimed |
| Vision (multimodal) | **PASS (code)** | Gemini inlineData path; unexercised at runtime |
| Confidence | **PASS** | `ocr_confidence` (page), block/table/image confidence |
| Human review | **PARTIAL** | facts review exists; **no OCR-block review UI** |

**Area verdict: PARTIAL** — text extraction solid; true OCR/vision unexercised; Excel/charts/
handwriting/RTL absent.

## Area 8 — Retrieval

| Facet | Verdict | Evidence |
|---|---|---|
| Keyword | **PASS** | `ts_rank`/websearch inside `docintel_hybrid_search` |
| Vector | **PASS** | pgvector cosine, 1536-dim |
| Metadata filter | **PASS** | lang/content_kind/page/confidence params |
| Hybrid | **PASS** | RRF (vector 0.6 / keyword 0.4, rrf_k 60) |
| SQL/structured | **N/A** | not a stated docintel path |
| Graph traversal | **NOT FOUND** | no graph |
| Reranking | **NOT FOUND** | explicit: "no second LLM critic" (`docintel-generate` header) |
| Permission filtering BEFORE retrieval | **PASS** | `SECURITY DEFINER` membership check + `requireMember` |
| Citations | **PASS** | `[E<n>]` → `ai_artifact_citations` |
| Confidence | **PASS** | vector_sim / grounding_score |
| Freshness | **NOT FOUND** | no recency weighting |
| Answer lineage | **PASS** | citation → doc/page/block/quote |

**Area verdict: PASS (documents)** with gaps — strong hybrid+permission+citation retrieval;
no rerank, graph, or freshness.

## Area 9 — Knowledge Graph

Everything **NOT FOUND** — no graph db/model, typed relationships, visual explorer, filters,
impact analysis, dependency traversal, or lineage graph for docintel (sweep #1). **Area verdict:
NOT FOUND.**

## Area 10 — AI (Qwen + agents)

| Facet | Verdict | Evidence |
|---|---|---|
| Provider abstraction | **PASS** | `_shared/llm.ts` gemini→anthropic→qwen |
| Configuration / model switching | **PASS** | `providerOrder`, `modelOverrides`, env-driven |
| Qwen live | **PARTIAL (dormant)** | wired, `DASHSCOPE_API_KEY` absent → skipped_no_key |
| Vision / multimodal | **PASS** | `inlineData` messages |
| Structured output | **PASS** | Gemini responseSchema; schema-in-prompt for others |
| Arabic generation | **PASS** | `summary_ar` artifact type |
| Streaming | **PASS** | `generateStream` SSE (`docintel-generate` stream=true) |
| Tool calling | **NOT FOUND** | — |
| Fallback | **PASS** | provider failover chain |
| Token budgeting | **PARTIAL** | maxOutputTokens + token capture; no hard budget |
| Prompt management | **PARTIAL** | `ai_agent_prompts` table exists but **bypassed** (inline prompts) |
| Agents: Epic/Story/BRD/Summary/Gap/OpenQ/Traceability | **PASS** | `ai_generated_artifacts.artifact_type` CHECK (8 types) + docintel-generate |
| Agents: Test case | **PASS** | `ai-generate-story-test-cases` / `ai-generate-test-artefacts` |
| Agents: Release notes | **PASS** | `release-notes-generate` |
| Agents: Business process | **PARTIAL** | `ai-generate-workflow` / `workflow-ai` (not docintel-grounded) |
| Agents: Change impact | **NOT FOUND** | no impact agent |
| Question answering | **PARTIAL** | grounded generation exists; no conversational QA surface over reservoir |

**Area verdict: PARTIAL (strong)** — excellent generation/provider layer; Qwen dormant, prompts
unmanaged, no tool-calling, QA/impact agents absent.

## Area 11 — Security

| Facet | Verdict | Evidence |
|---|---|---|
| RLS | **PASS** | all `ai_*` policies project-scoped |
| Tenant isolation | **PASS** | `project_id IN ph_project_members` |
| Permission filtering before retrieval | **PASS** | SECURITY DEFINER + requireMember |
| Audit logs | **PARTIAL** | `ai_usage_log` (usage), `docintel_audit` RPC; not a full access-audit trail |
| Knowledge export controls | **NOT FOUND** | `exportDocument.ts` has no gate (sweep #6) |
| Redaction | **NOT FOUND** | — |
| Approval | **PARTIAL** | facts review only |
| Data lineage | **PASS** | citations |

**Area verdict: PARTIAL (strong isolation)** — real multi-tenant RLS; governance (export/redact/
approval/full-audit) largely absent.

## Area 13 — Enterprise UI

| Surface | Verdict | Evidence |
|---|---|---|
| Knowledge Overview (global) | **NOT FOUND** | no cross-project overview |
| Knowledge Health | **PARTIAL** | per-doc board + project rollup |
| Knowledge Sync | **NOT FOUND** | — |
| Knowledge Graph | **NOT FOUND** | (`WikiKnowledgeGraphPage.tsx` is a phantom stale-registry reference; file absent) |
| Knowledge Explorer | **NOT FOUND** | no cross-corpus search UI |
| Knowledge Lineage | **PARTIAL** | `TraceabilityMatrix` (per-doc facts↔pages↔artifacts) |
| Knowledge Coverage | **PARTIAL** | in health rollup |
| Knowledge Debt | **NOT FOUND** | — |
| Compilation Queue | **NOT FOUND** | — |
| Approval Queue | **PARTIAL** | facts review (per-doc, not a queue) |
| Conflict Resolution | **NOT FOUND** | — |

**Area verdict: PARTIAL** — document UI strong; enterprise reservoir/graph/compiler/sync UIs absent.

## Area 14 — Production readiness

| Facet | Verdict | Evidence |
|---|---|---|
| Tests | **NOT FOUND** | zero docintel/ai_documents tests (sweep #4) |
| Monitoring | **PARTIAL** | `ai_usage_log` + `latency_ms` |
| Logging | **PARTIAL** | console + run ledger |
| Alerts | **NOT FOUND** | — |
| Performance | **PARTIAL** | ≤60s design target; per-page latency stamped |
| Cost | **PARTIAL** | token capture in `ai_usage_log`; no budget/caps |
| Retry / recovery | **PARTIAL** | per-page retry + mark-failed |
| Backups | **PARTIAL** | Supabase default only |
| Deployment | **FAILED** | broken CI; MCP-only manual deploy |
| Rollback | **NOT FOUND** | — |

**Area verdict: FAILED** for production — functional on staging, not hardened, untested.
