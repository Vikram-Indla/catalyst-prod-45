# PLAN LOCK — CAT-DOCS-NOTION-20260704-001 "Catalyst Wiki" (v3 FINAL DRAFT, awaiting approval)

> Vikram directives 2026-07-04 (binding): mounts on the **Wiki** hub (HubSwitcher `wiki` key, currently deprecated:true at `HubSwitcher.tsx:80`, `/wiki*` routes free); enterprise **project + product workspaces** (no personal spaces); pages linkable from **business request → defect** (subtasks excluded) with automatic global-wiki availability; top-50 Notion features non-negotiable; Arabic translation; 500-user scale; editor must match Notion; packages whitelisted; guardrail breaks whitelisted case-by-case; production-grade, "no crap code".

## Mount decision (repo-verified)
- HubSwitcher: un-deprecate `wiki` entry (`HubSwitcher.tsx:80`, section 'knowledge') → label **Wiki**, tone/icon refreshed, ⌘-digit shortcut.
- Routes: `/wiki` (global home), `/wiki/:workspaceSlug`, `/wiki/:workspaceSlug/:pageSlug` — real slug params, `FullAppRoutes.tsx:807` redirect removed. Legacy `/knowledge-hub/*` UUID URLs → `UuidToSlugRedirect`.
- `src/modules-dormant/wiki/` stays dormant (historical); `wiki_*` tables untouched.
- Existing Knowledge Hub UI pages are absorbed/rebranded into the Wiki hub; `kb_*` schema is the spine.

## Workspace model (enterprise — the Confluence↔Jira analogue)
- `kb_doc_spaces` → **workspaces**: `container_type` `'project' | 'product' | 'organization'` + `container_id`. **Auto-provisioned** on first page (or backfill migration) for every project and product; ONE Organization workspace for cross-cutting docs.
- A page lives in exactly ONE workspace tree (`parent_id` + `position`). Links to work items are references, never copies.
- **Global Wiki home** = aggregation view over all workspaces the user can see: workspace directory, cross-workspace search, recents, favorites, "linked to my work items".
- **Bidirectional magic (Confluence↔Jira parity):** (a) @-mention a work item in a page → `kb_document_links` row auto-created (`link_origin='mention'`) → page appears in that item's "Pages" section; (b) "Attach/Create page" from a work item detail → page created in that project's/product's workspace (chosen parent), pre-linked (`link_origin='manual'`). Entity vocabulary: business_request, epic, feature, story, task, defect, incident, test_case, risk, idea (NOT subtask).

## Editor: BlockNote + gap-closure layer (all research citations in 02/session)
Base: `@blocknote/core`+`@blocknote/react` pinned; **Business license (~$195/mo)** for xl-multi-column + docx/pdf exporters (D6). Headless/shadcn UI mode rethemed to `var(--ds-*)` in ONE theme file. Route-level lazy chunk (ProseMirror lineage discipline per `AtlaskitEditor.tsx:1-14`).
Gap-closure (all additive, no fork — from gap-research punch list):
- **P0a Paste-grade**: custom `pasteHandler` + ~300-line GDocs/Word/Notion HTML normalizer + fixture test matrix.
- **P0b Never-lose-a-keystroke**: Y.Doc + y-indexeddb local persistence; debounced Supabase save of `y_update bytea` + derived `content jsonb` projection (jsonb always derived, never independent). Substrate for presence/collab/track-changes.
- **P0c Multi-block selection**: marquee + shift-select ProseMirror plugin on `_tiptapEditor` (core `MultipleNodeSelection` drag already ships in BlockNote `dragging.ts`).
- **P1 Mentions/chips**: person, work-item, page-link inline specs + backlink extraction server-side → `kb_document_links`/`kb_page_links`.
- **P1 Embeds/bookmarks**: custom blocks, provider table (Docmost-blueprint reimplementation), OG metadata via existing `chat-unfurl`, metadata persisted in props.
- **P1 Callout block** (official custom-block pattern), **toggle** built-in.
- **P2 Suggesting mode**: `@blocknote/prosemirror-suggest-changes` (marks already in core schema); adopt official Yjs-14 track-changes when released (FOSDEM 2026, funded).
- **P2 Large docs**: spellcheck-off threshold + `content-visibility:auto` + subpage-split suggestion at ~1.5k blocks (the Notion server-side pattern). NO true virtualization (documented trap).
- **P3 Touch drag**: drag-drop-touch polyfill + long-press + move up/down menu.
- **RTL/Arabic (binding)**: per-block/`dir=auto` text direction, Arabic typography, RTL verified in spike (xl-multi-column has a known RTL bug — test).
- **Translate**: page/block-level Arabic↔English via existing `ai-translate-field` edge fn, hover CTA per translate-cta pattern.

## Collaboration at 500 users (v1)
Presence (Supabase Realtime channel per page: avatars, "editing now"), soft-lock warning, optimistic `version` guard, y-indexeddb durability, BlockNote comment threads over `kb_document_comments` via REST thread store; live multi-cursor co-editing = Phase 2 (Yjs server: Hocuspocus or Y-Sweet — y-supabase rejected). Sharing: workspace-inherited access (project/product membership RLS) + per-page restrictions (`kb_document_restrictions` ENFORCED in RLS, D5) + share dialog.

## Scale/performance architecture (500 users)
- Reads: page = 1 jsonb fetch; tree = indexed `(space_id, parent_id, position)` recursive CTE, memoized per workspace; global home = paginated views.
- Search: `search_vector` GIN; Arabic → `simple` config + `pg_trgm` fallback (Postgres Arabic stemming is weak — documented); optional embeddings later.
- Writes: debounced 1–2s autosave; version snapshots on interval/manual/pre-restore with pruning policy; `kb_document_links` UNIQUE(document_id, entity_type, entity_id).
- RLS: membership subqueries via `security definer` helper fns (avoid per-row plan cliffs); load-test with seeded 5k pages/50 workspaces before prod.
- Media: existing storage buckets + CDN; image uploads through BlockNote `uploadFile` hook.
- Realtime: one presence channel per open page; fan-out trivial at 500 users.

## Migrations (staging first, ledger discipline)
1. spaces: slug + container_type/container_id + icon (+ auto-provision backfill for all projects/products + Organization)
2. documents: slug (frozen), position, icon, cover_url, is_template/template_key, content_format ('adf'|'blocknote'), ydoc_state bytea nullable
3. `kb_document_links` polymorphic + backfill from `linked_work_item_id/type`
4. `kb_page_links` (page↔page backlinks)
5. RLS tightening + restrictions enforcement
Legacy ADF docs: read-only via AtlaskitRenderer + one-way convert (snapshot first).

## Slices
P0 spike gate (install, lazy chunk, no-PM-dedupe-error, 1.5k-block perf, ADS retheme, RTL/Arabic, dictation insertion, ADF conversion) → P1 migrations → P2 routes/slugs → P3 Wiki hub shell + workspace directory → P4 PageTree canonical (@atlaskit/side-navigation + pragmatic-dnd) → P5 page surface (chrome, autosave, y-indexeddb) → P6 gap-closure P0a/P0c (paste, multi-block) → P7 mentions/chips + backlinks → P8 work-item "Pages" section + attach/create dialog (BR→defect) → P9 embeds/bookmarks + callout → P10 templates (BRD/tech-spec/meeting-notes) + translate CTA → P11 comments + presence + sharing/restrictions → P12 suggesting mode → P13 global home + search + exports (md/html core; docx/pdf via xl) → P14 RLS load-test + validation + screenshot signoff. Each ≤2h; P0 and P14 are hard gates.

## Stop conditions
P0 gate fail → Plate Plus fallback review. ADF-doc regression → RED FLAG. xl-* in repo without license → stop. RTL failure in editor → stop (Arabic is binding). Ledger drift collision → stop.

## Cost
BlockNote Business ~$195/mo; Phase-2 Yjs server (small node or Y-Sweet ~$0–50/mo). No other vendor spend.
