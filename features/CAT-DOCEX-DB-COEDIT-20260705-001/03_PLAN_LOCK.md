# CAT-DOCEX-DB-COEDIT-20260705-001 — Self-critique + Databases with Views + Co-editing

## Context
Vikram tested Docex and rejected it: "nothing is at Notion quality." Demanded (1) a full
self-critique cycle enumerating ALL gaps, (2) Notion-style DATABASES WITH VIEWS, (3)
REAL-TIME CO-EDITING. This plan delivers the critique verdict and the build plan for both
features plus the quality-restoration track the critique mandates.

## PART 1 — SELF-CRITIQUE VERDICT (live-probed + code audit)

### The core finding: the editor's CHROME was never themed — it looks broken, not premium
Live measurements on /docex/_sandbox (signed-in, light mode):
- **P0. Side-menu (+ and ⋮⋮ drag handle) icons are WHITE on transparent in LIGHT mode** —
  computed color rgb(255,255,255): the primary Notion affordance is INVISIBLE on the white
  page. (BlockNote's SideMenu IS enabled and functional — it just can't be seen.)
- **P0. Formatting toolbar has NO elevation** — boxShadow: none, hairline border only; it
  floats transparent-feeling over content (screenshot shows glyphs overlapping page text).
  Notion's selection toolbar is a strongly-shadowed raised panel.
- **P0. Slash/suggestion menu text renders washed-out light gray** (near-illegible in the
  captured screenshots) — same unmapped-token family.
- **P1. Body text is 14px/22.4px** — Notion is 16px/24px with looser block rhythm; 14px
  reads cramped and "enterprise-cheap."
- **P1. Editor has 0 gutter padding** — the hover handles overlap the text column instead
  of living in a dedicated left gutter like Notion.
- **P1. No per-block placeholder** ("Type / for commands" on every empty block) — no
  data-placeholder CSS found.
Root cause (verified): '@blocknote/mantine/style.css' IS imported (WikiEditor.tsx:33), and
the default controllers (side menu, formatting toolbar, table handles, placeholders) DO
render — but blocknote-ads.css overrides the --bn token set INCOMPLETELY: content tokens
mapped, menu/side-menu/tooltip/shadow tokens left broken for light mode (white side-menu
icons, shadowless panels, washed-out menu text). One exhaustive token-bridge pass +
live-probe verification of every affordance fixes the family.

### Full 37-gap register (code audit, merged with live probes)
P0 (credibility): side-menu invisible in light mode · toolbar shadowless/washed ·
slash-menu contrast · per-block placeholder styling · table handles unstyled · link
toolbar unstyled. (Correction to the audit: these render — the failure is THEME, not
unmounted controllers.)
P1 (parity/polish): text+bg color controls · markdown autoformat verify (##/**/> input
rules) · emoji :shortcode: · image resize/caption styling · code-block language picker +
copy button · block spacing rhythm · heading scale (--bn-font-size-*) · max measure +
width toggle · font smoothing · sticky page header · outline/TOC panel · tree inline
rename (dbl-click) · tree right-click context menu (duplicate/move/template) · hover fade
transitions · drop-indicator polish · skeleton fade · empty-state hierarchy · workspace
card covers.
P2: favorite ★ raw char → Atlaskit icon · proper emoji picker (page icon + callout) ·
dark-mode --bn/--mantine full audit · editor-load skeleton copy · page-nav remount cost ·
"Saving…/Saved" indicator.
Deliberate/licensing gaps (documented, not defects): multi-column layout & synced blocks
(BlockNote xl/GPL or custom — awaiting the Business-license decision), inline math (custom
block, backlog).

### Honest standing verdict
Functional plumbing is real (persistence, search, versions, mentions — live-verified), but
visual/interaction fidelity is ~40% of Notion: invisible affordances, flat popovers,
cramped type, no placeholders, no TOC, no image resize, no code-block affordances, and the
two structural pillars (databases+views, co-editing) absent. Vikram's rejection is upheld.

## PART 2 — TRACK Q: NOTION-QUALITY RESTORATION (prerequisite — ~4 slices)
Q1 **Token bridge rebuild**: enumerate BlockNote's FULL --bn token list from
node_modules dist css; map every group (editor/menu/side-menu/toolbar/tooltip/hovered/
selected/disabled + shadows + borders) to --ds tokens for light AND dark; panels get
var(--ds-surface-overlay) + var(--ds-shadow-overlay). AC (live probes re-run): side-menu
icon computed color = icon-subtle; toolbar boxShadow ≠ none; slash-menu text = --ds-text.
Q2 **Type & rhythm**: body 16px/1.6 (--bn font size), Notion heading scale, block margins,
max measure 720-820px + width toggle, left gutter ~46px (handles never overlap text),
font-smoothing, per-block placeholder styling verified live, sticky page header.
Q3 **Affordance polish**: table handles styled + verified, image resize/caption styling,
code-block copy button + language picker styling, link toolbar styling, text/bg color in
formatting toolbar (BlockNote default marks), markdown input rules verified (## → H2 live).
Q4 **Tree & chrome polish**: inline rename (dbl-click), right-click context menu
(duplicate/move/delete/save-as-template), hover fades, drop-indicator upgrade, favorite
star → Atlaskit icon, emoji picker popover (page icon), "Saving…/Saved" indicator,
outline/TOC right rail, skeleton fades.
Each slice: live DOM probe + light/dark screenshot acceptance BEFORE commit.

## PART 3 — TRACK D: DATABASES WITH VIEWS (canonical discovery COMPLETE)
**Canonical verdict:** Table view = **JiraTable** (src/components/shared/JiraTable/ —
production TanStack table: column visibility/reorder/resize, per-column filter menus,
sort, grouping+collapse, inline edit via editors.tsx [Assignee/Status/Date/Label/Text
EditCells], keyboard nav, virtualization; user prefs persist via useTableColumns →
user_table_preferences). Board view = extract kanban-board's Board/Column/Card render
layer (drag infra proven; currently coupled to its data hooks — thin adapter needed).
Gallery = ProjectCardGrid pattern + Card w/ cover. Calendar = CalendarGrid/CalendarCell
(month view; adequate v1). Filters = JiraFilterAtlaskit pattern + JiraTable header menus;
saved-view definitions need a new table (ph_saved_filters is the precedent).

Schema (staging-first, ledgered, slugs per slug-contract):
- kb_databases (id, space_id, page_id anchor nullable, name, icon, slug, timestamps)
- kb_database_fields (id, database_id, name, type[text|number|select|multi_select|date|
  person|checkbox|url|relation], options jsonb, position, width_px, is_visible_default)
- kb_database_rows (id, database_id, page_id nullable → a row can open as a full Docex
  page, values jsonb keyed by field id, position, created_by/updated_by)
- kb_database_views (id, database_id, name, kind[table|board|list|gallery|calendar],
  config jsonb {filters, sorts, group_by_field, visible_fields, column_order}, position)
RLS: authenticated (matches kb_* posture; D5 batch tightens all together).

Build: hooks useKbDatabase/Fields/Rows/Views (+mutations, useWiki.ts patterns);
`DatabaseSurface` = view tabs (Notion-style) + active view; view implementations reuse the
canonicals above; field editor popover (add/rename/retype/options); inline row create
(JiraTable stickyCreateFooter); `database` custom block (CalloutBlock factory pattern)
embedding the surface in pages + slash item; route /docex/:ws/db/:dbSlug.
Slices (each ≤2h, gated): D1 schema+hooks+route+blank database create → D2 TABLE view via
JiraTable w/ typed cells + inline edit + row create → D3 fields editor + view configs
persisted (filters/sorts/hide/group) → D4 BOARD view (group-by select field, extracted
board renderer, drag updates value) → D5 LIST+GALLERY → D6 CALENDAR (date field) →
D7 `database` block embed + templates.

## PART 4 — TRACK C: REAL-TIME CO-EDITING (discovery COMPLETE — all green)
**Runtime-probed:** BlockNote 0.51.4 ships native collab (YSyncExtension/YCursorExtension/
YUndoExtension; `collaboration:{fragment: Y.XmlFragment, user:{name,color},
provider:{awareness}}` on useCreateBlockNote — remote cursors render natively). All deps
installed & unused: yjs@13.6.31, y-indexeddb@9.0.12, y-protocols@1.0.7. Transport
precedent: ChatRealtimeManager.ts channel.send broadcast pattern. kb_documents.ydoc_state
BYTEA confirmed (base64 round-trip via REST). No relay server needed (client↔client
broadcast; Yjs CRDT converges). User identity: user_metadata name + deterministic
hue-from-user-id cursor color.

Build: new `src/components/wiki-hub/editor/SupabaseYjsProvider.ts` (channel
`docex-collab:{pageId}`, events y-update/y-awareness base64; y-indexeddb local cache);
WikiEditor gains optional collaboration config; WikiPageSurface: when ≥2 in the collab
channel, Yjs is the truth — content jsonb becomes a 15s-debounced PROJECTION checkpoint
(blocksToText intact for search) + ydoc_state checkpoint (60s + on-hide), and the
updated_at conflict guard is BYPASSED (CRDT merges; guard stays for solo edits so the
verified Keep-mine/Load-theirs flow is preserved).
Slices (each ≤2h, gated): C1 provider + two-tab convergence spike (sandbox) → C2 wire real
pages + native cursors w/ names/colors → C3 ydoc_state checkpoint + cold-load hydration +
projection → C4 reconnect/offline (y-indexeddb) + solo-guard interplay → C5 5-editor load
probe + validation evidence.

## Execution order & timebox
Track Q (quality restoration) FIRST — it is the credibility gate and every later surface
inherits it. Then Track D (databases) and Track C (co-editing) interleaved: D1-D2 → C1-C2
→ D3-D4 → C3-C4 → D5-D7 → C5. All slices ≤2h, committed individually, gates: tsc 183 /
colors 0=0 / build green / LIVE probe + screenshots. DDL: staging only (cyijb…), applied
via CLI with the provided PAT, ledgered 1:1.

## Verification
Every slice ends with the audit-style live evidence used this session (signed-in DOM/HTTP/
SQL probes on :8090), recorded in 06_VALIDATION_EVIDENCE.md. Final acceptance: (1) re-run
all Part-1 probe measurements and show them green, (2) two-tab co-edit convergence video-
equivalent screenshot sequence, (3) database with ≥3 views round-tripping filters/sorts/
group-by, (4) full light+dark screenshot set.

## Feature folder
~/catalyst/features/CAT-DOCEX-DB-COEDIT-20260705-001/ (00/01/03/09/11 + sessions/) —
created on approval (plan mode forbids writes now), Plan Lock = this document.

## Execution log (post-approval)
- Q1 landed: chrome theme-bridge rewrite (5bdc6a0ca — from prior turn context).
- Q2/Q4 partial: sticky header, Saving indicator, width toggle, star icon (965fc480f).
- C1 landed + fixed: two-tab convergence proven bidirectional (a3aa34347).
- Stale-cache production bug found + fixed: useWikiPageBySlug staleTime:0 (9c0146fa0).
- C2/C3 landed: real-page co-editing, hydration-from-db, ydoc_state persistence,
  seed-from-content on first session, conflict-guard bypass w/ peers (fb2ba167f).
- D1/D2 landed (prior turn): databases schema + JiraTable table view.
Remaining: C4, C5, D3-D7, Q3 remainder, Q4 remainder.
