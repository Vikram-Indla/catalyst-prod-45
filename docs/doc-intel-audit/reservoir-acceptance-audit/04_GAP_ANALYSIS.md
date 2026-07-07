# 04 — Gap Analysis

Ranked by distance between the **enterprise reservoir claim** and the **verified reality**.
Each gap: what's claimed → what exists → what's missing → why it matters.

## GAP-1 — The reservoir indexes only documents (CRITICAL)

- **Claim:** a unified knowledge repository over all Catalyst objects.
- **Reality:** `ai_document_embeddings` = 365 rows, `ar_text`/`en_text`, **100% FK to
  `ai_documents`**. No BR/epic/story/release/change/defect/incident/test/comment/activity/
  workflow/rule/API/DB-metadata/user embeddings.
- **Missing:** entity ingestion adapters, a normalized knowledge-node table not tied to
  `document_id`, per-entity chunking/embedding, and per-entity permission mapping.
- **Why it matters:** without this, retrieval and generation can never answer cross-entity
  questions ("which release closed INC-9", "which stories trace to BRD-42"). This is the
  single defining feature of a "reservoir" and it does not exist.

## GAP-2 — No OKF (Open Knowledge Format) (CRITICAL)

- **Claim:** an OKF projection with schema/generator/validator/checksum/freshness/relationships.
- **Reality:** the `ai_*` tables are a document-scoped projection with citations, per-document
  versioning, and a per-document `content_hash`. There is **no named format**, no generator, no
  validator, no per-node checksum, no freshness field, no cross-entity relationships.
- **Missing:** an `okf_nodes` / `okf_edges` (or equivalent) representation keyed by
  `{entity_type, entity_id}` with `content_version`, `source_version`, `permission_scope`,
  `citation`, `checksum`, `freshness`, and a compiler that populates it.
- **Why it matters:** OKF is the substrate that makes the reservoir queryable, versioned, and
  governable as *one* thing. Its absence means every capability below is document-only.

## GAP-3 — No Knowledge Compiler (CRITICAL)

- **Reality:** pipeline is ingest→analyze→embed→generate. No normalization, entity resolution,
  relationship discovery, conflict detection, or observed-vs-inferred separation. "Dedup" is a
  code comment, not a stage; the only real dedup is per-document `content_hash`.
- **Missing:** the entire compile layer that turns raw extractions + entity rows into
  canonical, deduplicated, related, conflict-checked knowledge nodes.
- **Why it matters:** without a compiler, knowledge is a pile of chunks, not a coherent model;
  conflicts and duplicates accumulate silently.

## GAP-4 — No Knowledge Sync Engine (CRITICAL)

- **Reality:** embedding runs **inline per upload** (`runEmbedStage`). **0 docintel cron jobs.**
  No change-detection on Catalyst objects, no queue/dead-letter/replay, no stale detection, no
  deleted-source handling, no rebuild controls.
- **Missing:** a source-change capture mechanism across entity types, a durable job queue with
  retry/backoff/dead-letter, freshness accounting, and partial/full/manual rebuild.
- **Why it matters:** a reservoir must stay fresh as its ~20 source types change continuously.
  Today nothing keeps knowledge current except a manual re-upload.

## GAP-5 — No Knowledge Graph (HIGH)

- **Reality:** NOT FOUND. No graph tables/edges/traversal/visualization for docintel. The only
  graph edges in the repo (`strata_map_edges`) belong to the unrelated Strata module.
- **Missing:** an edge model (relational is sufficient), edge extraction from existing Catalyst
  FKs/links, permission-aware traversal, and a visual explorer.
- **Why it matters:** impact analysis, dependency traversal, and cross-entity lineage are
  impossible without it.

## GAP-6 — Zero automated tests (HIGH / production-blocking)

- **Reality:** no test file references docintel or `ai_documents`. The pipeline's correctness
  (Arabic-as-source-of-truth, no-dropped-pages, grounding score, RLS) is **entirely unverified
  by tests**.
- **Why it matters:** by the audit's own PASS gate ("tested"), **no capability can fully PASS**.
  Regression risk is unbounded, especially for the anti-hallucination and RLS guarantees.

## GAP-7 — OCR/vision path unexercised; Excel/charts/RTL absent (HIGH)

- **Reality:** both live documents were native-text PDFs (0 scanned pages). The Gemini vision
  OCR path has **never run on a real scanned document**. Excel/CSV, charts, and handwriting are
  not handled; RTL is not proven.
- **Why it matters:** "Arabic OCR" is a headline capability; it is coded but unproven, and the
  business inputs (scanned ministry PDFs, spreadsheets) are exactly the unexercised cases.

## GAP-8 — Health governance is thin (MEDIUM)

- **Reality:** 2 surfaces cover ~5 of 17 enterprise metrics. No sync-queue, failed-compilation,
  graph, orphaned-node, broken-relationship, stale, or knowledge-debt dashboards.
- **Why it matters:** you cannot operate a reservoir you cannot observe; freshness/coverage/debt
  are the operator's core signals.

## GAP-9 — Governance controls missing (MEDIUM)

- **Reality:** RLS/tenant isolation are strong, but export controls, redaction, and a real
  approval workflow (beyond per-doc facts review) and a full access-audit trail are absent.
  `exportDocument.ts` has no gate.
- **Why it matters:** enterprise knowledge (ministry BRDs) needs export/redaction governance,
  not just read isolation.

## GAP-10 — Prompt provenance unreliable (MEDIUM)

- **Reality:** `ai_agent_prompts` (versioned prompt registry) exists in schema but **no function
  reads it**; prompts are inline constants. `ai_agent_runs.prompt_id` cannot be trusted to
  reflect the actual prompt used.
- **Why it matters:** reproducibility and audit of *how* an artifact was generated is broken.

## GAP-11 — Qwen dormant; single-vendor in practice (LOW/MEDIUM)

- **Reality:** provider abstraction is real, but Qwen has no key (`skipped_no_key`) and the older
  `ai-generate-*` functions bypass the abstraction entirely (call Gemini directly). Effective
  runtime is Gemini-only.
- **Why it matters:** the "Qwen-powered" goal is not met at runtime; vendor concentration risk
  remains.

## GAP-12 — No production/deployment path (HIGH)

- **Reality:** CI broken (dead `SUPABASE_ACCESS_TOKEN`); docintel deployed by hand via MCP; no
  rollback, alerts, or monitoring beyond usage/latency.
- **Why it matters:** the feature cannot be shipped or operated to production standard today.

## Summary

The gaps cluster into **one theme**: the team built a **deep document vertical** and none of the
**horizontal enterprise layers** (all-object OKF, compiler, graph, sync, health governance,
tests, production). Closing GAP-1..4 is ~80% of the remaining work and is net-new infrastructure,
not configuration.
