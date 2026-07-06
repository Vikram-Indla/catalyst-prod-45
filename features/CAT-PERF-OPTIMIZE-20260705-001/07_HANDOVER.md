# HANDOVER — CAT-PERF-OPTIMIZE-20260705-001

**Status:** Safe slices DONE + pushed origin/main. Spikes deferred (need explicit go).
**Date:** 2026-07-05

## Shipped (4 commits on main, all pre-commit gates green)
| commit | slice | what |
|---|---|---|
| 8c196bb47 | A | 7 async-setState-after-unmount guards (3 P0 AI dialogs + reqAssist) |
| 43b2d4717 | B | read-path N+1: StoriesListView (fetchRankings .in batch) + useReleaseHealth (1+2N→3) |
| 5699c9231 | E | memoize JiraTable column filters / ActiveInitiatives blocked count / ForYouStatsBar |
| e33988416 | C | EpicListDragDrop write N+1 → affected-range only (whole-list→drag-distance) |

## Verified = NOT bugs (no change, do not re-open)
- **Slice D (8 render-effect flags): ALL false positives.** CatalystViewIdea/Card = legit editable-form seeds gated on id/primitive; JiraDescriptionEditor `editor` dep is a stable tiptap-v3 ref; SidebarRow parent callback already `useCallback` (TimelineView:197); EpicDescriptionEditor = trivial ref-sync. The render-audit agent didn't check parents / tiptap semantics.
- **Slice F (~19 realtime-channel candidates): ALL clean.** Every `.channel()` has `removeChannel`/unsubscribe. The "no cleanup" list was an rtk grep-cache artifact (served stale/comment-line counts). CatalystActivitySection's "2nd channel" was the word channel() in a comment.
- **Slice G (prismjs): already optimized.** 27 curated eager grammars + long-tail lazy, inside the lazy editor chunk. Trimming = flash-of-unhighlighted-code for ~0 initial-load gain.

## SPIKE-1 — RAN 2026-07-06, VERDICT: NOT VIABLE (abandoned)
Branch spike/atlaskit-editor-chunk-split (deleted). Tried dedicated `vendor-emotion` singleton + `vendor-editor` (editor-core/plugin/prosemirror/tiptap) split. Two real builds:
- Editor chunk STILL modulepreloaded (still on first paint) + **circular chunks** (vendor-atlaskit ↔ vendor-editor) = runtime hazard.
- Root cause (evidence): `@atlaskit/renderer` is EAGER (read-only ADF for descriptions/comments, used on nearly every view) and statically imports `@atlaskit/editor-core`/`editor-plugin` (node_modules/@atlaskit/renderer/.../RendererStyleContainer.js) + pulls editor-common across 290 files. The editor is genuinely in the eager module graph via renderer. manualChunks only relocates bytes; the static renderer→editor edge keeps it preloaded.
- The bundle-audit agent's premise ("editor is only React.lazy'd") was WRONG. The 2026-06-08 unified chunk was correct. Config fully reverted.
- **Only path to shrink first paint = make @atlaskit/renderer lazy or replace it with a light ADF→HTML read renderer** (big separate initiative; renderer is eagerly needed for read-mode ADF everywhere). NOT a chunk tweak. SPIKE-3 barrel trim also dead (same eager-graph reason).

## BONUS FIX LANDED (found during spike): main was UNBUILDABLE
`npm run build` failed repo-wide: PortfolioRoutesShell + ProgramRoutesShell lazy-imported `../pages/Tasks`, deleted in 8a79b4cc3. Removed dead const + <Route path="tasks"> in both. Verified build exit 0, 0 circular. Committed 3d19a846b on origin/main (rebased over 2 concurrent testhub commits).
- **SPIKE-2 — Lucide tree-shake in ProjectIcon (~100KB gzip).** `ProjectIcon` resolves `iconName` dynamically from `ph_projects.icon`. Current canonical picker (IconPickerGrid) stores SVG stems, but legacy `iconName` lucide path is data-driven. Enumerate distinct live `ph_projects.icon` values (staging cyij) first; only then build a static used-icon map. Static map without enumeration = zero-assumption violation (breaks projects with unmapped icons).
- **SPIKE-3 — App.tsx:7 FlagsHost barrel trim.** Low value without SPIKE-1.

## Next action
Decide on SPIKE-1 (highest leverage, real risk). If go: branch, dedicated-emotion-chunk approach, build + live editor render verify.
