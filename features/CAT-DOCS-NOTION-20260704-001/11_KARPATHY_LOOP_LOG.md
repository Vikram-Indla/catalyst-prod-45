# Karpathy Loop Log — CAT-DOCS-NOTION-20260704-001

## Loop 1 — "Notion clone is greenfield"
- **Hypothesis:** Catalyst has no document system; plan schema + hub from scratch.
- **Experiment:** Lane 3 migration sweep + Lane 4 component sweep.
- **Measure:** `kb_*` family found: spaces, documents WITH parent_id hierarchy, auto-versioning, threaded comments, attachments, labels, restrictions, watchers, favorites, tsvector search, templates component, Confluence-grade editor — live, flag ON. Separate dormant wiki_* (deprecated) and brd_/prd_ silos.
- **Verdict:** DISCARD greenfield. Plan = extend kb_* spine. ~60% of the Confluence layer pre-exists; net-new is tree UI, Notion gestures, slugs, polymorphic links, chrome, hub identity.

## Loop 2 — "BlockNote is the obvious editor" (Lane 6 recommendation vs repo reality)
- **Hypothesis:** Adopt BlockNote (best Notion-likeness OOTB per market scan).
- **Experiment:** Lane 6 market scan vs Lane 1/4 repo evidence + direct read of `ConfluenceEditor.tsx` header.
- **Measure:** Repo carries a standing 2026-04-20 product directive — "Atlaskit is the single canonical rich-text surface" — and the knowledge hub was ALREADY rewritten from TipTap to ADF once. Atlaskit ^217 natively covers most of the Notion-20% (quick-insert ≈ slash menu, expand ≈ toggle, panel ≈ callout, tables/code/media, drag handles, mentions). BlockNote would add a third ProseMirror lineage, split content formats, and reverse a deliberate migration.
- **Verdict:** KEEP Atlaskit as recommendation (D1-A) but make it a USER decision gate with a post-P6 escape hatch to BlockNote — the conflict (directive vs Notion-fidelity ask) is Vikram's to resolve, not ours to silently choose.

## Loop 3 — "Notion's block-per-row storage should be copied"
- **Hypothesis:** Mirror Notion's data model (every block a row).
- **Experiment:** Lane 6 research on Notion's own engineering posts + editor storage best practice.
- **Measure:** Block-per-row exists for Notion-scale collab granularity; costs tree reassembly, ordering maintenance, write amplification. Single JSON doc per page is the documented ProseMirror/Tiptap best practice and matches existing `kb_documents.content` + auto-version trigger exactly.
- **Verdict:** KEEP single-doc storage; versions table already provides history; Yjs later attaches as a bytea column without schema rework.

## Loop 4 — "Work-item attachment needs new invention"
- **Hypothesis:** Page↔work-item linking requires a new design.
- **Experiment:** Lane 3 sweep of linking patterns.
- **Measure:** Three precedents found; the universal polymorphic `entity_type + entity_id` convention (attachments, comments, notify-trigger vocabulary) is canonical and already consumed by shared hooks. kb_documents' current single `linked_work_item_id TEXT` is the outlier.
- **Verdict:** KEEP convention-mirroring `kb_document_links` join table (D4); auto-write rows on @-mention to replicate the Confluence↔Jira bidirectional magic.

## Loop 5 — "Slug routes already exist for knowledge hub"
- **Hypothesis:** `knowledgeHubRoutes` in routes.ts means slugs are done.
- **Experiment:** Lane 3 cross-check builders vs migrations vs FullAppRoutes params.
- **Measure:** Builders are slug-based but kb tables have NO slug columns and live routes take `:spaceId`/`:documentId` UUIDs — an unshipped contract violation.
- **Verdict:** KEEP slug retrofit as P1/P2 (trigger batch per boards precedent + dual-mode hooks + UuidToSlugRedirect).

## Loop 6 — Second-round editor selection (post-Vikram rejection of Atlaskit)
- **Hypothesis:** Given an open package whitelist and a hard "indistinguishable from Notion, not substandard" bar, one package dominates.
- **Experiment:** 3 adversarial research lanes: (a) BlockNote production-readiness deep-dive (issue tracker, adopters, licensing, API), (b) commercial field (Tiptap Notion template, Plate Plus, Liveblocks, CKEditor), (c) wide scan (BlockSuite, Yoopta, Milkdown, ProseKit, Editor.js + editor stacks of Linear/Nuclino/Outline/Coda/Craft/Anytype/ClickUp/Slab + Docmost/novel clones).
- **Measure:** Engine convergence — serious Notion-class products build on ProseMirror. Fidelity: Tiptap template 9/10 but NO tables + subscription-bound license + doc caps; BlockNote ~8.5–9 built-in with government-scale adopters (La Suite Docs, OpenProject, XWiki, Twenty); Plate Potion 8.5 but Slate + bus factor; BlockSuite npm dead 12 months; Yoopta bus factor 1; Milkdown wrong grain.
- **Verdict:** KEEP BlockNote (+Business license for xl-*), Docmost as reimplementation blueprint for gap blocks, guarded by a P0 hardening spike (dedupe/perf/retheme/insertion/ADF-conversion) with Plate Plus as the named fallback. Lane disagreement on BlockNote theming depth (7.5 vs 9) resolved in favor of the deep-dive lane (direct issue-tracker + docs evidence: shadcn/headless/Ariakit modes exist).
