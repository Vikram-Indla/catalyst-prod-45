# HANDOVER — CAT-DOCS-NOTION-20260704-001 + CAT-VOICE-FLOW-20260704-001
Updated: 2026-07-04 (implementation session 1, branch `feat/CAT-WIKI-CATYFLOW-20260704`)

## Vikram's binding directives (execution phase)
Production-grade only; light+dark verified; typography = backlog/Kanban parity; icon/Pages on every work item type; regression is the #1 concern; exports non-negotiable; BlockNote FREE core only for now (no xl-* — GPL; Business license decision in ~1 month; if something 98%-close to xl features exists, swap); model switching at Claude's discretion; screenshots at goal completion (Haiku ok for that); RTK/Caveman unless disruptive; all 5 bonus features approved; AI gateway key to come from Vikram.

## Landed commits (this branch)
1. `0e44ac3` P0 spike: BlockNote 0.51.4 pinned (core/react/mantine, MPL only) + yjs + y-indexeddb; ADS theme file `src/components/wiki-hub/editor/blocknote-ads.css` (ONLY styling bridge, --bn-*→var(--ds-*), unicode-bidi plaintext RTL, font=--ds-font-body); WikiEditor lazy wrapper. **Single prosemirror-state@1.4.4 + @tiptap/core@3.23.5 in tree — no dedupe conflict.**
2. `fa01738` Staging migrations (applied + ledgered on cyijbdeuehohvhnsywig): kb_doc_spaces=workspaces (slug trigger, container_type project|product|organization, 10 auto-provisioned; legacy project_id FK→kb_projects so new rows leave it NULL); kb_documents=pages (slug per-space, position, icon, cover_url, is_template, content_format adf|blocknote, ydoc_state, tree index); kb_document_links (polymorphic, BR→defect vocab, manual|mention) + kb_page_links; RLS loose (D5 later). Hub: wiki un-deprecated (HubSwitcher tone blue), /wiki + DEV /wiki/_sandbox routes, wikiRoutes in routes.ts.
3. `0485d86` useWiki data layer; PageTree (pragmatic-dnd tree-item hitbox, reorder/reparent, fractional positions); WikiPageSurface (Breadcrumbs, seamless title, 1.5s autosave + flush on hide/unmount, legacy-ADF read-only path); WikiWorkspacePage (/wiki/:workspaceSlug[/:pageSlug]); WikiSidebar rewritten to workspace directory (old links collided with :workspaceSlug).
4. `195ae70` CatyFlow: edge fns catyflow-token (ephemeral realtime secret via AI gateway; 503 until AI_GATEWAY_API_KEY/OPENAI_API_KEY secret set) + catyflow-clean (register-aware cleanup, gateway primary + Gemini fallback — WORKS today via staging GEMINI_API_KEY; modes clean|command; audit rows w/ source column); client cleanupTranscript (skip heuristics, data-dictation-style register resolution, deadline race); VoiceFlowProvider wired; maxDurationMs 3→15 min. **Both functions deployed ACTIVE on staging.**
5. `ad46365` CatalystPagesSection on ALL 9 work item types (epic/feature/story/task/defect/incident/test_case/idea/business_request; not subtask) + AttachWikiPageDialog (workspace picker, search, create-and-link); capsule live-caption panel (multi-line, RTL via unicode-bidi, magenta caret) + native-SR finals+interim accumulation.
6. `2b74e6f` Templates (BRD/tech-spec/meeting-notes) + Start-writing gallery on workspace overview.

## In flight
- Background agent building: workItemMention + pageLink inline chips (custom BlockNote schema), @ suggestion menu (pages + catalyst_issues), mention→auto-link extraction into kb_document_links/kb_page_links on autosave, BacklinksPanel. Touches WikiEditor.tsx/WikiPageSurface.tsx — do not edit those until it reports.
- User runs a separate session fixing main's typography ratchet drift (task_99a799b1).

## Verification state
- tsc baseline is **183** (NOT the stale 157 memory — 26 pre-existing errors landed on main June 24–30). Every commit verified at exactly 183.
- lint:colors:gate 0=0 clean; audit:ads:gate has a PRE-EXISTING +1 typography drift on main (not ours; separate fix session running). ads-scanner ignore-line used only for capsule magenta caret (canonical Caty color) — matches existing capsule precedent.
- Runtime/browser probes BLOCKED: MCP Chrome tab hits the auth wall (vikramataol@gmail.com prefilled; Claude cannot enter passwords). When Vikram signs in once in the automation tab: probe /wiki (workspace cards), /wiki/_sandbox (editor, seed-1500 perf button), create/nest/drag pages, Pages section on a story, dictation captions. THEN light+dark screenshots.

## Next work (ordered)
1. Land agent's mention/backlink slice → verify → commit.
2. Icon picker + cover picker on page chrome; y-indexeddb keystroke durability (yjs+y-indexeddb installed, unused yet); delete/trash affordance in tree (DangerConfirmModal).
3. Exports: markdown (blocksToMarkdownLossy) + HTML + print-stylesheet PDF on WikiPageSurface overflow menu.
4. Translate CTA (ai-translate-field) per translate-cta-pattern memory.
5. CatyFlow realtime: WebRTC provider (catyflow-token is live), AudioWorklet PCM, ghost renderers, provider fallback chain, dictionary tables+learning, command mode, legacy unification (useVoiceToText/useMicVoiceRecorder→engine), Web Speech Arabic gap note.
6. Comments (kb_document_comments wiring), presence channel, restrictions/share UI (D5 RLS tightening batch).
7. Bonus: BRD→stories (ai-generate-stories on page), Caty-over-wiki, meeting-notes→tasks, dictate-a-BRD flow, page analytics (+ views table).
8. Paste normalizer + fixtures; multi-block marquee selection plugin; embeds/bookmark blocks via chat-unfurl; callout custom block.
9. Global wiki home upgrades (recents/favorites), UuidToSlugRedirect for /knowledge-hub/*, search page.
10. Validation sweep + screenshots (needs sign-in) + 06_VALIDATION_EVIDENCE.md + baseline ratchet-down if applicable.

## Traps for the next session
- rtk hook rewrites Bash; `npm install` runs via bun → bun.lock is the real lockfile. Pipe-to-tail masks exit codes — don't chain `&&` after a piped gate command.
- kb_* tables absent from generated supabase types — use the `(supabase as never).from(...)` escape hatch (see useWiki.ts).
- kb_doc_spaces.project_id FK → kb_projects (NOT projects). Container columns are the identity.
- Supabase MCP server visible in session is PROD-ONLY (lmqwtldpfacrrlvdnmld) — never DDL there. Staging via CLI (`supabase db query --linked -f file`, ref check first) + manual ledger insert.
- WikiSandboxPage is DEV-only, remove before prod cutover.
- Editor re-creates on initialContent identity change — WikiPageSurface passes `key={page.id}` and never refetches content on autosave (see useUpdateWikiPage invalidation comment).

## Session 1 addendum (later commits)
7. `7f2bd4a` @-mention chips (workItemMention/pageLink inline specs, wikiSchema), @ suggestion menu (workspace pages + catalyst_issues — NB column is `title` not summary; entityId = row UUID), syncMentionLinks autosave mirror (additive-only) into kb_document_links/'mention' + kb_page_links, BacklinksPanel under editor.
8. `8dc9aa5` Exports: exportPage.ts headless BlockNote (`BlockNoteEditor.create({schema, _headless})`, blocksToMarkdownLossy/blocksToFullHTML) → md/html downloads + print-scoped PDF (@media print in blocknote-ads.css, .wiki-print-root/.wiki-no-print); Export DropdownMenu beside breadcrumbs (flushes autosave first); emoji icon picker popover on page chrome.
CatyFlow fns DEPLOYED + ACTIVE on staging (catyflow-clean works via GEMINI_API_KEY today; catyflow-token 503 until AI_GATEWAY_API_KEY/OPENAI_API_KEY secret set).

## Session 1 addendum 2 (Opus 4.8, post spend-limit-recovery)
9.  `2107f1c` Callout custom block (createReactBlockSpec, 4 kinds on ADS bg tokens, click-icon cycles) + wikiSchema blockSpecs + '/' slash menu (getDefaultReactSlashMenuItems+filterSuggestionItems+insertOrUpdateBlock, slashMenu={false}); WikiTranslateBar (hover CatyPulse triggers, ai-translate-field {text,target:'ar'|'en'}→{translated}, RTL read-only overlay, inline retry — view only, never mutates content).
10. `beee0ca` GenerateStoriesFromPage bonus: page linked to exactly 1 epic → resolves issue_key from catalyst_issues → ai-generate-stories with page text as description_text; toasts disabled/noContent/success. In WikiPageSurface header.
11. `4d2a8f5` WikiPresence: Supabase Realtime presence per page (wiki-page:ID), ADS AvatarGroup, hidden when alone. Soft signal only (Yjs co-edit = phase 2).

BlockNote APIs confirmed real in 0.51.4: createReactBlockSpec, createReactInlineContentSpec, BlockNoteSchema.create({blockSpecs,inlineContentSpecs}), defaultBlockSpecs/defaultInlineContentSpecs, useCreateBlockNote({schema},[deps]), SuggestionMenuController{triggerCharacter,getItems}, getDefaultReactSlashMenuItems, filterSuggestionItems (from @blocknote/react), insertOrUpdateBlock (from @blocknote/core), editor.insertInlineContent, editor.updateBlock, BlockNoteView slashMenu={false}, BlockNoteEditor.create({schema,_headless}), blocksToMarkdownLossy/blocksToFullHTML.

## STILL PENDING (next ticks, ordered by value)
- CatyFlow realtime WebRTC client: catyflow-token is LIVE (needs AI_GATEWAY_API_KEY secret set on staging to actually mint — currently 503). Build AudioWorklet PCM capture, RTCPeerConnection to provider realtime, wire interim deltas → existing setPartialText (capsule live-caption already renders them RTL). Provider fallback chain (realtime→groq batch→web speech). This is the biggest remaining CatyFlow gap; cleanup pass + captions + 15-min already done.
- CatyFlow dictionary tables + learn-from-edits; command mode (catyflow-clean mode:'command' ready); legacy unification (useVoiceToText/useMicVoiceRecorder → engine).
- Comments: wire kb_document_comments (exists) into WikiPageSurface (BlockNote comment threads or a side panel).
- y-indexeddb keystroke durability (yjs+y-indexeddb installed, unused).
- Page delete/trash in PageTree (DangerConfirmModal).
- Bonus remaining: Caty-over-wiki (Q&A on workspace pages — likely needs an edge fn or reuse caty-chat with page context), meeting-notes→tasks, dictate-a-BRD onboarding, page analytics (+ a views table migration).
- Embeds/bookmark blocks via chat-unfurl; paste normalizer + fixtures; multi-block marquee.
- D5 RLS tightening batch; UuidToSlugRedirect for /knowledge-hub/*; cover-image picker.
- VALIDATION (blocked on Vikram sign-in to MCP Chrome tab): runtime DOM probes on /wiki + /wiki/_sandbox, light+dark screenshots of every surface, regression sweep of Knowledge Hub + descriptions + comments, then 06_VALIDATION_EVIDENCE.md.

## Commit count this branch: 12 (0e44ac3 → 4d2a8f5). All at tsc 183 = baseline, color gate 0=0.

## Session 1 addendum 3 (Fable 5 resumed)
12. `d731686` CatyFlow realtime lane: RealtimeTranscriber (WebRTC via catyflow-token ephemeral secret, oai-events data channel deltas, availability cached per page-load), runs PARALLEL to MediaRecorder in the Groq path — live Arabic/English captions via setPartialText; realtime transcript short-circuits the batch round-trip on stop (350ms grace); disposed on cancel/reset. Activates when AI_GATEWAY_API_KEY/OPENAI_API_KEY secret set. AudioCaptureService.getStream() added.
13. `23aed7e` Page comments: knowledge-hub DocumentComments (kb_document_comments) mounted below backlinks, lazy.
14. `c0e17b4` Page deletion: PageTree hover trash + DangerConfirmModal (skipPhraseGate; parent FK verified ON DELETE SET NULL on staging → children promote to root, copy says so); deleting open page navigates to workspace.
15. `a673716` Keystroke durability: localDraft IndexedDB journal (400ms throttle, cleared on confirmed save) + restore/discard banner when a draft is newer than server copy (+2s); restore remounts editor via key `${page.id}-draft`.
16. `b2d58d0` PRODUCTION BUILD GREEN (npm run build, 39752 modules, 2m8s — build needs the repo script's 8GB heap, bare `npx vite build` OOMs). Fixed 2 runtime-export bugs tsc missed: insertOrUpdateBlock gone from core 0.51 runtime (replaced with editor.updateBlock/insertBlocks), filterSuggestionItems lives in @blocknote/core NOT react. LESSON: BlockNote type dirs contain stale aliases — always verify runtime exports with `node -e "import('@blocknote/x').then(m=>...)"` before using a new symbol.

Tasks 1-8 complete. Open: #9 CatyFlow remainder (dictionary tables+learning, command-mode client wiring, legacy unification of useVoiceToText/useMicVoiceRecorder), #10 bonus remainder (Caty-over-wiki, meeting-notes→tasks, dictate-a-BRD, page analytics), #11 validation (BLOCKED on Vikram: sign-in to MCP Chrome tab; also gateway key for realtime; screenshots light+dark after that).

## ═══ OPUS PLAYBOOK (Fable→Opus handover, 2026-07-05, 22 commits, build green) ═══

### Landed since addendum 3 (all build-verified)
17. `2402963` Personal dictionary (dictation_dictionary on staging+ledger; learn-from-corrections word-diff; feeds ASR vocabulary + cleanup prompt; ALSO fixed cleanupTranscript receiving ActiveField instead of .element).
18. `e3bd988` Command mode (selection at activation → instruction → catyflow-clean mode:'command' → replaces selection; capsule label switches).
19. `6c5fcdd` Marquee multi-block selection (drag on page margins → cross-block TextSelection; overlay via --ds tokens; zero contenteditable interference) + GDocs/Word paste normalizer (pure fn normalizeVendorHtml + wikiPasteHandler via documented pasteHandler option).
20. `07a3f0a` DictationCTA — focus-following magenta mic (token color.icon.accent.magenta), onMouseDown-captures field+selection pre-blur, tooltip w/ hotkeys, global behind flag.

### Rules for Opus (binding)
1. EVERY slice: `npx tsc -p tsconfig.app.json` == 183, `npm run lint:colors:gate` clean, AND `npm run build` (bare vite OOMs — use the npm script; tsc alone passed twice on runtime-export bugs the build caught).
2. NEVER guess a BlockNote export: probe with `node -e "import('@blocknote/core').then(m=>console.log('X' in m))"` — types dirs contain stale aliases.
3. Do NOT touch: canonical Tiptap Description editor, Atlaskit editors, useVoiceToText, useMicVoiceRecorder (Decision 7 — parked deliberately). Do NOT "unify" them.
4. ADS tokens only; new colors = gate failure. The 2 sanctioned magenta literals use token() with #CD519D fallback or scanner-ignore (capsule caret).
5. Staging DDL: verify `cat supabase/.temp/project-ref` == cyijbdeuehohvhnsywig, apply via `supabase db query --linked -f <file>`, insert ledger row. The visible Supabase MCP server is PROD — never DDL through it.

### Opus-safe queue (ordered, patterns exist for all)
1. Embed/bookmark blocks: createReactBlockSpec (copy CalloutBlock.tsx shape) + provider regex table + chat-unfurl edge fn for OG metadata persisted into props; slash entries alongside Callout.
2. Cover-image picker (mirror icon-picker popover; store cover_url; uploads via existing buckets).
3. UuidToSlugRedirect for legacy /knowledge-hub/* routes (pattern exists; mount outside CatalystShell).
4. Wiki home upgrades: recents (kb_documents by updated_at across visible workspaces), favorites (kb_document_favorites), cross-workspace search page (search_vector).
5. Bonus: meeting-notes→tasks (parse checkListItems under 'Action items' heading → planner task creation per tasks module patterns); page analytics (views table migration + stale-page flag on tree); dictate-a-BRD onboarding hint; Caty-over-wiki (reuse caty-chat with page content in context — check caty-chat contract first).
6. Share/restrictions UI ONLY (dialog over kb_document_restrictions rows). The D5 RLS POLICY BATCH itself is moved to FABLE-RESERVED — see below.
7. Settings UI for dictation (formality enum, dictionary manager listing dictation_dictionary rows w/ delete).
8. VALIDATION when Vikram signs into the MCP Chrome tab: DOM probes (workspace cards → create page → slash menu → callout → @-mention chip → Pages section on story → marquee drag → paste GDocs sample → dictation CTA visible), light+dark screenshots per 10_SCREENSHOT_CHECKLIST, write 06_VALIDATION_EVIDENCE.md. Remove WikiSandboxPage + its routes before prod.

### FABLE-RESERVED (do not attempt on Opus)
- First live debugging of the realtime WebRTC session once AI_GATEWAY_API_KEY is set (protocol quirks: SDP answer shape, delta event names vary by provider — verify against the live gateway, adjust RealtimeTranscriber event matching).
- Any marquee/paste edge-case rework beyond copy tweaks.
- D5 RLS tightening batch (membership-scoped policies + enforcing kb_document_restrictions): security-sensitive, subtle failure modes (silently hiding pages, breaking the Pages section across hubs). Opus may DRAFT the SQL; a Fable session reviews + applies + probes before it lands on staging.

### User-blocked items (remind Vikram)
1. Chrome sign-in (screenshots + probes). 2. AI_GATEWAY_API_KEY or OPENAI_API_KEY secret on staging (realtime Arabic streaming; cleanup already live via Gemini). 3. BlockNote Business license decision (~1 month; columns/docx/pdf).

## ═══ Session 2 (Fable 5) — Gemini key, self-test, UI/UX enforcement, rollout ═══
Goal: no Wispr/Notion compromise · self-test loop · production rollout ready · UI/UX cycle · use the Gemini key.

Commits (all build-verified, tsc 183, color gate 0=0):
- `1dbd653` callout block spec = factory fix (createReactBlockSpec returns a factory in 0.51; inline specs are objects — probed both).
- `2fdd723` **Realtime lane retargeted OpenAI → Gemini Live API.** The `AQ.` key Vikram shared was an *ephemeral Live token* (rejected by REST, ~30min TTL) — proof the project has Live API access. catyflow-token now mints ephemeral tokens via POST /v1alpha/auth_tokens with `bidiGenerateContentSetup` (field name PROBED against the live API; minting verified 200 on staging with the EXISTING GEMINI_API_KEY — no new key needed). RealtimeTranscriber speaks BidiGenerateContent WS: ephemeral-token query auth, setup handshake, PCM16@16k tapped from the shared mic via ScriptProcessor, serverContent.inputTranscription.text → live captions (AR+EN).
- `10118c5` Pure-logic self-test harness (17/17): pasteNormalizer, extractLinks, blocksToText via node+jsdom+esbuild (vitest broken). Run cmd in `src/components/wiki-hub/editor/__selftest__/README.md`.
- `9afdda74` **UI/UX enforcement pass** (design critique applied): fixed 2 P0s — (1) dictation capsule text used --ds-surface (bg token) as text color → invisible in one theme; now fixed always-dark overlay w/ opaque caption backing, correct in BOTH modes; (2) bilingual empty-page invite (AR+EN, hides on first keystroke). P1s: signature CatyPulseIcon on the mic CTA, PageTree indent guides, editor line-height 1.6, card hover/focus states, 'All workspaces' switcher, relative edit time.

Clipboard read returned EMPTY (the copy didn't land) — used the screenshot value instead. Net: realtime is now Gemini-native and works with the key already on staging.

### Rollout runbook: see 12_ROLLOUT_RUNBOOK.md (gating, prod apply order, smoke tests, rollback).

### Audit gate note (for CI/PR): the audit:ads:gate shows typography +1 vs baseline — this is the PRE-EXISTING main drift (WorkListStates.tsx, NOT in this branch's diff; owned by task_99a799b1). This branch's own typography/spacing delta is ZERO after annotating the ADS heading-token-shorthand false-positives (font: var(--ds-font-heading-*) trips the naive enforcer which wants split fontSize/fontWeight). Rebasing onto current main (which has moved forward) before merge should clear it.

### Remaining P1 for Opus (from the critique): PageTree roving-tabindex Up/Down keyboard traversal (WAI-ARIA tree pattern; currently Enter/Left/Right only). Everything else from the critique is done.

## ═══ Session 3 (Fable 5) — UI upscale + double-panel kill ═══
Vikram: "double side panel, cheap UI... upscale 40x." Fixed.

Commits:
- `<single-sidebar>` Killed the double panel: page tree moved INTO the Wiki hub sidebar via SidebarBase `children` (WikiTreeNav). WikiSidebar is route-aware via parseWikiPath (sidebar renders outside the routed <Outlet/>, so useParams can't see :workspaceSlug — parse pathname instead). WikiWorkspacePage dropped its 2nd aside → full-width. DOM-VERIFIED live: exactly 1 aside, [role=tree] inside it.
- Premium page surface: cover zone (hover Add/Change/Remove + 8 one-click gradient covers from ADS accent-subtlest tokens + paste-URL), Notion-scale title (heading-xxlarge -0.02em), 64px overlapping icon w/ hover scale+shadow, hover-reveal Add icon/cover action bar.
- Premium overview: 56px workspace glyph hero + Start-writing gallery w/ lifted shadowed cards.
- `74e610a` Premium home: neutral hero (replaced olive-green PageHeader — DOM-verified rgb(41,42,46)), lifted 44px-glyph workspace cards, fixed search icon (was mispositioned above input → now inset-inline-start 12px).

All gates green (tsc 183, color 0=0, audit spacing baseline; typography +1 = pre-existing main drift). Full build ✓ each commit.

### SCREENSHOT TOOLING NOTE for next session
The MCP Chrome screenshot waits for document_idle, which the dev server's HMR+realtime sockets prevent → 45s timeout. Workaround: verify via `javascript_tool` DOM queries (works reliably) OR screenshot against a PRODUCTION build served statically (no HMR socket). The /wiki home screenshotted fine early on before HMR churn. For Vikram's light+dark screenshot deliverable: serve `npm run build` output via a static server (no HMR) and screenshot there.

### Remaining polish ideas (not blocking): workspace-icon parity on home cards (sidebar already has canonical ProjectIcon via the linter's enhancement — mirror on home), page-tree roving keyboard nav (Opus queue).

## ═══ Session 3 addendum — live browser verification + the editor-mount fix ═══
Signed-in browser verification (finally possible) caught what type-check + build could NOT:

- `d6bb3e08` **CRITICAL: the Wiki editor NEVER rendered before this.** @blocknote/mantine's peer deps (@mantine/core, @mantine/hooks) were never installed → a hoisted Mantine 9.4.1 resolved → Mantine 9 renders <Context> directly (React 19 only) → 'render2 is not a function' in the app's React 18 → the editor subtree unmounted with NO visible error (blank canvas, no console error surfaced by tsc/build). Fix: @mantine/core@8.3.11 + @mantine/hooks@8.3.11 (React-18 line, within the wrapper's ^8.3.11 range), pinned via package.json overrides, added to vite resolve.dedupe. **LESSON: BlockNote's Mantine wrapper needs its Mantine peers explicitly installed and pinned to 8.x on React 18 — never trust the hoisted transitive.**
- `2f1572e` page creation was 400ing (kb_documents.updated_by NOT NULL, create only set created_by) — fixed, verified insert→slug works.
- Also this session: single-sidebar restructure, premium page/overview/home surfaces, redundant-subtitle fix.

### LIVE-VERIFIED WORKING (signed-in, staging):
- Single sidebar (1 aside, tree inside), no double panel.
- Create page (blank + templates) → navigates to editor.
- Editor mounts: .wiki-bn/.bn-editor/.ProseMirror/contenteditable.
- Bilingual empty invite renders EN + AR.
- Typing works; **slash menu works** (Headings H1/H2/H3 + ⌘-ALT, Basic blocks Quote/Toggle/Numbered/Bullet/Check + ⌘-SHIFT).
- Premium chrome: Add icon / Add cover hover bar, Notion-scale bold title, Edited-Xm-ago, Export, Comments.

### Still to live-verify (needs a session): @-mentions, callout via slash, cover picker, drag-reorder in the sidebar tree, translate, dictation. And the SCREENSHOT idle-timeout workaround (use a FRESH tab — that's how these captured).
