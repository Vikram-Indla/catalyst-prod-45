# 09 — Catalyst Knowledge Reservoir: Target Architecture Decision

> Supersedes the retracted guesses in [`08`](08_okf_and_offline_sync_options.md). Grounded in
> the forensic audit (`01`–`07`) and the `CAT-DOCEX-RAG-AGENTS-20260706-001` intent ledger.
> **This is an architecture decision doc, not an implementation. No code is written here.**

## §0 — Live verification (2026-07-07, staging `cyijbdeuehohvhnsywig` via MCP)

The audit's two open evidence conflicts (`06`) and the deploy handover are now **settled
against the live staging DB** — and, critically, **most of this doc's "target" already exists
and runs** as a self-contained `ai_*` / `docintel_*` family (the `CAT-DOCEX-RAG-AGENTS`
pipeline). The rest of this doc (§1–§10) was written before that pipeline was probed and
**overstates what is missing** — read it through the lens of this section.

### Finding A — the Knowledge Reservoir is largely BUILT (as `ai_*`/docintel, not `kb_*`)

| Piece | Live status |
|---|---|
| Schema | 14 `ai_*` tables (`ai_documents`, `ai_document_versions/pages/jobs/blocks/chunks/images/tables/embeddings`, `ai_extraction_issues`, `ai_agent_runs`, `ai_generated_artifacts`, `ai_artifact_citations`, `ai_requirement_facts`) + 9 `docintel_*` RPCs + `docintel-documents` storage bucket — **all present** |
| Functions | `docintel-ingest` / `docintel-analyze` / `docintel-generate` live (deployed via MCP, CI bypassed) |
| Ingestion | `ai_documents` = 2 docs ingested (PDF page-count via unpdf, fan-out per 8-page batch) |
| Embeddings | **`ai_document_embeddings` = 365 rows**, dim **1536**, `project_id`-scoped |
| Retrieval | `docintel_hybrid_search` RPC live — scoped by project/doc/lang/content-kind/confidence (RRF vector+keyword) |
| Agents + citations | `ai_generated_artifacts` = 2 (**brd, epic**); **`ai_artifact_citations` = 78 rows** → citation-backed generation is working; `ai_requirement_facts` for grounded facts |
| Permissions | `requireMember` → `ph_project_members`, `docintel_is_project_member` RPC, **RLS on `ai_documents` and `ai_document_embeddings` (3 policies each)** → **permission-aware** |

So: OKF-style projection of documents, permission-aware hybrid retrieval, and citation-backed
artifact generation are **not "missing" — they are deployed and producing real data.** The
`ai_*` schema is effectively an OKF for the document+requirement slice.

### Finding B — audit conflicts closed; `kb_*` path is a separate, empty, older track

| Question | Live answer |
|---|---|
| `kb_embeddings` RLS (`06` Conflict 1) | **Enabled, 3 policies**; but **SELECT qual = `true`** (unscoped). Audit Claim A correct. |
| Dropped `kb_*` tables (`06` Conflict 2) | **Confirmed dropped**: `kb_audit_log`, `kb_document_jira_issues`, `kb_document_page_properties`, `kb_eval_set`, `kb_eval_results` absent. Survivors: `kb_documents`, `kb_embeddings`, `kb_sources`, `kb_access_matrix`. |
| kb-* un-parked functions | **NOT deployed** — the handover's CI deploy never landed them; the docintel pipeline superseded them. |
| `kb_embeddings` substrate | **0 rows** — nothing ever ingested here. The live vectors are in `ai_document_embeddings`, not `kb_embeddings`. |
| Folio→RAG wiring `20260707020000` | **Applied this session** (`docex` source_type + `needs_reindex` col/trigger/index; ledger `20260707020000`). But it wires Folio → the **empty `kb_*`** path, which has **no runner** — a *different, older* track than the working docintel pipeline. |

**⚠️ Re-fragmentation risk:** the `kb_*` Folio-wiring (incl. the migration applied this session)
and the live `ai_*`/docintel pipeline are two parallel doc-intel stacks — exactly the
"seven systems" split `01` warned about. **Decide one substrate before building further.** The
evidence says `ai_*`/docintel is the live winner; the `kb_*` path may be redundant.

**Net effect on §8 P0:** P0-2 **closed**. P0-1 **reframed** — functions deploy fine; the docintel
pipeline is live with data, so the real P0 is a **substrate decision** (`ai_*` vs `kb_*`), not a
deploy fix. P0-4 (no permission scoping) is **true only for the dead `kb_*` path** — the live
`ai_*` pipeline is already project-scoped with RLS.

## Target, in one line

```
Catalyst source data
  → Knowledge Sync Engine          (background ingestion, change-driven)
  → OCR / Vision / Parser          (documents, images, tables → text)
  → Knowledge Compiler             (normalize into OKF nodes/edges)
  → Open Knowledge Format (OKF)    (generated, versioned, permission-aware, citation-backed projection)
  → Validation                     (fidelity + coverage + citation gates)
  → Permission-aware hybrid retrieval   (vector + keyword, filtered by caller's roles)
  → Knowledge Graph                (typed edges across all OKF node types)
  → Knowledge Health Dashboard     (freshness, failures, stale items, coverage)
  → Qwen-powered Knowledge Agent   (provider-abstracted; master + specialist agents)
  → Governed artifact generation   (epics/stories/summaries/BRDs, citation-backed, logged)
```

Catalyst's Postgres/Supabase DB stays the **source of truth**. OKF is a *projection* of it.

---

## 1. What existing Doc Intel / RAG assets should be reused

The audit proves a **schema-complete, code-complete RAG stack already exists** — it was
parked, not missing. Reuse it; do not greenfield.

| Asset | Location (per audit) | Role in the Reservoir |
|---|---|---|
| pgvector store + ivfflat cosine index | `kb_embeddings.embedding vector(1536)`, `idx_kb_embeddings_vector` (`04_database.md`) | The vector substrate under OKF chunk retrieval |
| Hybrid retrieval RPC | `kb_hybrid_search()` (RRF fusion of cosine + `ts_rank_cd` FTS), `kb_match_embeddings()` (`05`) | Permission-aware hybrid retrieval, once a permission filter is added |
| Chunking + dedup | `kb-ingest` `chunkText(500w/50 overlap)` + SHA-256 `content_hash` (`03_data_flow.md` Path B) | Knowledge Compiler's chunk stage |
| Reranking + citations | `kb-query` LLM-judge rerank (top 30→6) + `[SOURCE-N]` tagging (`05`) | Citation-backed retrieval; the anti-hallucination contract |
| Query telemetry | `kb_query_log` (`retrieved_chunk_ids`, `reranked_scores`, `confidence_score`, `hallucination_flag`) (`04`) | Validation + Health signals |
| Multimodal extraction | `docex-import` — Gemini native multimodal PDF read + Arabic→English translation → typed blocks (`05`, `07/08` in intent ledger) | OCR/Vision/Parser stage (already live) |
| Folio→RAG wiring (this session) | `20260707020000_docex_rag_wiring.sql`: `'docex'` source_type, `needs_reindex` dirty flag + trigger, `ingest_folio_batch` action | **First working slice of the Sync Engine** — generalize it |
| Folio content model | `kb_documents` (BlockNote JSON, `search_vector`, `doc_key`, tree `parent_id`), `kb_doc_spaces` (`04`) | A primary OKF source object type (documents/sections) |
| Existing generators | `ai-generate-epics` / `ai-generate-stories` / `ai-generate-test-artefacts` / `ai-generate-workflow` (`05`, intent ledger §3) | Artifact-generation agents — add retrieval-context injection, do not rewrite |
| Intent-to-JSON pattern | `folio-ai-search` / `ai-search-issues` (NL → strict filter JSON) (`02`, `06`) | Template for the master agent's intent resolver |
| Governance logging | `ai_usage_log` (per memory `ai-usage-log-governance-fix`) | Governed generation audit trail |

**Do not reuse as-is:** `caty-chat` (zero retrieval), Knowledge Hub UI (orphaned dead code,
`06` §4), `kb_document_restrictions` (decorative, non-enforcing, `06` §5).

---

## 2. What is missing for OKF

OKF today does not exist as a concept in the repo. What is missing:

1. **A projection schema.** No `okf_nodes` / `okf_edges` (or equivalent) representation exists.
   Needs: node table keyed by `{entity_type, entity_id}` with `content_version`,
   `source_version`, `permission_scope`, `citation` (source anchor), and a link to its
   embedding chunk(s); an edge table for typed relationships (see §5).
2. **Coverage across all required node types.** Audit + intent ledger only touch documents and
   a few delivery objects. OKF must project **documents, document sections, images, tables,
   work items, BRs, epics, features, stories, releases, changes, tests, defects, incidents,
   comments, approvals, workflows, business rules, APIs, database tables, users, roles,
   permissions** (see 08). Only "documents" is even partially wired today.
3. **`source_type` breadth.** `kb_embeddings.source_type` CHECK is `ministry|jira|catalyst|brd|
   internal` (+ `docex` added this session) (`03`). Every new node type needs a projection
   route; the enum/CHECK must not silently reject them.
4. **Versioning at node granularity.** `kb_document_versions` versions Folio pages, not OKF
   projections (`05`). OKF needs its own `source_version → projection_version` stamping so
   staleness is a first-class, queryable property.
5. **Permission scope carried on the node.** Retrieval today has no permission filter at all
   (`kb_embeddings` SELECT is `true` or unresolved — `06` Conflict 1). OKF must persist the
   caller-independent access constraints of each source so retrieval can filter (see §… below).
6. **Citation anchors for non-document objects.** `[SOURCE-N]` maps to `source_url` for scraped
   text (`05`). Work items/releases/etc. need structured citations (`{entity_type, entity_id,
   field, version}`), not URLs.

---

## 3. What is missing for the Knowledge Sync Engine

Today: **no cron targets any kb/Folio table** (`04` — the only crons are lifecycle/release/
date-pulse). The Folio dirty-flag trigger + 15-min cron from this session is the *only*
change-driven ingestion, and per the deploy handover it has **not actually reached staging**
(dead `SUPABASE_ACCESS_TOKEN`). Missing:

1. **A generalized change-capture mechanism** across all OKF source object types — the
   `needs_reindex` trigger pattern exists for `kb_documents` only; it must be replicated (or
   centralized) for work items, releases, incidents, etc.
2. **A compile queue + worker** — a durable job table (`okf_sync_jobs`) with states
   `pending → extracting → compiling → embedding → validating → ready | failed`, ret/backoff,
   and per-object idempotency (reuse SHA-256 content-hash dedup).
3. **Scheduling infra actually deployed.** `pg_cron`/`pg_net` extensions exist (`04`) but the
   cron migration (`20260707020100_docex_rag_cron.sql`) is manual-apply and unapplied; the
   deploy pipeline itself is broken (handover §2). Health of the engine depends on this landing.
4. **Freshness accounting** — per-object `last_source_change_at` vs `last_projected_at` so
   stale items are detectable (feeds §4).
5. **Failure capture** — structured failure rows (which object, which stage, error) rather than
   silent `{data}`-only swallow (a repo-wide anti-pattern per memory `silent-query-error-sweep`).
6. **Backfill path** — a one-time projection of existing rows, separate from the on-change path.

*Naming note:* this is the "sync engine" in the Google/Apple background-sync sense, **not**
browser offline cache. The retracted `08` "offline sync" framing does not apply.

---

## 4. What is missing for knowledge health

Today: `KBDataAudit.tsx` (6 sections) and `RAGAuditPage.tsx` (24 checks) audit **only the
parked pipeline** — `kb_embeddings`/`kb_cache`/`kb_query_log`/`kb_training_questions`/
`brd_documents`. **Zero checks cover live Folio content, versions, or any other object type**
(`06` §11). Missing:

1. **A Knowledge Health Dashboard surface** (own route) showing, per OKF object type:
   **freshness** (median source-to-projection lag), **failures** (open `okf_sync_jobs` in
   `failed`), **stale items** (source changed, not yet recompiled), **coverage** (% of rows of
   that type projected into OKF).
2. **Coverage metric definition + query** — none exists; needs a per-type `projected / total`.
3. **Fidelity score surfacing** — the intent ledger's R6 fidelity gate (flash-lite back-check of
   translated blocks) has no storage or display today.
4. **Citation-integrity check** — verify every OKF node resolves to a live source row (catch
   dangling projections after source deletion; note storage-orphaning gap `06` §9).
5. **Zero-assumption rendering** — unknowns render as dash/empty, never a fabricated default
   (CLAUDE.md ZERO-ASSUMPTION rule).

---

## 5. What is missing for the knowledge graph

Audit verdict: **"Graph / Knowledge Graph search — Not found"**; no graph structure or
traversal query anywhere (`05`, `06`). Everything is missing, but it need not be a new graph DB:

1. **An edge model** — `okf_edges (src_node, dst_node, edge_type, source_version)` in Postgres
   is sufficient (relational approximation + recursive CTE traversal). No new datastore needed.
2. **Edge extraction** — derive typed edges from existing FKs/links that already exist in
   Catalyst: `kb_document_links` (page↔work-item, 9 types), `kb_page_links` (page↔page),
   release→change, incident→defect, story→epic, approval→object, etc. The relationships exist
   as rows; they are just not projected as graph edges.
3. **Traversal + permission-aware graph retrieval** — walk the graph filtered by the caller's
   permissions (a node the caller cannot see must not appear in a path).
4. **Graph-aware retrieval fusion** — combine vector hits with graph-neighborhood expansion
   (e.g. "answer about a release, pull in its linked changes/incidents").

---

## 6. What is missing for a Qwen provider abstraction

Today every AI function calls Gemini/Anthropic/Groq/OpenAI **directly via `fetch`** with no
provider indirection (`02` §2.1). The intent ledger even pins Gemini (R16). Adding Qwen as the
Knowledge Agent runtime requires:

1. **A provider-abstraction layer** — one interface (`generate`, `embed`, `stream`, `toolCall`)
   with pluggable backends (Gemini, Anthropic, **Qwen**), selected by config/env, so the agent
   is not hard-wired to one vendor.
2. **A Qwen adapter** — endpoint, auth (new secret), request/response mapping, streaming
   (SSE/token) mapping, and tool-call/JSON-mode mapping to Qwen's format.
3. **Embedding-dimension reconciliation** — `kb_embeddings` is fixed at **1536** (`04`). Qwen
   embedding output dim must match, or the column/pipeline needs a dimension strategy
   (separate column per model, or projection). **Do not mix dims in one vector column.**
4. **Governance parity** — Qwen calls logged to `ai_usage_log` like every other lane.
5. **Capability gating** — decide which stages Qwen owns (agent reasoning/generation) vs which
   stay on Gemini native multimodal (OCR/Vision — Qwen may not match `docex-import`'s inline-PDF
   read). Provider choice is per-stage, not global.

---

## 7. What is missing for artifact generation

Generators exist (`ai-generate-epics/stories/...`) but the audit found them **"Unverified —
no evidence of document/RAG grounding"** (`05`). Missing:

1. **Retrieval-context injection** — feed permission-aware OKF retrieval results (with
   citations) into the existing generator prompts. Grounded-only generation (intent ledger R6,
   R19): no output without cited source.
2. **Master orchestrator agent** — intent resolution (folio-ai-search JSON pattern) → route to
   Epic / Story / Summary / BRD specialists; handle ambiguity by asking one clarifying question,
   never guessing (R14, R15).
3. **Streaming** — token-by-token output to the UI (R8); current generators are request/response.
4. **Citation-carrying outputs** — each generated artifact carries doc+page / entity citations
   (R18, the differentiator + anti-hallucination hook).
5. **Governed output** — write into Catalyst domain objects / Folio BRD template
   (`template_keys:"brd"`), not chat blobs (R13, R19); log to `ai_usage_log`.
6. **Own frontend surface** — a Catalyst-native route (R17), not a bolt-on.

---

## 8. P0 / P1 / P2 gap list

**P0 — blocks everything; mostly verification + unblocking (do first, cheap):**
- P0-1 **SUBSTRATE DECISION (§0)** — the deploy is not the blocker; there are **two live doc-intel
  stacks** and building further on both re-creates the "seven systems" split. Pick one:
  the **working `ai_*`/docintel pipeline** (365 embeddings, 78 citations, permission-scoped) vs
  the **empty `kb_*` path** (0 rows, no runner, extended by this session's `docex_rag_wiring`).
  Evidence favors `ai_*`/docintel. Everything else P0 depends on this call.
- P0-2 ~~Resolve the two live-schema evidence conflicts~~ **CLOSED (§0)** — `kb_embeddings` has
  RLS + 3 policies; the five `kb_*` tables were confirmed dropped. No open conflict remains.
- P0-3 Confirm the OKF projection schema decision. **Re-scoped (§0):** `ai_*`/docintel is
  effectively an OKF for the document+requirement slice **and it already exists with data** — so
  this is less "greenfield vs `kb_*`" and more "**extend `ai_*` to the remaining OKF node types**
  (work items, releases, incidents, …) vs start a parallel family." Blast-radius check applies to
  whichever is chosen.
- P0-4 Permission model for retrieval — **split by path (§0)**: the dead `kb_*` path is unscoped
  (`SELECT true`, 0 rows), but the **live `ai_*` pipeline is already project-scoped with RLS**.
  So P0-4 is *solved on the substrate that matters* and only reappears if `kb_*` is chosen.

**P1 — the core Reservoir spine:**
- P1-1 OKF node/edge schema + versioning + citation anchors (§2).
- P1-2 Generalized Knowledge Sync Engine: change-capture + job queue + worker (§3).
- P1-3 Permission-aware hybrid retrieval (add role/permission filter to `kb_hybrid_search`) (§1,§2).
- P1-4 Knowledge Health Dashboard (freshness/failures/stale/coverage) (§4).
- P1-5 Master + specialist agents with retrieval grounding + streaming + citations (§7).

**P2 — depth / differentiation (after spine works):**
- P2-1 Knowledge Graph edges + permission-aware traversal + graph-fusion retrieval (§5).
- P2-2 Qwen provider abstraction + adapter + per-stage gating (§6).
- P2-3 Fidelity scoring + citation-integrity checks surfaced in Health (§4).
- P2-4 Full OKF coverage across all remaining object types (workflows, business rules, APIs,
  db tables, users/roles/permissions) (§2).
- P2-5 Cleanup debts that undercut trust: `kb_document_restrictions` (enforce or remove),
  `kb_doc_spaces` open RLS, unbounded `kb_document_versions`, storage orphaning, stale
  `usage-map.generated.ts` (`06` §5–§13).

---

## 9. Implementation phases

Each phase = one reviewable slice, ≤2h per CLAUDE.md, Plan Lock before code.

- **Phase 0 — Unblock & verify (P0).** Fix deploy secret; live-schema check; decide `kb_*` vs
  `okf_*`; agree permission model. Output: a settled schema + permission decision. *No new code
  beyond migrations that were already authored this session.*
- **Phase 1 — OKF spine for documents.** OKF node/edge schema + versioning + citations, projecting
  the one object type already wired (Folio/docex). Backfill + on-change via the existing trigger.
- **Phase 2 — Knowledge Sync Engine generalized.** Job queue + worker + change-capture for the
  next 2–3 high-value object types (work items, BRs, releases). Freshness/failure accounting.
- **Phase 3 — Permission-aware retrieval.** Add permission filter to hybrid retrieval; prove a
  caller only retrieves what they may see.
- **Phase 4 — Knowledge Health Dashboard.** Own route; freshness/failures/stale/coverage per type.
- **Phase 5 — Agent layer.** Master orchestrator + Epic/Story/Summary/BRD specialists, grounded,
  streamed, cited, logged; own frontend surface.
- **Phase 6 — Knowledge Graph.** Edge projection from existing links; permission-aware traversal;
  graph-fusion retrieval.
- **Phase 7 — Qwen abstraction.** Provider interface + Qwen adapter + per-stage gating +
  embedding-dim strategy.
- **Phase 8 — Coverage + cleanup.** Remaining OKF object types; retire decorative/insecure debts.

---

## 10. Acceptance criteria

Binary, evidence-backed (DOM/DB/API probes, not screenshots alone):

1. **Substrate chosen + live** — one doc-intel stack is designated canonical (§0). On the
   evidence, the `ai_*`/docintel pipeline **already meets this**: ingested docs → 365
   `ai_document_embeddings` (1536-dim, project-scoped) → `docintel_hybrid_search` → 2
   citation-backed artifacts (78 `ai_artifact_citations`). Acceptance = a documented decision
   that `ai_*`/docintel is canonical (or a justified case for `kb_*`), **not** a second deploy.
   *(P0-1)*
2. **OKF projects a document** — a Folio page edit produces a versioned OKF node with a
   resolvable citation back to `{kb_documents.id, version}`; recompiled on change. *(Phase 1)*
3. **Sync freshness observable** — a source change flips the object to `stale`, then to `ready`
   after the worker runs; `last_source_change_at`/`last_projected_at` prove the lag. *(Phase 2)*
4. **Permission-aware retrieval** — user A retrieves a chunk from a doc A owns; user B, lacking
   permission, retrieves **zero** rows from it (live, not client-filtered). *(Phase 3)*
5. **Health dashboard truthful** — freshness/failures/stale/coverage numbers reconcile against
   direct DB counts; unknowns render as dash, never a fabricated default. *(Phase 4)*
6. **Grounded generation** — the master agent resolves intent, routes to a specialist, streams
   output, and every claim carries a citation to an OKF node; ambiguous input yields one
   clarifying question, not a guess; call logged to `ai_usage_log`. *(Phase 5)*
7. **Graph traversal** — a query about a release returns its linked changes/incidents via graph
   edges, filtered by the caller's permissions. *(Phase 6)*
8. **Provider swap** — the Knowledge Agent runs on Qwen via config with no code change to
   callers; embedding dims reconcile with the vector column. *(Phase 7)*
9. **No lies, no leaks** — `kb_document_restrictions`/`kb_doc_spaces` no longer imply access
   they don't enforce; retrieval respects real permissions end to end. *(Phase 8 + P0-4)*

---

### Scope guard

OKF is a **projection**, never a second source of truth. The Catalyst DB remains authoritative.
Every OKF node and every generated artifact is citation-backed or it does not ship. Unknown
content renders as unknown. These three invariants override any convenience shortcut taken in
implementation.
