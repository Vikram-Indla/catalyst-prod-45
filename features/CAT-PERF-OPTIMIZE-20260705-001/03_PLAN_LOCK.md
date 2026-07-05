# PLAN LOCK — CAT-PERF-OPTIMIZE-20260705-001

**Objective:** Remediate the verified Phase-1 performance findings across the Catalyst repo — memory leaks, N+1 queries, wasteful re-renders, unmemoized compute, and safe bundle wins — without regression.

**Non-scope:** No feature changes. No schema changes. No visual redesign. The atlaskit editor-chunk split is a *flagged spike*, not part of this execution.

**Method:** Independently-shippable slices, each ≤2h, ordered by (leverage ÷ risk). Each slice validates before commit. Behavior-preserving slices first; risky bundle work is spiked separately.

---

## SPIKES — RED-FLAGGED, NOT auto-executed (require explicit go)

| ID | item | why flagged |
|---|---|---|
| SPIKE-1 | Split editor/renderer/prosemirror out of `vendor-atlaskit` (~3MB gzip win) | `vite.config.ts:772-790` documents a 2026-06-08 "FINAL FIX": this split was tried and REVERTED because Emotion closure helpers break across chunk boundaries. `manualChunks` returns one chunk per module — @emotion can't be in two chunks. Needs a branch spike proving the editor renders before/after. |
| SPIKE-2 | Lucide tree-shake in `ProjectIcon.tsx` (~100KB gzip) | `iconName` resolves lucide names dynamically from `ph_projects.icon` (data-driven). A static icon map risks rendering fallback for any live project whose stored name isn't mapped = zero-assumption violation. Needs live DB enumeration of distinct icon values first. |
| SPIKE-3 | App-root barrel trim (`App.tsx:7` FlagsHost via JiraTable/index barrel) | Low value without SPIKE-1; verify import chain doesn't break flag host. |

---

## EXECUTION SLICES (safe, behavior-preserving)

### Slice A — Async-setState-after-unmount leaks (P0×3, P1×3, P2×1)
Copy the existing repo pattern (`improve/` streaming overlays: `let cancelled=false` + `AbortController`, aborted in cleanup).
- P0: `catalyst-detail-views/improve/SuggestChildIssuesDialog.tsx:87`
- P0: `catalyst-detail-views/improve/LinkSimilarItemsDialog.tsx:77`
- P0: `reqAssist/RAEpicGenerationModal.tsx:130`
- P1: `reqAssist/RAEpicDraftDrawer.tsx:62`, `RABackgroundModal.tsx:47`, `RAJiraSidePanel.tsx:78`
- P2: `reqAssist/RAStatsBar.tsx:64`
- **Accept:** close each surface mid-request → no post-unmount setState (console clean). tsc clean.

### Slice B — Read-path N+1 (P0×1, P1×1)
- P0: `components/stories/StoriesListView.tsx:45-50` — `Promise.all(stories.map(fetchRanking))` → single `.in('work_item_id', ids)`.
- P1: `modules/command-center/hooks/useReleaseHealth.ts:40-59` — per-release cycles+runs `1+2N` → 3 batched queries.
- **Accept:** query count constant vs row count (network panel). Same rendered data.

### Slice C — Write-path N+1 drag-reorder (P1×2)
- `components/features/FeaturesListView.tsx:80-89` — per-row UPDATE → bulk upsert/RPC.
- `components/items/epics/EpicListDragDrop.tsx:63-76` — rewrites entire list per drop → bulk.
- **Accept:** one write per drop. Reorder persists correctly.

### Slice D — Render effect anti-patterns (P0×2, P1×6)
- P0: `jira-description-editor/JiraDescriptionEditor.tsx:168-170` — effect deps `[editor, readOnly]` re-run every frame (TipTap editor identity). Stabilize.
- P0: `catalyst-detail-views/idea/CatalystViewIdea.tsx:186-205` — 11-field state-dup-from-prop.
- P1: `kanban-board/KanbanPage.tsx:68`, `goals/GoalDetailDrawer.tsx:124`, `Timeline/SidebarRow.tsx:408`, `filters/FilterResultsPanel.tsx:316`, `kanban-board/components/Card.tsx:70`, `rich-text/atlaskit/EpicDescriptionEditor.tsx:509`.
- **Accept:** effect no longer runs per-frame (render-count / profiler). No behavior change.

### Slice E — Unmemoized render-body compute (P1×2, P2×1)
- `shared/JiraTable/JiraTable.tsx:2963-2972` — 3 chained filters per keystroke → useMemo.
- `product-dashboard/widgets/ActiveInitiativesWidget.tsx:474` — flatMap+filter every render → useMemo.
- `for-you/ForYouStatsBar.tsx:26` — Object.entries+filter → useMemo.
- **Accept:** memoized; identical output.

### Slice F — Realtime channel teardown verify + fix (P1)
Verify ~20 candidate files (`useKanbanRealtime.ts`, `useWorkItemRealtime.ts`, `ChatMainView.tsx`, `BoardCanvasPage.tsx`, `useEpicStatuses.ts`, `PlanHubShell.tsx`, activity sections, etc.) each `.channel()` has `removeChannel`/`unsubscribe` on unmount (in-file or shared helper). Fix only real leaks.
- **Accept:** every channel torn down on unmount (verified per file).

### Slice G — prismjs lazy language packs (P2)
- `.../Description/utils/prismHighlight.ts:22-38` — 10 eager lang packs → dynamic import per language.
- **Accept:** editor chunk smaller; highlighting still works.

### Slice H — Bundle-regression visibility (P2, config)
- `vite.config.ts:753` `reportCompressedSize: false` → `true` (surface gzip sizes in CI).
- **Accept:** build prints compressed sizes.

---

## GATES (every slice)
- ADS color grep before any styled-file commit (CLAUDE.md hard stop).
- `tsc` + targeted tests green.
- Screenshot only for UI-affecting slices (D editor, E table).
- Stage explicit files only. No `git add -A`.
- RED FLAG + stop on any regression.

## VALIDATION COMMANDS
- `npx tsc --noEmit` (or project typecheck)
- `npm run lint` on touched files
- `npm run build` for bundle-touching slices (G, H)
- Per-slice acceptance above.

## ORDER
A → B → E → D → C → F → G → H. (Safest/highest-value first; C/D moderate; spikes deferred.)
