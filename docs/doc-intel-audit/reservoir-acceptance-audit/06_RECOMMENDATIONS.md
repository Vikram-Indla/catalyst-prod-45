# 06 — Recommendations & Roadmap

Audit-only output: what to build, in what order, to close the reservoir gap. No code proposed
here — this is the decision + sequencing layer. Estimates are engineering-effort orders of
magnitude, not commitments.

## Framing decision (make this first)

**Reuse the `ai_*`/docintel substrate as the reservoir foundation — do NOT start a new family,
and formally retire the parked `kb_*` path.** The `ai_*` schema already has the hard parts
(permission-scoped 1536-dim vectors, hybrid retrieval, citations, provider abstraction). The
reservoir is built by **generalizing `ai_*` beyond documents**, not by greenfielding.

## Priority 0 — Verify & unblock (days)

- **P0-1 Fix deployment**: restore `SUPABASE_ACCESS_TOKEN` (or formalize MCP deploy) so docintel
  changes have a repeatable, rollback-able path. Today deploys are manual.
- **P0-2 Exercise the OCR path**: upload a real **scanned Arabic PDF** and prove `is_scanned=true`
  + `ocr_confidence` populate and blocks extract. The headline "Arabic OCR" is currently
  unproven at runtime.
- **P0-3 Wire the prompt registry**: make functions read `ai_agent_prompts` (or delete the table)
  so `ai_agent_runs.prompt_id` is truthful. Provenance is currently broken.
- **P0-4 Baseline tests**: add a first test suite for the RLS boundary, the grounding-score
  computation, and the no-dropped-pages guarantee. Nothing can PASS the audit gate without this.

## Priority 1 — Make it a reservoir (the core leap) (weeks)

- **P1-1 OKF node/edge schema** (GAP-2): `okf_nodes` keyed by `{entity_type, entity_id}` with
  `source_version`, `content_version`, `checksum`, `permission_scope`, `citation`, `freshness`,
  `confidence`; `okf_edges(src, dst, edge_type, source_version)`. Documents project into it first
  (reuse existing `ai_*`).
- **P1-2 Entity ingestion adapters** (GAP-1): project the next high-value object types into OKF —
  **work items, business requests, releases, incidents** — via read adapters over existing tables,
  chunk+embed the same way, carry each entity's permission scope. This is the feature that makes
  "reservoir" true.
- **P1-3 Knowledge Sync Engine** (GAP-4): source-change capture (triggers/CDC) per entity type +
  durable `okf_sync_jobs` queue (retry/backoff/dead-letter) + freshness accounting + backfill and
  manual-rebuild controls. Generalize the existing per-upload fan-out.
- **P1-4 Permission-aware cross-entity retrieval**: extend `docintel_hybrid_search` to span OKF
  node types with the caller's permissions applied *before* retrieval (the pattern already exists).

## Priority 2 — Compiler, graph, governance (weeks) 

- **P2-1 Knowledge Compiler** (GAP-3): normalization + dedup (beyond `content_hash`) + entity
  resolution + relationship discovery (seed edges from existing FKs/links) + conflict detection +
  observed-vs-inferred tagging + human approval queue.
- **P2-2 Knowledge Graph** (GAP-5): populate `okf_edges` from Catalyst links (story→epic,
  release→change, incident→defect, approval→object), add permission-aware traversal + impact
  analysis + a visual explorer.
- **P2-3 Health governance** (GAP-8): enterprise dashboards — sync queue, failed compilation,
  stale/orphaned/broken-relationship, coverage-by-type, knowledge debt, new/updated/deleted-today.
- **P2-4 Governance controls** (GAP-9): export gating + redaction + a real approval workflow +
  full access-audit trail (extend `docintel_audit`/`ai_usage_log`).

## Priority 3 — Hardening & breadth (ongoing)

- **P3-1 Production** (GAP-12): CI/CD, rollback, alerting, cost caps/budgeting, monitoring.
- **P3-2 Ingest breadth** (GAP-7): Excel/CSV, charts, RTL correctness, scanned-doc test corpus.
- **P3-3 Qwen activation** (GAP-11): add `DASHSCOPE_API_KEY`, prove failover, migrate the older
  `ai-generate-*` functions onto `_shared/llm.ts` so vendor switching is real.
- **P3-4 Reranking + freshness** in retrieval; conversational QA + change-impact agents.

## Rough effort shape

| Phase | Scope | Order of magnitude |
|---|---|---|
| P0 | Unblock, prove OCR, wire prompts, first tests | ~1 week |
| P1 | OKF schema + first 4 entity adapters + sync engine + cross-entity retrieval | ~4–8 weeks |
| P2 | Compiler + graph + health governance + governance controls | ~6–10 weeks |
| P3 | Production hardening + ingest breadth + Qwen + retrieval depth | ongoing |

## Do-not-do

- **Do not** rebuild the document pipeline — it is the strongest part; extend it.
- **Do not** build on the parked `kb_*` path — retire it (0 rows, no runner).
- **Do not** claim "reservoir/OKF/graph/Qwen" in product messaging until P1–P2 land; today it is
  a document RAG.

## Coordination note

The docintel feature is an **actively-developed parallel-session build**
(`CAT-DOCINTEL-ARABIC-RAG-20260706-001`, objective phase, no Plan Lock). This audit is
read-only. Any implementation of the above must be coordinated with that owner — do not fork the
`ai_*` schema or edge functions from a second session.

---

## Final verdict

**Catalyst is a strong Document Intelligence RAG (~33% of an Enterprise Knowledge Reservoir).**
It has the correct hard core — grounded, cited, permission-scoped retrieval with a provider
abstraction — and a live Arabic document product. It is **not** an enterprise reservoir: it
indexes one of twenty-one object types, has no OKF, no compiler, no graph, no sync engine, thin
health governance, and zero tests. The path forward is clear and mostly additive (generalize
`ai_*` into OKF), but it is **net-new horizontal infrastructure**, not the finish line dressed up.
Ship the document product with honest scoping; build the reservoir deliberately against P0–P3.
