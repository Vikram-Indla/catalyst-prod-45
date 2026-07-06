# Canonical Discovery — CAT-DOCS-NOTION-20260704-001

Six parallel agent lanes ran 2026-07-04 (shared with CAT-VOICE-FLOW-20260704-001). Distilled facts below.

## HEADLINE: a Confluence clone already exists (Knowledge Hub, flag ON)

**Schema (`kb_*`, live):**
- `kb_doc_spaces` — space per project (`project_id NOT NULL`)
- `kb_documents` — `space_id`, `title`, `content` (ADF JSON string in a JSONB/text column), `content_text`, **`parent_id` hierarchy already exists**, `linked_work_item_id TEXT` + `linked_work_item_type` (single link, CHECK epic/feature/story/subtask/bug/business_request, no FK), generated `search_vector` (GIN)
- Satellites already built: `kb_document_versions` (auto-version trigger on content change), `kb_document_attachments`, `kb_document_comments` (threaded + resolved flag), `kb_document_labels`, `kb_document_page_properties`, `kb_document_restrictions` (advisory only — NOT RLS-enforced), `kb_document_watchers`, `kb_document_favorites`, `kb_document_jira_issues`, `kb_audit_log`

**UI (live):** `src/pages/KnowledgeHubPage.tsx`, `KnowledgeHubSpacePage.tsx`, `KnowledgeHubDocumentPage.tsx`; `src/components/knowledge-hub/` — `editor/ConfluenceEditor.tsx`, Create dialogs, `DocumentTemplates.tsx`, `DocumentVersionHistory.tsx`, `DocumentComments.tsx`, `DocumentAttachments.tsx` (bucket `'attachments'`), Labels/Restrictions/Watchers/Favorite/Export; hook `useKnowledgeHubDocuments.ts` (queries by `linked_work_item_id`).

**Editor (verified in file header):** `ConfluenceEditor.tsx` was **rewritten 2026-04-20 from TipTap to `@atlaskit/editor-core` + `@atlaskit/renderer`** with the product directive: *"Atlaskit is the single canonical rich-text surface; every editor in the app must route through it."* Content contract: ADF in (coerced via `parseStoredDescriptionToAdf`), ADF JSON string out. Panels/expands replace old TipTap macros.

**Routing:** `/knowledge-hub`, `/knowledge-hub/spaces/:spaceId`, `/knowledge-hub/documents/:documentId` (`FullAppRoutes.tsx:905-907`) — **UUID params; violates slug contract**. `routes.ts:204-210` already declares slug-based `knowledgeHubRoutes` builders (aspirational — kb tables have NO slug columns). Flag `ENABLE_KNOWLEDGE_HUB` defaults ON (`featureFlags.ts:10`).

**Gaps in current Knowledge Hub UI:** no page-tree rendering at all (space page is flat), no position ordering column, no page icon/cover, no templates-create flow polish, no work-item detail integration ("Pages" section), single work-item link only.

## Adjacent/dormant doc systems (do NOT build on)
- `wiki_*` (~25 tables) + `src/modules-dormant/wiki/` — HubSwitcher entry `deprecated: true`; `wiki` HubKey + icons exist in `icons.registry.ts` (reusable for a Docs hub identity).
- `brd_documents`, `prd_documents`, `ra_documents`, `efd_documents`, `ai_assist_documents` — special-purpose silos.

## Work-item model & linking patterns (Lane 3)
- Entities: `epics` (epic_key), `stories` (story_key), `catalyst_issues` (project-scoped issue_key), `planner_tasks` (PLN-N), `defects`, `incidents` (has polymorphic converted_to_type/id precedent), `th_test_cases`, `risks`, `ph_ideas`.
- **Polymorphic conventions already canonical:** universal `attachments` (`entity_id` + `entity_type`) and universal `comments` (`entity_id` + `entity_type`, consumed by `useWorkItemComments`); entity-type vocabulary canonicalized in `catalyst_notify_trigger()` (test_case, issue, story, epic, defect, incident, release, idea + hub_source).
- `work_item_links` polymorphic link table precedent (from/to type+id, link_type).

## Slug infrastructure to retrofit (Lane 3)
Canonical batch example `20260701000007_boards_slugs.sql`: per-table `generate_slug()` BEFORE INSERT trigger + `catalyst_slugify` + dedupe + UNIQUE index + frozen-slug comment. Hook shape: `useBoardBySlug.ts` (dual-mode slug-or-UUID). Legacy URL handling: `UuidToSlugRedirect` outside CatalystShell.

## Shell/navigation integration points (Lane 4)
- Hub registration: `HubSwitcher.tsx` `HUBS` array (key/label/href/section/tone/shortcut/moduleKey), `icons.registry.ts` `HubKey` union + `HUB_ICON_REGISTRY` (`wiki` key exists), `CatalystShell.tsx` sidebar switch (~:691) + route-prefix detection, `SidebarBase.tsx` config-driven sidebar (WikiSidebar is the closest precedent), `useHubShortcuts.ts`.
- **No tree component exists** (no `@atlaskit/tree`); `@atlaskit/side-navigation` + `pragmatic-drag-and-drop` (+auto-scroll/hitbox/drop-indicator) ARE installed → page tree = net-new canonical component from ADS primitives.
- Work-item detail surface: `catalyst-detail-views/shared/CatalystViewBase.tsx` — sectioned scroll (no tabs); new "Pages" section slots into `shared/sections/` like `CatalystAttachmentsPanel.tsx`.

## Editor stack facts (Lanes 1/4/6)
- Tiptap v3 full suite installed (tables, task lists, images...) — canonical `Description/RichTextEditor.tsx` has slash menu, mentions, emoji, drag handle, image pipeline.
- Atlaskit editor-core ^217 + editor-plugins + renderer + adf-schema installed; EpicDescriptionEditor shows full-page-grade ADF editing w/ drag-handle reordering, mentions, image→Supabase media.
- **ProseMirror dual-load constraint**: Tiptap and Atlaskit cannot both load eagerly on one page (`AtlaskitEditor.tsx:1-14`); Atlaskit is lazy-loaded via `atlaskitPrefetch`.
- `y-protocols`/`y-websocket` in package.json but **no yjs core, no imports** — collab is aspirational, nothing wired.

## Notion teardown — the 20% that makes it "feel like Notion" for BRD/spec writing (Lane 6)
1. Slash menu (fuzzy) 2. Markdown shortcuts 3. Core blocks: H1–H3, lists (todo/toggle), callout, quote, code w/ language, table, image, divider 4. Drag handle (reorder + turn-into) 5. @-mentions: people/pages/dates **with auto-backlinks** 6. Page tree in sidebar + breadcrumbs 7. Page icon/cover/title 8. Inline comments 9. Templates.
NOT needed v1: synced blocks, databases-in-page, columns, toggle-headings, embed gallery.
**ADF equivalence check:** Atlaskit quick-insert `/` menu ≈ slash menu; `expand` ≈ toggle; `panel` ≈ callout; tables/code/quote/media native; drag handles present in editor-core ^217; mentions via `CatalystMentionResource`. Weakest vs Notion: gesture polish, page chrome (ours to build regardless), markdown input-rule coverage.

## Confluence model to replicate (Lane 6)
Space → page tree (unlimited depth, ordered siblings, drag reparent). Key magic: embedding/mentioning a Jira issue in a page **auto-creates the reciprocal link** on the issue ("mentioned in") — bidirectional, zero ceremony. Replicate via `link_origin: 'manual' | 'mention'` rows written on work-item mention.

## Editor library market scan (Lane 6, cited in transcript)
- **BlockNote** (MPL-2.0 core): best Notion-likeness OOTB (slash/drag/nesting), Yjs-first, block-JSON; pre-1.0 churn; xl-* export/columns are GPL/paid.
- TipTap Notion template: paid ($49/mo+ + Tiptap Cloud JWT) — rejected.
- Plate Plus: paid templates — rejected. Lexical: DIY Notion layer — rejected. Novel/Yoopta: maintenance risk — rejected.
- @atlaskit/editor-core as generic "Notion clone" base for NON-Atlassian-style docs: rejected by Lane 6 on licensing-intent/coupling grounds — **but Catalyst already ships it as its canonical editor with a standing directive**, which changes the calculus (see 09_DECISIONS D1).
- Storage: single JSONB doc per page (Notion's block-per-row explicitly rejected as Notion-scale machinery); autosave debounce + optimistic `version` int; append-only versions table (already exists as `kb_document_versions`). y-supabase NOT production-ready; Phase-2 collab = presence soft-lock first.
