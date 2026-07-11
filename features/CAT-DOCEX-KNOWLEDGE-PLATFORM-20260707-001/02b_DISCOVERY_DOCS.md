# Discovery Lane D — Docs digest (2026-07-07)

## Ground truth hierarchy
1. Memory `docintel-reservoir-live.md` (2026-07-07) — most current, corrects doc 09 §0.
2. `docs/doc-intel-audit/09_knowledge_reservoir_target_architecture.md` — target architecture,
   9 phases, 9 binary AC, P0/P1/P2 gaps. §0 claim "docintel schema missing" is STALE (real prefix ai_*).
3. `docs/doc-intel-audit/08_okf_and_offline_sync_options.md` — OKF = Open Knowledge Format:
   generated, versioned, permission-aware, citation-backed PROJECTION of Catalyst objects.
   Postgres sole source of truth. "Offline sync" retired → Knowledge Synchronization Engine.
4. `docs/doc-intel-audit/01–07` — forensic audit of OLD kb_* world (7-8 fragmented systems,
   parked RAG never deployed). Historical context; kb_* DEPRECATED by Vikram decision 2026-07-07.

## Canonical substrate (DECIDED)
ai_*/docintel_* family + docintel-ingest/analyze/generate edge fns + /doc-intelligence/* frontend
(src/modules/docintel/: ProcessingStatusBoard, GenerationPanel, TraceabilityMatrix,
FactsReviewPanel, DocintelHealthPage). Embedding INLINE in docintel-analyze (runEmbedStage,
EdgeRuntime.waitUntil). kb-* functions + 20260707020000_docex_rag_wiring.sql = deprecated landmines,
do not build on.

## Adjacent tracks (do not collide)
- CAT-DOCEX-DB-COEDIT-20260705-001: Folio editor quality + databases + Yjs co-edit. OWNS the
  dirty working-tree files (DatabaseSurface.tsx, useDocexDatabase.ts). Remaining C4,C5,D3–D7,Q3/Q4.
- 13_VIKRAM_UX_FEEDBACK_20260706: RTL everywhere = hard requirement; Word/PDF import; realtime
  Gemini AR→EN; page→epic/BR conversion.
- CAT-DOCS-NOTION-20260704-001: BlockNote FREE core only; kb_* absent from generated types trap.

## Documented gap list (deduped)
1. OKF beyond documents — no okf_nodes/okf_edges; work items/BRs/releases/tests/etc unprojected
2. Knowledge Sync Engine — no change capture, no durable queue, no cron, no freshness accounting
3. Knowledge Graph — no edge model / traversal / graph-fusion retrieval
4. Provider abstraction (Qwen-capable) — fns call vendors direct via fetch
5. Streaming generation (R8/A8: first token <3s)
6. Word/Excel/image/mixed-language inputs into docintel pipeline (docex-import PDF-only;
   DOCX only client-side mammoth into Folio)
7. OCR scanned-PDF vision path UNEXERCISED
8. Compilation depth: entity resolution, relationship discovery, conflict detection, lineage
9. Arabic Q&A + side-by-side evidence + RTL
10. Org-level health: coverage, knowledge debt, sync status (project-level rollup SHIPPED 2c40160dc)
11. Security debts: kb_document_restrictions decorative, kb_doc_spaces USING(true), export
    control + approval workflow missing
12. Cleanup: unparked kb-* fns, orphaned Knowledge Hub code, stale usage-map.generated.ts

## Do-not-redo (already resolved/shipped)
- kb RLS conflicts settled; ai_* prefix correction; project health rollup (2c40160dc);
  citations/grounding contract working (78 live citations).
