# 03 — Plan Lock: Delta-only build (CAT-DOCEX-KNOWLEDGE-PLATFORM-20260707-001)
Date: 2026-07-07. Approval basis: Vikram's /goal mission explicitly orders "Execute delta" +
"/loop until acceptance criteria achieved" — treated as pre-approval for autonomous execution.
Push-to-main authorized (standing memory). Delta-only; document pipeline is NOT rebuilt.

## Objective
Close every ❌/🟡 in 02_CANONICAL_DISCOVERY.md capability matrix that the acceptance contract
(01_OBJECTIVE.md) requires, reusing the ai_*/docintel substrate. No duplicate architecture.

## Non-scope (explicit)
- kb_* track (deprecated) — no new code on it.
- Enterprise-reservoir breadth beyond the contract (21 object families, knowledge graph explorer,
  Qwen activation) — the contract's §6 integration is satisfied by document↔work-item linking,
  not full OKF projection of all Catalyst objects.
- DB-COEDIT track files (DatabaseSurface.tsx, useDocexDatabase.ts) — owned by parallel session.
- Prod (lmqw) — staging cyij only.
- BlockNote/Folio editor changes.

## Working method
- All code in a detached git worktree from origin/main (shared checkout belongs to parallel
  session). Commit → push origin/main → remove worktree. Explicit file staging only.
- DDL to cyij via MCP apply_migration + committed migration files (ledger discipline).
- ADS tokens only; canonical components; grep audit before every styled commit.
- Each slice ≤2h, evidence logged to 04_EXECUTION_LOG.md / 06_VALIDATION_EVIDENCE.md.

## Slices (delta order, AC-coverage-ranked)

**S1 — Ask/Q&A (AR+EN) with citations/confidence/freshness/not-found** [AC §4 Arabic Q&A, §7 all]
- New edge fn `docintel-ask`: requireMember → embed query → docintel_hybrid_search (project or
  document scope) → grounded answer (Gemini, [E n] citations, "Not found" rule, zero-evidence
  short-circuit) → return {answer_md, citations[], confidence, freshness (max source updated_at),
  language}. Reuse _shared/llm.ts + docintel-generate retrieval/citation helpers. Log ai_agent_runs
  + ai_usage_log. Arabic question → ar_text kinds + Arabic answer; auto language detect.
- UI: "Ask" tab in DocintelWorkspacePage + project-level Ask on DocumentsPage. Canonical
  components; RTL for Arabic. Citations open evidence drawer (reuse ArtifactView chip pattern).

**S2 — Freshness + retrieval repairs** [AC §7 freshness, §9 freshness; bugs 1–3]
- docintel_hybrid_search returns document updated_at (freshness) — migration CREATE OR REPLACE.
- Fix citation confidence mis-scale; fix section_path NULL; embed requirement_fact chunks after
  fact extraction (revive docintel_match_facts).

**S3 — Knowledge Integration: document↔work-item links** [AC §6]
- Migration: `ai_document_links` (document_id, entity_type CHECK incl business_request/epic/
  feature/story/release/change/test_case/defect/document, entity_id, link_origin, created_by;
  RLS via parent document). UI: "Linked work" panel in workspace (reuse Folio link-picker
  pattern); artifact promotion already covers epic/story creation.

**S4 — Artifact-type delta** [AC §8]
- Add generatable types: business_process, acceptance_criteria, test_cases, release_notes,
  traceability. Extend docintel-generate ARTIFACT_TYPES + section prompts + schema CHECK
  migration + artifactTypes.ts registry. Same grounding/citation contract.

**S5 — Background sync engine v1** [AC final "continuously synchronized", §9 sync status]
- New edge fn `docintel-sync` (service role): sweep stuck/failed docs → retry via existing
  fan-out; detect missing embeddings/chunks → re-run embed stage; stamp sync run into
  ai_document_jobs (stage='sync'); freshness accounting. pg_cron every 15 min on cyij.

**S6 — Health delta** [AC §9 knowledge debt, sync status]
- Extend DocintelHealthPage + useDocintelHealth: knowledge-debt card (unreviewed facts, draft
  artifacts, open extraction issues, stale docs >30d), sync-status card (last sync run, queue
  depth, failures). Read-only aggregation.

**S7 — Compilation delta** [AC §5 dedup, conflict detection, versioning]
- Ingest: skip-if-duplicate on content_hash (same project) → return existing doc (409-style).
- Conflict detection: cross-doc fact conflict scan via docintel_match_facts + LLM verdict →
  ai_extraction_issues kind='fact_conflict' (or review flag on facts).
- Re-upload flow → ai_document_versions v2 (same slug, version bump).

**S8 — Security delta** [AC §10 export control, approval workflow]
- Export: audit event on every export (docintel_audit) + role gate (project member check already
  implicit; add admin-configurable allow flag if trivial, else audit-only + documented).
- Approval workflow: artifact Approve/Reject actions (status transitions + audit events + who/when).

**S9 — Production baseline** [AC §11]
- Vitest: grounding-score computation, chunk builder, confidence mapping, citation parser
  (extract pure fns if needed). SQL RLS probe script committed. Wire into existing CI test run.

**S10 — OCR proof + evidence pack** [AC §2 scanned PDF; phase gate 3]
- Generate scanned Arabic PDF fixture (rasterized), run through live pipeline on cyij, verify
  is_scanned=true + ocr_confidence + blocks. Screenshots of all new surfaces. Final acceptance
  table with per-item evidence.

**S11 — Acquisition breadth: Excel + images** [AC §2]
- XLSX: SheetJS parse in docintel-analyze → sheets as pages, rows as tables → ai_document_tables.
- Standalone images (png/jpg): treat as 1 scanned page → existing vision OCR path.
- Upload UI accepts .xlsx/.png/.jpg.

## Stop conditions
- Any regression signal on existing docintel flows → RED FLAG + stop.
- Conflict with parallel session's files → stop, report.
- cyij project-ref mismatch → stop.

## Validation commands
- `npx tsc --noEmit` (183 pinned baseline), `npm run lint:colors:gate`, `npm run audit:ads:gate`,
  vitest run, live probes on cyij per slice.
