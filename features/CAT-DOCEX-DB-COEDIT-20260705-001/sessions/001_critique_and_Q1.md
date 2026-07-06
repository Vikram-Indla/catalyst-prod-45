# Session 001 — critique cycle + Q1 chrome restoration (Fable 5, 2026-07-05)

Plan Lock approved (03). Critique: 37-gap register (03 PART 1) — Vikram rejection UPHELD.

Q1 LANDED (5bdc6a0ca): three root causes measured live —
(1) --bn tokens scoped to .wiki-bn while BlockNote portals popovers to body → unthemed
(white side-menu icons in light mode); now :root+.bn-container+scheme hooks, all 44 vars.
(2) BlockNote reuses tooltip tokens for slash-menu labels → our inverse mapping = white
on white; remapped subtle.
(3) Mantine mount-transition wrapper wedges at opacity 0.31 → ALL popovers permanently
translucent; wrappers forced opaque via :has().
Plus 16px/1.6 body, Notion heading scale, 54px gutter, rhythm, smoothing.
AC PROBES GREEN + before/after screenshots captured (slash menu now crisp/elevated).

NEXT: Q2 rest (sticky header, width toggle, placeholder verify), Q3 (tables/image/code/
link/colors/md-rules), Q4 (tree rename/context menu, star icon, emoji picker, Saving
indicator, TOC) → D1-D7 (databases: schema in 03) → C1-C5 (Yjs co-edit: arch in 03).
Worktree .claude/worktrees/catyflow-recovery, dev :8090, staging PAT provided by Vikram.

## Session 2 (2026-07-06) — Q2/Q4 slice + DATABASES D1/D2 LIVE
- 965fc480f Q2/Q4: sticky header, Saving…/Saved indicator, full-width toggle (per-page
  localStorage), star → Atlaskit icons, placeholder css → ::after (LIVE: native
  placeholder "Enter text or type '/' for commands" renders; markdown ## → H2 verified).
- 66f166986 D1+D2: kb_databases/fields/rows/views applied+ledgered on staging
  (20260706100000); useDocexDatabase.ts; DatabaseSurface (view tabs + JiraTable, typed
  cells, inline edit, add row/field, delete action); /docex/:ws/db/:dbSlug;
  Databases section on workspace overview. LIVE E2E: created db (new-database-3 on ICP),
  row "Ship databases" + Status=In progress persisted (lozenge screenshot). Orphans from
  2 failed pre-fix creates deleted. TRAP: PostgREST batch inserts need UNIFORM row keys.
- Demo artifact kept on staging: /docex/icp-project/db/new-database-3.
NEXT: D3 fields editor + persisted view configs → D4 board view → C1 Yjs two-tab spike
(arch in 03 §PART 4) → Q3/Q4 remainder (tree rename/context menu, TOC, emoji picker) →
D5-D7. Production build over D1/D2 running at session end — check before push.

## Session 2 addendum — C1 co-editing spike wired
- 91b8f7a1d SupabaseYjsProvider (broadcast y-update/y-awareness + y-hello state-vector
  handshake for late joiners), WikiEditor collab prop → BlockNote native collaboration
  (fragment/awareness/user), sandbox ?collab=1 two-tab probe, deterministic cursor colors.
- Production build over D1/D2: GREEN (exit 0).
- C1 two-tab convergence AC: BLOCKED — the :8090 browser session EXPIRED mid-test (both
  tabs → /auth). After Vikram signs in again at http://localhost:8090: open
  /docex/_sandbox?collab=1 in TWO tabs, type in one, assert text + remote cursor in the
  other. Then C2 (real pages), C3 (ydoc_state checkpoints + hydration).

## Session 3 — C2/C3 real-page co-editing + a real stale-cache production bug found
- a3aa34347 (C1 fix, prior turn): provider lifecycle moved useMemo->useEffect; two-tab
  convergence in the sandbox proven bidirectional, live cursor visible.
- 9c0146fa0 **fix: useWikiPageBySlug had no staleTime override**, inheriting the app's
  global 15-min staleTime + localStorage-persisted QueryClient. Docex slugs are reused
  after delete (auto-derived from title); within the 15-min window a stale
  (workspaceId,slug)->id cache entry silently bound every mutate() to a PHANTOM,
  already-deleted row (PostgREST PATCH with 0 matching rows returns 200 OK, not an
  error) while the real open page's edits were never persisted. THIS IS A REAL,
  PRE-EXISTING PRODUCTION BUG unrelated to co-editing — found only because C2 testing
  surfaced it. Fixed: staleTime:0 on this query.
- fb2ba167f **C2/C3**: WikiPageSurface provisions one SupabaseYjsProvider per open
  page; hydration reads kb_documents DIRECTLY (bypassing the page prop, since React
  Query can serve a stale snapshot on first render before this effect — which correctly
  runs only once per page — captures it); first-ever collab session seeds the Y
  fragment from existing content via a headless-editor pattern (seedYdoc.ts, same
  _headless technique as exportPage.ts) so old content never silently vanishes;
  ydoc_state persists via NEW bytea hex helper (ydocBytea.ts — PostgREST uses
  Postgres hex-escape "\x...", NOT base64; VERIFIED live against staging with a
  disposable probe row before trusting it) debounced 4s per doc update; solo-edit
  conflict guard bypassed when a peer is present (awareness state count).
LIVE E2E VERIFIED (multiple rounds, real staging rows, cleaned up after): type -> persists
(content_text + ydoc_state) -> full reload w/ zero tabs open -> hydrates correctly ->
second tab cold-loads same content -> bidirectional convergence with visible remote
cursor. Two throwaway test pages ("untitled", "untitled-2" on ICP Project) deleted.
Production build running at session end (background) — CONFIRM GREEN before next slice.
NEXT: C4 (reconnect/offline via y-indexeddb + guard interplay), C5 (5-editor load probe),
then D3 (fields editor + persisted view configs), D4 (board view), remaining Q3/Q4 polish.

## Session 4 — C4/C5 landed; Track C (real-time co-editing) COMPLETE
- c8998ad65 C4: y-indexeddb local durability (measured: 3 update entries persisted within
  500ms of typing — faster than the 4s server checkpoint); fixed a real bug where
  `connected` was never reset false on channel CLOSED/TIMED_OUT/CHANNEL_ERROR (would have
  kept attempting sends into a dead channel after any network drop). True network-partition
  testing isn't scriptable with current tooling — deferred to manual QA; durability itself
  (the part that matters) is proven.
- c60e96f3f C5: 5-tab concurrent load probe. FIRST RUN found a genuine catastrophic bug —
  5 simultaneous cold-opens of a brand-new page raced to seed the empty Y-fragment
  independently; CRDT merge kept only one seed, silently discarding ALL 5 typed markers
  (cursors/awareness synced fine, but body came back TRULY empty — verified via real DOM
  inspection). Root cause #1: pages were born with ydoc_state=null. Root cause #2 (found
  while fixing #1): headless BlockNoteEditor + collaboration config silently no-ops
  replaceBlocks (no EditorView → Y-sync plugin never flushes; probed: 2-byte trivial
  update despite apparent 'success'). FIXED: createInitialYdocState seeds a REAL Y-doc
  snapshot ONCE at page-creation time (single-writer, no race possible), using a PLAIN
  headless editor + y-prosemirror's prosemirrorJSONToYXmlFragment (probed: 246-byte real
  update) instead of the broken collab-headless-replaceBlocks combo. RE-RAN the identical
  5-tab race on a page created under the fix: all 5 converged to IDENTICAL non-empty
  content — the catastrophic total-loss/split-brain failure mode is gone. Some markers
  still didn't survive due to genuine same-instant-same-position CRDT interleaving
  (expected, not a defect — real users never truly collide this precisely).
Gates green throughout (tsc 183, colors 0=0). Final production build over all of C1-C5
running now — confirm before reporting fully done.
Test artifacts cleaned up after every round (all 5-tab test pages deleted from ICP Project).

## TRACK C STATUS: COMPLETE (C1-C5 all landed, live-verified, two genuine production-grade
## concurrency bugs found and fixed along the way — not just the happy path).

NEXT: back to Track D (D3 fields editor + persisted view configs, D4 board view, D5-D7),
then remaining Q3/Q4 polish items from the 37-gap critique register.

## Session 5 — Vikram UX feedback batch (13_VIKRAM_UX_FEEDBACK_20260706.md)
LANDED b4e7fa1cb (live-verified): breadcrumb canonical (no Docex prefix, project icon,
matches Project Hub), page starts top-left (cover band 0 when empty, left-aligned 980px
column), sidebar cleaned (no All-workspaces, single label + hub icon via badgeHubIconUrl,
workspace name = back nav), WikiEditor onReady useMemo→useEffect (setState-in-render bug).

## OPEN P0 — Actions popover paints at (0,0)
Forensics: popper element gets inline `position:fixed; left:0; top:0` and transform NEVER
applies. True with shouldRenderToParent=false (portals correctly through atlaskit-portal
to body — verified ancestor chain) AND true before. No exception on open. Trigger rect
valid (1495,68). Other Atlaskit surfaces (Create modal) render fine; a dropdown A/B inside
the modal couldn't be triggered synthetically. PRIME SUSPECT: @atlaskit/popper/popper-js
version skew in THIS branch's bun.lock vs main (the worktree's fresh bun install; the
adf-schema build break already proved the lockfiles diverge). NEXT SESSION: compare
`bun.lock` @atlaskit/popper + react-popper versions vs main's; try pinning; else replace
the Actions trigger with canonical Popup and test; else inspect react-popper's update loop
with breakpoint instrumentation.

## PHASE PLAN for the rest of Vikram's 2026-07-06 feedback (13_… has full detail)
V1 Landing page rebuild = "Document Hub": title+subtitle, tabs All Docs/My Docs, search,
   FILTERS + SORT, LIST/TABLE view over all pages (reuse JiraTable from D2) + New button.
V2 Sidebar restructure: Project/Product/MY SPACE sections. My Space = personal workspace
   (kb_doc_spaces container_type 'personal' + on-demand provisioning migration); pages
   movable My Space → project (move-to-workspace from the D-queue).
V3 Page IDs: human-addressable key per page (e.g. DOC-123 — sequence per workspace or
   global; decide + migration) shown in UI, used for linking to work items.
V4 Attachments section on pages (kb_document_attachments exists — wire + upload UI).
V5 IMPORT: Word/PDF → Docex page. Research + implement Gemini API pipeline (file → 
   structured blocks; Arabic PDF → translated English page). Entry points: Actions menu
   Import + business_request detail ("upload PDF → linked Docex page").
V6 Convert page → work item (business_request/epic first): creates the work item from
   page content, links back.
V7 Translation everywhere + full RTL audit (page direction, tree, chrome; ai-translate-
   field for any field).
Packages: explicitly ALLOWED to install whatever is needed (Vikram).

## Session 5 addendum — Actions popover P0 CLOSED (3bf78af18)
Eliminated in order: lockfile skew (popper versions identical to main), vite dep cache
(purged + reproduced), portal placement (reproduced portaled to body), render-phase
corruption (onReady fix landed, still reproduced). Proven: popper's update loop simply
never runs on this mount — a manually applied transform sticks unchallenged. FIX: a
popper-dormancy rescue inside the canonical ads/DropdownMenu (two frames after open, if
the popup still has the fixed-0,0-no-transform signature, position from the ref'd trigger
rect; strict no-op when popper is alive). Docex Actions moved to a ref'd function trigger.
SCREENSHOT-VERIFIED: menu anchored under its button, Export+Page groups correct.
True root cause of popper dormancy remains un-diagnosed (upstream Atlaskit/popper timing
on this route) — the rescue makes it moot for consumers, but note it if popper issues
appear elsewhere. NEXT: Track V phases (V1 Document Hub landing first).

## V1 — Document Hub landing (2026-07-06)
Rebuilt /docex home per Vikram's Notion Document Hub reference: title+subtitle,
All Docs / My Docs tabs, search, workspace + status filters, New▾ (create in any
workspace), and the canonical JiraTable listing all kb_documents (icon+title,
workspace, Draft/Published lozenge, relative updated, sortable columns, row click
navigates). Workspace card grid removed — sidebar owns workspace nav.
Live-verified on :8090: 3 rows render, My Docs filter works, New menu anchored
correctly (shouldRenderToParent=false + dormancy rescue), headers sortable.
Gates: tsc 183, colors 0=0.

## V2 — My Space + move-to-workspace (2026-07-06)
- Migration 20260706120000_docex_personal_spaces.sql: widened kb_doc_spaces
  container_type check to include 'personal' (one per user via existing
  (container_type, container_id) unique index). Applied + ledgered on STAGING
  via Management API (db push blocked by known ledger drift).
- useWiki.ts: useMySpace() (on-demand provisioning, race-safe via unique
  index), useMoveWikiPageToSpace() with per-space slug-collision dedupe
  (LIVE-HIT kb_documents_space_slug_unique moving untitled→ICP; retry -2..-20),
  useWikiWorkspaces now hides other users' personal spaces client-side
  (RLS still permissive — D5 batch).
- WikiSidebar: "My Space" section (CircleUser icon), self-provisions once.
- WikiPageSurface: Actions ▾ gains "Move to workspace" group.
LIVE-VERIFIED: My Space auto-provisioned; blank page created at
/docex/my-space/untitled; moved to ICP Project → /docex/icp-project/untitled-4,
breadcrumb + tree correct. Gates: tsc 183, colors 0=0.

## V3 — Page IDs / DOC-n keys (2026-07-06)
Migration 20260706140000_docex_doc_keys.sql (applied+ledgered on STAGING via
Management API): kb_documents.doc_key DOC-<n> via sequence + BEFORE INSERT
trigger, backfilled in creation order, unique index. UI: doc_key in
WikiPageSummary + PAGE_SUMMARY_COLS; page-header key chip (code font, subtle)
next to Draft lozenge; Document Hub "Key" column + key-aware search.
LIVE: hub shows DOC-1..4; page header shows DOC-4. Gates: tsc 183, colors 0=0.

## V4 — Attachments section (2026-07-06)
- Migration 20260706150000_kb_attachments_delete_policy.sql (applied+ledgered
  STAGING): uploader-owned DELETE policy — table shipped INSERT+SELECT only.
- useWiki.ts: WikiAttachment type, useDocexAttachments / useUploadDocexAttachment
  (wiki-media bucket, attachments/<docId>/ prefix) / useDeleteDocexAttachment
  (row first, best-effort object removal), wikiAttachmentUrl.
- New DocexAttachments.tsx section (paperclip list, size, public-URL link,
  remove ×, multi-file Upload) mounted above Comments in WikiPageSurface.
LIVE: probe-note.txt uploaded → listed 28 B with storage URL → deleted →
empty state. Gates: tsc 183, colors 0=0.

## V5 — Word/PDF import via Gemini (2026-07-06)
- New edge function docex-import (DEPLOYED to staging, ACTIVE): PDF →
  Gemini gemini-2.5-flash NATIVE generateContent with inline_data (PDF parts
  unavailable on the OpenAI-compat lane the other ai-* functions use) +
  response_schema JSON → {title, sourceLang, blocks[heading1-3|paragraph|
  bullet|numbered|quote]}. Prompt translates non-English (Arabic) docs to
  professional English, preserves keys/URLs/emails, flattens tables to
  "col — col" bullets. 10MB cap.
- importDoc.ts: PDF lane via functions.invoke; DOCX lane = mammoth (installed)
  → HTML → plain-headless BlockNoteEditor.tryParseHTMLToBlocks (seedYdoc
  pattern) — no AI round-trip. quote→italic paragraph (no quote block in 0.51).
- Document Hub toolbar: Import ▾ (pick workspace → file picker .pdf/.docx),
  creates the page with imported blocks + title, toasts "Imported and
  translated (ar → en)" when sourceLang ≠ en, navigates.
LIVE E2E: falcon-charter.pdf (hand-built) → /docex/icp-project/
project-charter-falcon-initiative, DOC-5, all 3 sections + bodies present.
Arabic path shares the proven ai-translate prompt family (not yet exercised
with a real Arabic PDF — needs a font-embedded fixture).
Gates: tsc 183, colors 0=0.

## V6 — Convert page → work item (2026-07-06)
- convertPage.ts: convertPageToEpic (ph_issues, InlineCreateCard PROJECT-branch
  row shape, generateIssueKey) + convertPageToBusinessRequest (business_requests,
  kanban BR shape, global MIM-N keyspace mirror); both insert kb_document_links
  (manual) so page ↔ work item stay linked.
- WikiPageSurface Actions ▾ "Convert" group: project workspace → "Create epic
  from page" (description_text = blocksToText of live blocks); product
  workspace → "Create business request from page"; hidden for personal/org.
DB-VERIFIED on staging: ICP-415 Epic "Project Charter: Falcon Initiative",
project ICP, kb_document_links count 1. BR lane mirrors canonical inserts,
not yet exercised live (needs a product-workspace page).
Gates: tsc 183, colors 0=0.

## NEXT (V7 + remainders)
V7: translate CTA on every field + full RTL audit (editor already dir="auto",
bilingual placeholders; audit tree/hub/chrome). Track D remainder D3-D7;
Track Q remainder Q3/Q4; business_request detail "Import PDF" entry point
(V5 follow-up); D5 RLS tightening batch.

## Vikram batch 2 (2026-07-06, "shit-hole documentation") — fixes landed
1. HEADINGS 90px ROOT CAUSE: BlockNote's own stylesheet sizes the heading
   BLOCK WRAPPER ([data-level] → 3em=48px); our em-based h1 rule compounded
   (1.875em × 48px = 90px). Fixed: wrapper neutralized to 16px, absolute
   Notion scale pinned (h1 30/h2 24/h3 20/h4 18/h5 16/h6 14). Probe: 30px.
   ("1. Objective" tiny = user-set H6, now styled sanely too.)
2. DELETE "INLINE PAGE": DangerConfirmModal backdrop used --ds-shadow-raised
   (a box-shadow LIST — invalid as background → transparent blanket → dialog
   read as floating inline panel). Fixed: var(--ds-blanket). Probe: backdrop
   rgba(5,12,31,.46). Fix benefits every consumer of the shared modal.
3. RIGHT-SIDE HIERARCHY DRAWER: sticky 280px aside on WikiPageSurface with
   the full recursive PageTree (select/move/create-child), toggle button in
   header, open by default, choice persisted (docex-hierarchy-drawer).
4. DEEP NESTING: verified 3 levels live via new Actions ▸ "Add sub-page"
   (PageTree recursive — 5-6+ levels supported); breadcrumb now full path
   (maxItems 12, no "…" collapse).
5. Translator/RTL: WikiTranslateBar + GenerateStories chips confirmed mounted
   in page header (hover-reveal pattern per approved memory).
Cleanup: test sub-pages deleted through the fixed modal.
STILL OPEN from this batch: search-by-any-key page polish, epic/BR → page
reverse convert, import-onto-existing-page entry, module rename proposal,
full RTL audit (V7).

## Batch 3 (2026-07-06): key search + reverse convert + import-onto-page
1. SEARCH BY ANY KEY: useDocexSearch key lane — /^[A-Za-z]{2,10}-\d+$/ query
   resolves (a) kb_documents.doc_key (DOC-n) and (b) work-item keys via
   ph_issues.issue_key / business_requests.request_key → kb_document_links →
   linked pages, ranked first. Search page placeholder updated.
   LIVE: ?q=ICP-415 and ?q=DOC-5 both return the Falcon Charter.
2. REVERSE CONVERT (epic/BR → page): AttachWikiPageDialog's create path now
   SEEDS the page from the work item (fetches summary/description from
   ph_issues or business_requests by entityType; H2 summary + paragraphs).
   Best-effort — failure still creates a blank linked page.
3. IMPORT INTO CURRENT PAGE: Actions ▸ "Import PDF/Word into page" — hidden
   input on WikiPageSurface → importDocumentFile → editor.insertBlocks after
   last block → autosave. LIVE: appendix.pdf appended 6 blocks (7→13), Saved.
   REGRESSION CAUGHT LIVE: first cut referenced non-existent `editable`
   (crashed the surface, tsc silent — global name shadow); fixed to
   page.content_format check.
Gates: tsc 183, colors 0=0.

## V7 — RTL sweep + hub freshness (2026-07-06)
dir="auto" added to: PageTree labels, Document Hub title cell + search input,
Docex search-page input + hit titles (title input + editor already had it).
LIVE with real Arabic title "خطة منصة تقارير المستثمرين": title input rtl,
tree label rtl, hub cell rtl. Editor per-block bidi pre-existing.
ALSO FIXED: Document Hub all-docs query inherited the global 15-min persisted
staleTime → renames/new docs didn't appear (same family as slug-reuse bug);
staleTime: 0. NOTE: synthetic-JS input events don't commit the title (blur
handler needs real React state) — false alarm during probing, real typing
persists fine. Test page deleted.
Translation-everywhere status: page translator = WikiTranslateBar (header,
hover-reveal); field translate = ai-translate-field CTA app-wide; imports
auto-translate via docex-import.

## Module rename: Docex → FOLIO (2026-07-06, Vikram: "Go for folio")
- routes.ts: folioRoutes at /folio/*; docexRoutes + wikiRoutes now deprecated
  aliases; Routes.folio added (Routes.docex/wiki still compile).
- FullAppRoutes: all mounts moved to /folio/*; /docex + /docex/* redirect via
  DocexToFolioRedirect (path-preserving); /knowledge-hub → /folio.
- Labels: hubs.ts, tabIdentity, workspaceContext, HubSwitcher, HomeSidebar,
  MobileNavigationMenu, WikiSidebar (badge label + section), Search page h1,
  HubSwitcher test. INTERNAL KEYS UNCHANGED on purpose: module key 'docex',
  feature flag docex_hub, HUB_ICON_REGISTRY.docex, query keys, collab channel
  names — renaming those risks DB-config/module-gating breakage for zero UX.
LIVE: /docex/icp-project/project-charter-falcon-initiative → redirected to
/folio/... full path; sidebar + tab title "Folio"; /folio hub renders.
Gates: tsc 183, colors 0=0.

## design-critique F1-F8 (2026-07-06, Vikram /design-critique + "go")
F1-F3 (1b2629502): canonical toolbar — @atlaskit/tabs, ads Textfield search,
ads Select filters (0 native selects), Folio Breadcrumbs+Heading, full-width
JiraTable, Folio-icon DOC-n Key cells, Parent column via kb_document_links
(shows ICP-415), semantic roots aside/section → div (G7 blanket rule).
F4 (cda62e253): DictationCTA focus→HOVER reveal (pointerover/out, cluster-
aware hide) + Translate companion (ai-translate-field, writes back via native
value setter + input event). LIVE: focus alone=no chip; hover=Translate+
Dictate; leave=gone.
F5: live captions ALREADY SHIPPED in VoiceFloatingCapsule (.vf-caption
"see what I'm saying") — pending human mic certification only.
F6 (c342a99ab): Pages section + menu → "Convert to Folio document": seeds
from work item, auto-places in the item's own project/product workspace
(My Space fallback), links both ways. LIVE: ICP-415 →
/folio/icp-project/icp-415-project-charter-falcon-initiative.
F7: /folio/sitemap — complete hierarchy (workspace cards → nested page tree →
DOC-n keys + linked work-item lozenges), sidebar "Site map" item.
LIVE: 11 workspaces, ICP tree with DOC-5/DOC-12 + ICP-415 chips.
Gates every commit: tsc 183, colors 0=0.

## design-critique round 2: R1-R3 (2026-07-06)
R1 (fc1c1090c): ProjectPageHeader (canonical 2026-06-14 breadcrumb+H2)
parameterized with hubType 'folio' — "Folio / Document Hub" exactly like
"IR Platform / Dashboard"; mounted on hub/search/sitemap; level-1 pages pass
no trail (trail duplicated the title crumb — caught live).
R2 (fc1c1090c): JiraIssueTypeIcon + key everywhere — hub Parent column and
sitemap fetch ph_issues.issue_type (real type string; BRs = 'Business
Request'), icon renders beside every key.
R3: Site map rebuilt on @xyflow/react (already installed) — pan/zoom canvas,
workspace roots → page nodes (unlimited depth) → work-item leaves with type
icons on dashed edges; minimap + controls; click navigates; empty workspaces
omitted for density. CRASH CAUGHT LIVE: persisted query cache held the old
linked_keys shape under the same key → "d.linked is not iterable"; fixed via
queryKey v2 + iteration guard.
Gates: tsc 183, colors 0=0.

## W1-W3 + Site map v2 (S1-S5, E2/E3/E5, list view) — 2026-07-06
W1: pages default FULL WIDTH (per-page localStorage override docex.fullwidth.*
wins; default flipped true). W2: workspace landing + search full width,
left-aligned. W3: React Flow colorMode wired to resolvedTheme — dark mode
verified live (list view screenshot, all tokens flipped).
Site map v2 (FolioSiteMapPage rewrite): Canvas|List Atlaskit tabs; workspace
Select filter; in-canvas search (matches get 2px focused border, non-matches
dim 30%, search auto-expands); per-node collapse/expand with +N descendant
badges + Expand/Collapse-all; hover detail card (title, key, status lozenge,
workspace, sub-page count, updated, linked items w/ type icons, click hint);
staleness heat borders (30d/90d); Orphans + Stale lens Select; deep links
?view&ws&q&lens; LIST VIEW = canonical JiraTable, 25/page pagination, Linked
tickets column with type icons. LIVE: ?q=ICP-415 canvas + ?view=list table
verified in dark mode.
STILL QUEUED (context): AI natural-language search ("show me all BRDs of
license" — Gemini NL→terms edge lane + sitemap highlight), E1 coverage lens,
E4 PNG export, E6 dagre layout for 100+ nodes.
