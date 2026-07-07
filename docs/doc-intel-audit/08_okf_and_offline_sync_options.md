# 08 — OKF and the Knowledge Synchronization Engine: Corrected Terms

> **CORRECTION — 2026-07-07.** An earlier version of this file guessed at two undefined
> terms and defaulted both to the smallest possible reading. Both defaults were wrong and
> are retracted here. The corrected meanings below are authoritative. The full target
> architecture that follows from them is in
> [`09_knowledge_reservoir_target_architecture.md`](09_knowledge_reservoir_target_architecture.md).
>
> What changed:
> - **OKF** = **Open Knowledge Format** — a generated, versioned, permission-aware,
>   citation-backed *projection* of Catalyst objects. **Not** "Organizational Knowledge
>   Framework," and **not** the existing `kb_sources` / `kb_access_matrix` access layer.
>   Those tables may *support* access governance, but they are **not** OKF and OKF must not
>   be reduced to them.
> - **"Offline knowledge sync"** is retired as a framing. The real target is a
>   **Knowledge Synchronization Engine** — background ingestion and compilation of Catalyst
>   source data into OKF, with visible health, freshness, failures, stale items, and OKF
>   coverage. It is **not** a browser offline cache and has nothing to do with `public/sw.js`.

---

## OKF — Open Knowledge Format (corrected)

**OKF is a generated, versioned, permission-aware, citation-backed projection of Catalyst
objects into a single open knowledge representation.** It is not a new source of truth and
it is not an access-control table.

- **Catalyst's Postgres/Supabase database remains the sole source of truth.** OKF never
  replaces it. Every OKF node is derived *from* a Catalyst row (or a document/section/image
  extracted from an uploaded artifact) and carries a citation back to that origin.
- **Generated** — OKF is compiled by the Knowledge Synchronization Engine, not authored by
  hand. When the underlying Catalyst object changes, its OKF projection is recompiled.
- **Versioned** — each OKF node/edge is stamped with a content version and the source
  version it was derived from, so staleness is detectable and history is queryable.
- **Permission-aware** — an OKF projection carries the access constraints of its source, so
  permission-scoped retrieval can filter OKF by the caller's roles/permissions without
  re-deriving them from scratch.
- **Citation-backed** — every OKF node points back to `{entity_type, entity_id, source
  version, and — for documents — page/section/block anchors}`. This is the anti-hallucination
  contract: nothing enters OKF (or any artifact generated from it) without a resolvable
  source pointer.

### What OKF must represent

OKF is **not** limited to uploaded documents. It must project the full Catalyst knowledge
surface. The required node types are:

| Group | OKF node types |
|---|---|
| **Document intelligence** | documents, document sections, images (image-derived text), tables |
| **Delivery objects** | work items, business requests (BRs), epics, features, stories, releases, changes, tests, defects, incidents |
| **Collaboration** | comments, approvals |
| **Process / rules** | workflows, business rules |
| **System surface** | APIs, database tables |
| **Identity / access** | users, roles, permissions |

Each node type is a first-class citizen of the projection. The point of OKF is that a single
retrieval/graph layer can span "what does BRD-42 say" **and** "which release closed incident
INC-9" **and** "who can approve this change" — because documents, delivery objects, process,
and identity are all projected into one representation with consistent citations and
permission scoping.

### Why the old default (`kb_sources` / `kb_access_matrix`) was wrong

`kb_sources` is a crawl/source registry; `kb_access_matrix` is a role × module read/write
flag table. Both are narrow support tables for the parked RAG pipeline. Neither *represents
Catalyst objects as knowledge*, neither is versioned per node, neither carries per-node
citations, and neither spans the node types above. Treating OKF as "the existing access
layer" collapses a projection system into two config tables and loses the entire point.
That reading is retracted.

---

## Knowledge Synchronization Engine (corrected — replaces "offline knowledge sync")

The target is a **background compilation service**, in the spirit of how Google/Apple keep
a device's view of a large backend continuously fresh — **not** a browser offline cache.

- **What it does:** continuously (and on-change) ingest Catalyst source data → run it through
  OCR/Vision/parse where needed → compile it into OKF nodes/edges → validate → keep the
  projection fresh.
- **What it exposes:** a **Knowledge Health** surface showing freshness (how current each
  projection is vs its source), failures (what failed to compile and why), stale items (source
  changed, OKF not yet recompiled), and **OKF coverage** (what fraction of each Catalyst
  object type is projected).
- **What it is NOT:** it is not `public/sw.js`, not IndexedDB read-caching of Folio pages,
  not cross-device edit sync, and not an offline-first editing model. The earlier "offline
  sync" options table (read cache / cross-device / external-system / defer) described a
  different problem and is retracted. `sw.js`'s documented invariant ("user data never hits
  the SW cache") is irrelevant to this engine and is not touched by it.

The engine's design, the pieces that already exist to build it on, and the gaps are in
[`09_knowledge_reservoir_target_architecture.md`](09_knowledge_reservoir_target_architecture.md)
(§3 Knowledge Sync Engine, §4 Knowledge Health).

---

## Relationship to the RAG-consolidation work already done

> **SUPERSEDED — 2026-07-07.** Live probing (see 09 §0) shows the Knowledge Reservoir is
> **already built and running** as the `ai_*` / `docintel_*` family (365 embeddings,
> citation-backed artifacts, permission-scoped). **Decision: `ai_*`/docintel is the canonical
> substrate.** The `kb_*` RAG-consolidation track below (un-parked functions + the
> `docex_rag_wiring` Folio→`kb_*` migration) is **parked/deprecated** — kept for history, not
> to build on. The two bullets below describe the *old* plan and no longer reflect the target.

- ~~Un-parked `kb-ingest`/`kb-query`/`kb-sync` + pgvector + `kb_hybrid_search` = the retrieval
  substrate the Reservoir builds on.~~ → **Replaced** by `docintel_hybrid_search` over
  `ai_document_embeddings`. The `kb_*` functions were never even deployed to staging.
- ~~The `20260707020000_docex_rag_wiring.sql` Folio→RAG wiring is the first slice of the
  Sync Engine.~~ → **Parked.** It was applied to staging (additive, harmless) but wires Folio
  into the **empty `kb_*`** path that has no runner; the live sync path is `docintel-ingest`.

Canonical substrate + full corrected scope (OKF projection, Sync Engine, health, graph, agent)
are in 09.
