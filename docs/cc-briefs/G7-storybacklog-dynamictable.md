📋 CC TASK BRIEF — ProjectHub StoryBacklog → shared DynamicTable molecule
══════════════════════════════════════════════════════════════════════════

## CONTEXT

`StoryBacklogPage.tsx` (under `src/modules/project-work-hub/pages/`) currently renders its table via the bespoke "CatalystTable" pattern: `useTableColumns` for column model, `ResizableTableHeader` for the header row, and a hand-rolled `<tbody>` with custom cell renderers. It supports group-by, filter, bulk select, inline edit, and a star toggle.

The codebase already ships **two** DynamicTable implementations:

1. **`@atlaskit/dynamic-table@^15.2.0`** — used in `EpicBacklogTable.tsx`. One Atlaskit table per group (the canonical Jira-parity pattern). Already pre-bundled in `vite.config.ts` `optimizeDeps.include`.
2. **`@/components/shared/dynamic-table/DynamicTable.tsx`** — Catalyst's own molecule. TanStack-Table + react-virtual + Radix. Built explicitly to mirror Atlaskit's external API so call sites can swap implementations later with zero prop churn (see header comment in `DynamicTable.tsx`). Supports sort, resize, virtualize, group, select, expand, column visibility, sticky header, density.

**Why use the shared molecule (option 2) here, not raw Atlaskit:**

- StoryBacklogPage already needs grouping, resize, bulk select, virtualization, and column visibility. The shared molecule does all five out-of-the-box; raw Atlaskit needs you to render one DT per group, gives no resize, no virtualization, no built-in selection, no built-in visibility menu.
- The shared molecule's API is API-compatible with Atlaskit's, so when AK ships a feature-complete table (or the team finishes wrapping it), this surface gets the upgrade for free.
- One coherent table pattern across all four backlog pages is more maintainable than mixing CatalystTable / Atlaskit / shared.

---

## TASK

In `src/modules/project-work-hub/pages/StoryBacklogPage.tsx`, replace the current header-row + `<tbody>` rendering block with `<DynamicTable />` from `@/components/shared/dynamic-table`. Map the existing `STORY_COLUMNS` array (10 columns) to `DynamicTableColumn<BacklogStory>[]`. Wire the existing toolbar (group-by popover, filter, bulk action bar, search) to the molecule's `groups` / `data` / `selection` / `sorting` / `columnSizing` props. Preserve all current behaviour: keyboard nav, row click → CatalystDetailRouter, star toggle, inline edit on summary/status/priority, hover-reveal row actions.

Ship behind a feature flag. Read `localStorage.getItem('catalyst.table.v2')` at the top of the page; when truthy, render `<DynamicTable />`; otherwise render the existing CatalystTable code path unchanged. This keeps the legacy path live until the new one is verified in prod.

---

## FILES TO TOUCH

- `src/modules/project-work-hub/pages/StoryBacklogPage.tsx` (primary)

That is the only file. No new shared utilities, no new hooks, no schema changes, no edits to `JiraBasicFilter`, `GroupByPopover`, `JiraBulkActionBar`, `CatalystDetailRouter`, or any cell renderer.

---

## GUARDRAILS

Per CLAUDE.md:

- **Surgical scope.** One file. Don't refactor anything outside `StoryBacklogPage.tsx`. If a cell renderer needs a small wrapper, define it inline in the same file — do not add a new file in `components/shared/` or anywhere else.
- **Hex only, never HSL** (L38). Any new colour literal in this file is a hex.
- **No new `!important`, no new `.dark` blocks** (L34–L35). The molecule handles dark via Tailwind tokens; do not add `.dark .story-backlog-table { ... }` to `index.css`.
- **No HSL conversion drift** (L38). Use computed `rgb()` in DevTools to verify, not visual inspection.
- **No inline `style={{ background }}` props** for theming — let Tailwind classes inside the molecule do the work.
- **No new npm dependencies.** `@atlaskit/dynamic-table`, `@atlaskit/tokens`, and the shared molecule are all present already.
- **Feature flag is mandatory.** Reading `localStorage.catalyst.table.v2 === '1'`. Default = false (ships dark; legacy path remains the user-visible default until manual flip).
- **Preserve the JetBrains Mono key column.** Story keys must keep `font-family: 'JetBrains Mono', monospace`.
- **Preserve the canonical 36px row height** (table density spec in CLAUDE.md §4). Use `density="compact"` on the molecule, which renders 36px rows.
- **Preserve uppercase column headers** with `text-transform: uppercase` (FP-004).
- **Preserve always-hidden row actions revealed on hover** (`opacity:0 → 1`, FP-005). The molecule's `renderRowActions` already does this — verify in DevTools.
- **No work-item-type Lucide icons.** The Type column already uses `JiraIssueTypeIcon` — keep it (canonical SVG, FP-008).
- **Status column** must render via `STORY_STATUS_LOZENGE` (the existing 3-colour StatusLozenge), not a new pill.

---

## ACCEPTANCE CRITERIA

When `localStorage.catalyst.table.v2 = '1'`:

- [ ] Page renders without runtime error; no console errors on cold load.
- [ ] All 10 columns appear in the same order (checkbox, star, type, key, summary, status, parent, assignee, priority, updated).
- [ ] Row height = 36px (verify via DevTools `getBoundingClientRect().height`).
- [ ] Header row text-transform: uppercase, font-weight 600+, 11px.
- [ ] Story key column uses JetBrains Mono.
- [ ] Status column shows the 3-colour lozenge from `STORY_STATUS_LOZENGE`.
- [ ] Group-by popover still works; switching groups re-renders sections with collapsible group headers.
- [ ] Filter chips (`JiraBasicFilter`) still apply; filtered rows do not appear.
- [ ] Search input filters rows live.
- [ ] Star toggle still works; favourited stories show the filled star.
- [ ] Click row → `CatalystDetailRouter` opens the detail drawer for that story.
- [ ] Inline edit on Summary, Status, Priority cells still saves (mutation invalidates the query).
- [ ] Multi-select via checkbox + shift-click range select; bulk action bar appears with correct count.
- [ ] Bulk delete and bulk update work end-to-end (toast confirms, query invalidates).
- [ ] Sort header on Key, Summary, Status, Parent, Assignee, Priority, Updated works asc/desc.
- [ ] Column resize via drag-to-resize works on resizable columns; persists to localStorage under key `catalyst.table.story-backlog`.
- [ ] Virtualization kicks in at >60 rows (DOM contains far fewer row nodes than data length).
- [ ] Keyboard: ArrowUp/Down moves highlight, Enter opens detail, `/` focuses search, Escape closes context menu.
- [ ] Dark mode parity: header bg, row hover, selected row, group header, all match the `EpicBacklogTable` Atlaskit version side-by-side at `rgb()` level.
- [ ] No new `!important` blocks introduced (`grep -rn "!important" src/modules/project-work-hub/pages/StoryBacklogPage.tsx` returns zero).
- [ ] No new `.dark` block added to `index.css`.
- [ ] No HSL values appear anywhere in the file.

When the flag is false (default): zero behavioural change — the legacy CatalystTable path renders byte-identically to before.

---

## DO NOT TOUCH

- `src/components/shared/dynamic-table/*` — the molecule itself stays as-is. If you discover a missing capability, document it in the QA note and stop; do not modify the shared component as part of this brief.
- `src/modules/project-work-hub/components/EpicBacklogTable/*` — the Atlaskit reference is already shipped; leave it alone.
- `src/components/shared/JiraBasicFilter.tsx`
- `src/components/shared/GroupByPopover.tsx`
- `src/components/shared/JiraBulkActionBar.tsx`
- `src/components/catalyst-detail-views/CatalystDetailRouter.tsx`
- `src/hooks/useTableColumns.ts` — only the legacy path uses this; keep it intact for the flag-off case.
- `src/components/shared/ResizableTableHeader.tsx` — same as above.
- `src/index.css`
- `package.json`, `vite.config.ts` — pre-flight is already done.
- Any other backlog page (`NativeEpicBacklogPage`, `NativeFeatureBacklogPage`, etc.) — those get their own briefs.

---

## VERIFICATION OUTPUT (paste back to chat after build)

```
✅ FIX VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━
Component:    StoryBacklogPage
File:         src/modules/project-work-hub/pages/StoryBacklogPage.tsx
Change type:  table-rendering swap behind feature flag

Changes made:
  - <bullets: column mapping, prop wiring, flag wrapper>

Checks:
  □ No new !important blocks introduced
  □ No duplicate .dark selectors added
  □ No HSL values in output
  □ No inline style={{ background }} props on theme surfaces
  □ Feature flag wraps both paths
  □ STORY_COLUMNS → DynamicTableColumn mapping is 1:1 (10 cols)
  □ Files touched: StoryBacklogPage.tsx
  □ Files NOT touched: shared/dynamic-table/*, JiraBasicFilter, GroupByPopover, JiraBulkActionBar, CatalystDetailRouter, useTableColumns, ResizableTableHeader, index.css, package.json, vite.config.ts

Send to Vikram for DevTools verification.
```
