# Doc Intel / Knowledge Platform — Current-State Discovery Audit

**Type**: Discovery only. No implementation, refactor, rename, delete, fix, or schema change performed.
**Date**: 2026-07-09
**Scope**: `docintel` module (`/doc-intelligence/*`) — OKF, Knowledge Base, Knowledge Reservoir, RAG, AI Gateway, ingestion, citations, artifact generation, links to BR/Epic/Feature/Story/Defect/Incident/Release/Test.
**Method**: 4 parallel read-only agents — (1) frontend/service code inventory, (2) Supabase live schema/data probe (staging `cyij`, read-only), (3) docs/tests/seeds inventory, (4) live browser navigation of `localhost:8080`.

---

## Executive Summary

Catalyst has a **real, live, single canonical Doc Intel system** — not a mock. It lives at `/doc-intelligence/*` (`src/modules/docintel/`), backed by the `ai_*` Supabase schema (staging `cyij`), 6 active edge functions, pgvector-backed hybrid retrieval, and a 15-minute cron sync. Live-probed on 2026-07-09: real async Extract/Generate/Ask calls (non-deterministic 6–45s latency), per-claim citation drawers with page + quoted excerpt, bilingual (EN/AR) grounded Q&A, and a populated Knowledge Health dashboard (383 embeddings, 100% avg grounding, 0 conflicts).

However, this is a **document-intelligence RAG system**, not the full "award-grade" **OKF** (Open Knowledge Format — repo-defined in `docs/doc-intel-audit/08_okf_and_offline_sync_options.md` as a versioned, permission-aware, citation-backed projection of *all* Catalyst objects: work items, releases, changes, tests, defects, incidents, workflows, rules, APIs, DB schema, users/roles). The 2026-07-07 Plan Lock explicitly **descopes** that broader vision (`features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/03_PLAN_LOCK.md:12-14`): no knowledge graph explorer, no full OKF projection of all Catalyst objects, no Qwen activation. A parallel legacy system (`kb_*` tables + `kb-*` edge functions, used by ReqAssist) is confirmed dead/empty and explicitly deprecated by the same Plan Lock.

**"Themes" as a first-class indexing/browsing concept does not exist** in the docintel module — content is organized by workspace/project, not theme. No manual re-index/refresh button was found in the UI (sync is cron-only, 15 min).

---

## 1. Inventory

| Layer | Item | Path | Status |
|---|---|---|---|
| Route | `/doc-intelligence` list | `src/lib/routes.ts:290-297`, `src/modules/docintel/DocintelRoutes.tsx:47-58` | **PASS** — mounted in `src/routes/FullAppRoutes.tsx:631`, real, reachable |
| Route | `/doc-intelligence/upload` | `DocintelUploadPage.tsx` | PASS |
| Route | `/doc-intelligence/health` | `DocintelHealthPage.tsx` | PASS |
| Route | `/doc-intelligence/:slug` workspace | `DocintelWorkspacePage.tsx` | PASS |
| Nav | Sidebar entry "Document Intelligence" | `src/components/layout/WikiSidebar.tsx:106-127` (under Folio → My Space) | PASS — wired, not orphaned |
| Nav | Wiki page attach-and-ingest entry point | `src/components/wiki-hub/DocexAttachments.tsx:96-112` | PASS — real, calls `docintelApi.uploadAndIngest` |
| Legacy route | `/kb-admin-setup`, `/kb-data-audit` | `FullAppRoutes.tsx:477,479` | Reachable by direct URL only, **no nav link found** — orphaned admin routes on the deprecated `kb_*` track |
| Pages (4) | Documents / Upload / Health / Workspace | `src/modules/docintel/pages/*.tsx` (272–532 lines each) | PASS, all wired into router |
| Components (12) | AskPanel, ArtifactView, GenerationPanel, EvidenceViewer, TranslatedDocumentView, FactsReviewPanel, TraceabilityMatrix, DocumentLinksPanel, PdfThumbnails, ProcessingStatusBoard, PromoteArtifactModal | `src/modules/docintel/components/*.tsx` | PASS, all transitively reachable from the 4 pages, all call real `docintelApi`/edge functions — no hardcoded mock arrays found |
| Hooks (19) | `useDocintelProjects`, `useDocintelDocuments`, `useAskDocintel`, `useArtifacts`, `useDocumentLinks`, `useTraceability`, etc. | `src/modules/docintel/hooks/useDocintel.tsx:36-522`, `useDocintelHealth.ts`, `useActiveDocintelProject.ts`, `useArtifactGovernance.ts` | PASS, all real Supabase/edge-function backed |
| Dead code | `useDocintelDocumentBySlug.ts` | `src/hooks/useDocintelDocumentBySlug.ts` | **Orphan** — zero external callers found; real backend logic but unreachable |
| Service layer | `docintelApi` (950 lines, single API surface) | `src/modules/docintel/domain/index.ts` | PASS — real `.from()` calls into 11 `ai_*` tables + `.functions.invoke()` into 3 edge fns |
| Edge functions | `docintel-ingest`, `docintel-analyze`, `docintel-ask`, `docintel-generate`, `docintel-sync` | `supabase/functions/docintel-*/index.ts` | PASS — all **ACTIVE** on live staging project, versions 5–7 |
| Edge functions | `docex-import` | `supabase/functions/docex-import/index.ts` | ACTIVE, not fully traced (separate import path) |
| Legacy edge fns | `kb-ingest`, `kb-query`, `kb-sync`, `kb-train`, `kb-cleanup`, `kb-feedback`, `kb-generate-answers` | `supabase/functions/kb-*/index.ts` | Flagged **"0 refs" / safe-delete candidates** in `07_HANDOVER.md:11` of the same feature that built docintel — treat as legacy, not current architecture |
| DB tables | 16 `ai_*` tables (documents, chunks, embeddings, pages, blocks, tables, images, versions, jobs, links, artifacts, citations, facts, audit, sync_runs, theme_cache, usage_log) | staging `cyij` | **PASS** — real, populated (see §Data below) |
| DB tables | `kb_*` (documents, databases, database_rows, sources, embeddings, query_log) | staging `cyij` | `kb_embeddings=0`, `kb_query_log=0` — **dead/unused**, confirms deprecation |
| Storage bucket | `docintel-documents` | Supabase Storage | PASS — 3 objects, 1:1 match with 3 `ai_documents` rows |
| Extension | `pgvector` | staging `cyij` | PASS — v0.8.0 installed |
| RPCs | `docintel_hybrid_search`, `docintel_match_facts`, `docintel_advance_status`, `docintel_log_export`, `docintel_audit`, etc. | staging `cyij` (`pg_proc`) | PASS — hybrid vector+FTS RRF search live; `docintel_match_facts` confirmed **dead** (no requirement-fact embeddings exist yet) |
| Cron | `docintel-sync-15min` | pg_cron | PASS — active, `*/15 * * * *` |
| Migrations | 16 `20260707*_docintel_*.sql` files | `supabase/migrations/` | PASS — all schema-only, no seed data (see §Seeds) |
| Tests | `docintel-contracts.test.ts`, `confidence.test.ts`, `citationMarkers.test.tsx` | `src/test/edge/`, `src/modules/docintel/components/__tests__/` | PASS — 33+25 real vitest assertions, run in CI glob, no skips |
| Prior audit | `docs/doc-intel-audit/` (01–09 + reservoir-acceptance-audit) | repo root | Pre-existing forensic audit, dated before the 2026-07-07 build; superseded on several claims (e.g. "zero tests" is now stale) |

---

## 2. Current User Ability (PASS/PARTIAL/FAIL/N/A)

| Capability | Verdict | Evidence |
|---|---|---|
| Upload PDF (and DOCX/XLSX/image per S11) | **PASS** | `DocintelUploadPage.tsx` 3-step wizard, live-probed at `/doc-intelligence/upload?project=BAU`; storage bucket has 3 real objects |
| Store as chunks/vectors/embeddings/metadata | **PASS** | 378 chunks, 378 embeddings (`vector(1536)`, spot-checked non-null), 27 pages, 651 blocks — all in `ai_*` tables, staging `cyij` |
| Search within a workspace/project | **PASS** | `docintel_hybrid_search` RPC (vector 0.6 + FTS 0.4, RRF), Arabic regconfig migration exists |
| Search globally across all knowledge | **PARTIAL** | Retrieval is workspace/project-scoped (`ph_project_members` gate) by design — no evidence of a cross-project/global search surface; not found as a gap so much as an intentional tenant boundary |
| Ask AI over stored content | **PASS** | Live-probed: EN query → 9 sources, 100% confidence, ~6s latency; AR query (`ما هي متطلبات النظام؟`) → correct RTL grounded answer, different doc than first query — confirms real cross-document retrieval, not canned |
| Hover/click citations + source card | **PASS** (click, not hover) | Live-probed: clicking `[E<n>]`/page marker opens drawer with Claim, "Quoted from source" excerpt, page number, block hash ID. Screenshot: `features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/evidence/03-ask-citation-drawer.png` |
| Source bibliography | **PARTIAL** | Per-answer source list exists (9 sources shown); no standalone aggregated "bibliography" view found |
| Generate docs/artifacts from sources | **PASS** | `GenerationPanel.tsx` — Executive Summary, Epic generation live-probed, 45s async, "N claims cited", "grounding 100%", VERIFIED badge |
| Convert knowledge → BR/Epic/Feature/Story/Sub-task/Defect/Incident/Test | **PARTIAL** | "Promote to work items" button exists on generated artifacts (`PromoteArtifactModal.tsx`) — present and reachable, but **not exercised live** (agent avoided clicking to prevent creating real work items as a side effect of a read-only audit). Code-level: real component, real modal, not a stub. Full BR/Epic/Feature/Story/Defect/Incident/Test coverage of promotion targets not independently confirmed end-to-end. |
| Link to BR/Epic/Feature/Story/Release/Change/Test/Defect/Document | **PASS** (schema+UI), **PARTIAL** (live data) | `DocumentLinksPanel.tsx` + `ai_document_links` table wired; live-probed Links tab showed "No linked work yet" — feature present, unexercised with real links at audit time |
| Query Catalyst/Jira/git knowledge | **PARTIAL** | Catalyst content ingestion path exists (docex-import); a separate `jira-ingest` edge function exists but feeds `ph_*` Jira-parity tables, **not** the docintel RAG substrate — Jira and git content are not confirmed to be retrievable through the same Ask/citation pipeline as PDFs |
| Re-index/refresh manually | **FAIL** | No manual re-index/refresh button found in any docintel page/component searched |
| Scheduled refresh | **PASS** | `docintel-sync-15min` cron confirmed active; Health dashboard live-probed shows "last sync 10 minutes ago," 0 conflicts, 0 queue depth |
| Delete/rebuild | **N/A / not found** | No delete or rebuild UI located in this pass — not confirmed present or absent beyond "not found after search" |

---

## 3. Architecture Reality

**Real RAG confirmed.** Pipeline (per `features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/02_CANONICAL_DISCOVERY.md:18-20` and independently corroborated by DB/edge-function inventory):

```
docintel-ingest (upload, storage)
  → docintel-analyze (native-first extraction; Gemini vision OCR fallback for scanned PDFs, 8-page batches)
  → embed_stage.ts shared helper (gemini-embedding-001 @ 1536 dims → ai_document_embeddings)
  → docintel_hybrid_search RPC (pgvector cosine + Postgres FTS, RRF fusion, vector_weight=0.6/keyword_weight=0.4/rrf_k=60)
  → docintel-ask (grounding, citation marker [E<n>] injection, EN/AR)
  → docintel-generate (artifact synthesis with citation grounding + confidence scoring)
```

| Property | Finding |
|---|---|
| Embedding provider/model | Gemini `gemini-embedding-001`, 1536 dims — confirmed via code + live vector_dims=1536 spot-check |
| Vector store | Postgres + pgvector 0.8.0 (staging `cyij`), not a separate vector DB |
| Chunking | `_shared/embed_stage.ts` (245 lines) builds chunks; page/block granularity (`ai_document_pages`, `ai_document_blocks`) |
| Retrieval | Hybrid vector+keyword with RRF — real, not vector-only |
| Reranking | Not confirmed as a distinct stage beyond RRF fusion — no separate reranker model identified |
| Grounding prompt | `docintel-ask`/`docintel-generate` source enforces "Not found" EN/AR refusal strings when ungrounded — verified by `docintel-contracts.test.ts` string-invariant tests |
| AI Gateway path | Direct Gemini calls per function; provider chain documented as Gemini primary → Anthropic failover → Qwen dormant (`_shared/llm.ts`), not a unified "AI Gateway" abstraction layer |
| Tenant/project scope | `docintel_is_project_member` RPC + `ph_project_members` check in `useDocintel.tsx:43` — real RLS-backed scoping |
| RBAC | RLS confirmed via `scripts/docintel-rls-probe.sql` (manual, non-CI, proves non-members denied on `ai_documents`/`ai_document_embeddings`/`ai_document_links`) |
| PDF/OCR | Native-first extraction + Gemini vision OCR fallback; live-probed fixture `scanned_arabic_fixture.pdf` exists and is status READY |
| Versioning | `ai_document_versions` table (1 row) + `useUploadNewVersion`/`useDocumentVersions` hooks — present |
| Citation traceability | Real per-claim: dedupe key = 3 literal separators joining claim/document_id/page_number/block_id (verified by test) |
| Scheduler/daily refresh | 15-min cron, not daily — more frequent than the objective's "daily refresh" language, functionally superset |
| Known errors/bugs (self-documented) | `02_CANONICAL_DISCOVERY.md:134-138`: citation confidence mis-scaled (~0.01 vs grounding 1.0 — display bug); `chunk.section_path` NULL despite being built; `docintel_match_facts` RPC dead (zero requirement-fact embeddings); `ai_agent_prompts` registry is a placeholder — **runtime uses hardcoded prompts**, so prompt-id provenance shown to users is not truthful |

---

## 4. Knowledge Model

| Concept | Verdict | Evidence |
|---|---|---|
| OKF (repo-defined) | **Defined, largely NOT built for non-document objects** | `docs/doc-intel-audit/08_okf_and_offline_sync_options.md` defines OKF = "Open Knowledge Format," a versioned/permission-aware/citation-backed projection of Catalyst objects (docs, work items, BRs, epics, releases, changes, tests, defects, incidents, comments, approvals, workflows, rules, APIs, DB tables, users/roles). Only the **document** slice of this is implemented; the 2026-07-07 Plan Lock explicitly excludes full OKF projection of all Catalyst objects and a knowledge-graph explorer (`03_PLAN_LOCK.md:12-14`). |
| Knowledge Base (`kb_*`) | **Deprecated, empty** | `kb_embeddings=0`, `kb_query_log=0` rows; explicitly parked per Plan Lock; used only by legacy ReqAssist side panel |
| Knowledge Reservoir | **PASS for documents only** | Live data: 3 ready docs, 378 chunks/embeddings, 78 citations, 651 blocks — this is the "reservoir," scoped to ingested documents |
| Themes/collections | **FAIL / not found** | No component, route, or table implements "theme" as a knowledge-grouping/indexing concept in the docintel module. A `ai_theme_cache` table exists (4 rows) but its role wasn't traced to a UI "browse by theme" feature; live probe found **no** theme/collection browsing UI — only workspace/project-level organization. "Industrial Scanning" as a theme is **not currently possible** as a first-class browsable construct. |
| Indexes/domains/taxonomies/tags | **Not found** | No taxonomy or tagging system located for docintel content |
| Re-index Catalyst/Jira/git knowledge | **PARTIAL/FAIL** | Catalyst-content ingestion path exists (`docex-import`); Jira ingestion (`jira-ingest`) feeds separate `ph_*` tables, not proven to flow into the same RAG substrate; git ingestion **not found** anywhere in this audit |
| Restricted search | **PASS** | Workspace/project RLS scoping confirmed live and via RLS probe script |
| Links to BR/Epic/Feature/Story/Defect/Incident/Release/TestHub/Jira/docs | **PARTIAL** | `DocumentLinksPanel.tsx` + `ai_document_links` schema present; live data shows zero exercised links at audit time |

---

## 5. UI/UX

Live-probed 2026-07-09 on `localhost:8080`, staging project `cyijbdeuehohvhnsywig`. Screenshots (pre-existing, from the shipping session, reused as evidence — not re-captured this pass; see note below): `features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/evidence/01-documents-page.png` through `12-voice-still-works-elsewhere.png`.

**Note on this audit's own screenshot attempt**: the live-probe agent could not persist new screenshots to disk in this session (Chrome MCP `save_to_disk` returned only an internal screenshot ID, no resolvable file path materialized anywhere on the filesystem after a broad search). All UI findings below are from direct visual inspection during the session, not new saved files. Existing `audit-01`..`audit-12`-prefixed files were **not** created; only the prior session's `01`..`12` files exist.

| Area | Finding |
|---|---|
| Enterprise-grade query-first UX | Ask panel present at both per-document and per-workspace scope; real multi-second async feedback ("Asking...", "Extracting...", "Generating..." counters) rather than instant fake responses |
| Role-awareness | Workspace-scoped visibility confirmed (2 workspaces, one empty, one with 3 docs) — implies membership gating; full per-role UI differences not tested |
| Citation-friendliness | Click-to-open citation drawer with claim/excerpt/page/block-hash — functional, not decorative |
| Bland/static/mock areas | None found in the docintel module itself. Legacy `kb_*` admin pages (`/kb-admin-setup`, `/kb-data-audit`) exist but are unlinked from nav — effectively dead surface, not part of the live experience |
| Broken flows | None observed in Documents/Upload/Health/Ask/Facts/Artifacts/Links/Document tabs |
| Empty states | Clean, CTA-driven: "No documents yet", "No facts yet", "No linked work yet" |
| Console errors | Two app-wide (not Doc-Intel-specific) warnings on every page: an `@atlaskit/select` legacy-context warning, and a `component_config` missing-table warning — pre-existing, unrelated to Doc Intel |
| Non-canonical components | Not assessed in depth this pass (ADS-token audit out of scope for this discovery-only task per CLAUDE.md ADS rules — ADS compliance was not the objective here) |

---

## 6. Persona Probes

| Persona | Can do | Cannot do (today) |
|---|---|---|
| **BA** | Query ingested documents for process/policy content (EN+AR), get grounded answers with citations; generate Executive Summary / Epic / other artifact types with per-claim grounding | Cannot browse by "theme"; cannot query Jira/git content through the same Ask surface; "generate BRD" exists as an artifact type per code but full BRD-specific journey not independently exercised live this pass |
| **PO** | View Knowledge Health metrics (coverage, grounding %, sync status); see generated artifacts with a "Promote to work items" action | Cannot discover "themes" (concept doesn't exist); promotion-to-backlog action exists in code but was not exercised end-to-end in this audit (avoided to prevent creating live work items) |
| **Developer** | Ingest and query Catalyst-authored documents via `docex-import`; view chunk/block/citation traceability | Cannot confirm git-repo content is queryable — no git ingestion pathway found anywhere in the codebase or DB in this audit |
| **QA** | View Traceability Matrix tab per document; see Facts extraction with confidence scores | `docintel_match_facts` RPC confirmed dead (no requirement-fact embeddings exist) — fact-level semantic search is non-functional despite the UI panel existing |
| **Admin** | View Knowledge Health dashboard (documents, coverage, embeddings count, artifacts, grounding avg, sync status, conflicts, queue depth) | No re-index/refresh/rebuild button found; no KB/source management admin UI for docintel (only the deprecated `kb_*` admin pages exist, and those are unlinked from nav) |

---

## 7. P0–P2 Gaps

**P0 (blocking for "award-grade" claim):**

> **UPDATE 2026-07-09 (post-deploy live re-verification, staging `cyij`):** Items 1 and 4 below
> were RESOLVED in code (2026-07-07) and are now deployed + verified live. Re-probe results:
> `ai_requirement_facts`=5 with 5 fact embeddings (1:1:1) → `docintel_match_facts` now functional;
> citation confidence fixed for all post-2026-07-07 artifacts (46 cites @0.73–1.0), only 78 stale
> rows remain on 2 pre-fix demo artifacts (write-once, harmless historical). `section_path` NULL
> down to 2/350 (0.6%). See `features/CAT-DOCINTEL-V2-20260709-001/06_VALIDATION_EVIDENCE.md` +
> `08_DRIFT_LOG.md`. Items 2 and 3 remain genuinely open. Original findings preserved below for
> the record.

1. ~~`docintel_match_facts` RPC is dead~~ **RESOLVED + LIVE** — 5/5 fact embeddings verified 2026-07-09.
2. `ai_agent_prompts` registry is a placeholder — runtime uses hardcoded prompts; any UI/audit trail claiming prompt-id provenance is not truthful (self-documented bug). **STILL OPEN** — CAT-DOCINTEL-V2 Slice 4.
3. No "theme" indexing/browsing exists at all — a headline requirement ("Industrial Scanning" as a theme) is unimplemented. **STILL OPEN** — CAT-DOCINTEL-V2 Slice 5.
4. ~~Citation confidence display is mis-scaled (~0.01 vs actual grounding ~1.0)~~ **RESOLVED + LIVE** — fixed for all post-fix artifacts; 78 stale historical rows only.

**P1:**
5. No manual re-index/refresh/rebuild control in the UI — operators depend entirely on the 15-min cron with no on-demand trigger.
6. Jira and git content are not confirmed to flow into the same RAG/citation pipeline as PDFs — "query Catalyst/Jira/git knowledge" from one Ask surface is unproven.
7. "Promote to work items" and document↔work-item linking exist in code/schema but were unexercised with real data at audit time — conversion journey claim is PARTIAL, not PASS, until run end-to-end.
8. Full OKF (all Catalyst object types, knowledge graph, org-level health rollup) is explicitly out of scope per the 2026-07-07 Plan Lock — if "award-grade OKF" is the bar, this is the largest single gap, by design, not oversight.

**P2:**
9. Legacy `kb_*` tables/edge functions/admin pages are dead weight (0 rows on retrieval-critical tables, "0 refs" edge functions) — cleanup candidate, no functional risk today since unlinked from nav.
10. `chunk.section_path` is NULL despite being built (self-documented) — likely degrades chunk-level navigation/context display.
11. No aggregated cross-answer "source bibliography" view — only per-answer source lists.
12. Orphaned hook `useDocintelDocumentBySlug.ts` — zero callers, dead code.

---

## Git status (at report time)

```
Current branch: main
 M src/components/releasehub/detail/ChangeCockpitSections.tsx   (pre-existing, unrelated to this audit)
?? .file_list.txt
?? design-governance/CDL_CHARTER_DRAFT.md
?? features/CAT-CODE-CLEANUP-DEADCODE-20260708-001/...
?? features/CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001/...
?? features/CAT-FOLIO-NOTION-20260706/07_HANDOVER.md
?? features/CAT-HOME-NOISECUT-20260708-001/...
?? features/CAT-RELEASE-UI-STANDARDIZATION-20260707-001/...
?? features/CAT-TESTHUB-PRODREADY-20260707-001/...
```
No files touched by this audit other than the new report at `docs/audits/doc-intel-current-state-discovery.md`. All pre-existing untracked/modified state predates this session.

**No implementation performed.**

---

## 10-Line Verdict: Is Doc Intel Award-Grade Today?

1. Doc Intel is real, not a demo — live pgvector RAG, real Gemini embeddings, real hybrid retrieval, live-probed working end-to-end.
2. Citations are genuinely grounded per-claim (quoted excerpt + page + block hash), not decorative — this is a strong, defensible differentiator.
3. Bilingual (EN/AR) grounded Q&A works live, cross-document, in the same session — a real capability, not staged.
4. Artifact generation (Epic/Executive Summary) with grounding scores and an approval workflow is real and functioning.
5. The system correctly self-documents its own known bugs (confidence mis-scaling, dead `match_facts` RPC, hardcoded-prompt placeholder) — good engineering hygiene, but these are live correctness gaps today.
6. "Themes" as an indexing/browsing concept — a named target capability — does not exist at all; this is a hard miss against the stated ambition.
7. The system is scoped to *documents*; it is not yet the enterprise OKF (all Catalyst objects + knowledge graph) — and this was a deliberate, documented descope, not a surprise.
8. Jira/git knowledge querying through the same Ask surface is unproven; only PDF/document ingestion is confirmed end-to-end.
9. Legacy `kb_*` dead weight and an orphaned hook are minor cleanup debt, not functional risk, since they're unlinked from navigation.
10. **Verdict: strong, genuinely-working document-RAG subsystem with real engineering rigor — but not yet "award-grade" against the full OKF/Knowledge-Reservoir ambition stated in the objective; closing the theme-indexing gap, fixing the two self-documented correctness bugs, and proving Jira/git ingestion are the highest-leverage next moves.**
