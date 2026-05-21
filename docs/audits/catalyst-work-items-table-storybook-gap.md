# Catalyst Left Panel Navigator — Storybook Gap Analysis

> Preflight audit — 2026-05-21. No fixes applied.
> Primary files scanned: `src/components/workhub/issue-view/IssueListPanel.tsx`,
> `external/catycomponents/apps/storybook/src/Data/DynamicTable.stories.tsx`
> Evidence: Rovo spec (sections 1–21) + filesystem grep for `*.stories.*` under `src/`.

---

## 1. Story Coverage — Verdict by Component

| Component | Storybook stories found | Verdict |
|---|---|---|
| `IssueListPanel` (active left-panel navigator) | **0** | ❌ No coverage |
| `JiraTable` (canonical backlog table) | **0** | ❌ No coverage |
| `AllWorkSplitView` (deprecated) | **0** | ❌ No coverage |
| `@catylast/dynamic-table` (external component library) | **15** stories | ✅ External library only — not the production surface |

**Total story files under `src/`:** 0

The `external/catycomponents/apps/storybook/` directory contains a fully-fledged Storybook for the external `@catylast` component library (`@catylast/dynamic-table`, `@catylast/primitives`, etc.). This is **not** the Catalyst production application's Storybook — it documents the design system's own `DynamicTable` primitive, which is a different component from either `IssueListPanel` or the production `JiraTable`.

---

## 2. Required Stories per Rovo Spec — Full Gap Table

The Rovo Left Panel Navigator spec implies the following Storybook stories as regression anchors. Every row is currently a gap.

### 2.1 Core State Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `Default` | 20 cards, no selection, light mode, sort = "Last viewed" | Section 3.2 card list | ❌ Missing |
| `Loading/Skeleton` | 6 skeleton cards on initial load; spinner at list bottom during page fetch | Sections 3.2, 7.2 | ❌ Missing |
| `Empty/NoResults` | Search miss: "No issues match your filters." with icon + sub-label | Section 3.2 empty state | ❌ Missing |
| `Error/LoadFailed` | "Failed to load more issues. Retry" inline link | Section 7.2 error state | ❌ Missing |
| `EndOfList` | All 50 items rendered, footer shows final count, no spinner | Section 3.4, 7.2 | ❌ Missing |

### 2.2 Interaction State Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `CardSelected` | One card in selected state (blue left rail, `#E9F2FF` bg, key `#0C66E4`) | Section 3.3 selected card | ❌ Missing |
| `CardHover` | Hover state background = `var(--ds-background-neutral-subtle-hovered)` | Section 3.3 hover | ❌ Missing |
| `CardFocusRing` | Keyboard focus ring on a card via `@atlaskit/focus-ring` | Section 5 ARIA | ❌ Missing |
| `CardActiveHover` | Selected card + hover = `#CCE0FF` overlay | Section 3.3 active+hover | ❌ Missing |
| `CardPressed` | Mousedown depressed state | Section 3.3 pressed | ❌ Missing |

### 2.3 Content Variant Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `LongSummary` | Summary wraps to 3+ lines with **no** truncation | Section 3.3.1 — "no hard limit, show full text" | ❌ Missing |
| `ShortSummary` | Single-line summary, card collapses to minimum height | Section 3.3.1 min-height ~56px | ❌ Missing |
| `AllIssueTypes` | One card per issue type (Story, Epic, Feature, Task, QA Bug, PI, CR, Business Gap, Backend) each with correct `JiraIssueTypeIcon` at 20px | Section 3.3.2 issue type icon | ❌ Missing |
| `AvatarVariants` | Assigned card (avatar), unassigned card (placeholder), avatar tooltip | Section 3.3.4 assignee | ❌ Missing |
| `FooterCountVariants` | "12 of 50", "50 of 1000+", "1 of 1", "0 of 0" | Section 3.4 result count | ❌ Missing |

### 2.4 Sort & Filter Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `SortMenuOpen` | Sort dropdown open with 10 radio options, checkmark on active | Section 3.1 sort config | ❌ Missing |
| `SortAscending` | Arrow-up icon active, cards sorted A→Z by current sort key | Section 3.1 sort direction | ❌ Missing |
| `SortDescending` | Arrow-down icon active, cards sorted Z→A | Section 3.1 sort direction | ❌ Missing |
| `RefreshLoading` | Refresh button rotates 360° while request in-flight | Section 3.1 refresh button | ❌ Missing |
| `GroupByOpen` | Group-by selector open with field options (spec: Parent, Status, Assignee, Priority, etc.) | Section 3.1 group-by | ❌ Missing |

### 2.5 Infinite Scroll Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `Page1Loaded` | First 50 items, spinner at bottom, footer "50 of 1000+" | Section 7 infinite scroll | ❌ Missing |
| `Page2Loading` | Items 51–100 fetching; Atlaskit `<Spinner size="medium">` visible | Section 7.2 load-more | ❌ Missing |
| `ScrollDebounce` | Rapid scroll does not trigger duplicate fetches (200ms debounce) | Section 7.2 debounce | ❌ Missing |

### 2.6 Keyboard Navigation Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `KeyboardArrows` | ArrowUp/ArrowDown move selection through cards | Section 5 keyboard | ❌ Missing |
| `KeyboardJK` | J moves down, K moves up | Section 5 keyboard | ❌ Missing |
| `KeyboardEnter` | Enter opens detail pane for focused card | Section 5 keyboard | ❌ Missing |
| `KeyboardHomeEnd` | Home jumps to first card, End jumps to last | Section 5 keyboard | ❌ Missing |
| `KeyboardEscape` | Escape moves focus to detail pane | Section 5 keyboard | ❌ Missing |

### 2.7 Dark Mode Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `DarkModeDefault` | Same as Default but with ADS dark theme via `setGlobalTheme` | Section 8 dark mode | ❌ Missing |
| `DarkModeSelected` | Selected card in dark theme (tokens auto-flip; no `.dark .` override needed) | Section 8 dark mode | ❌ Missing |
| `DarkModeLoading` | Skeleton cards in dark theme | Section 8 dark mode | ❌ Missing |

### 2.8 Accessibility (ARIA) Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `ScreenReaderLabels` | `role="navigation"` on panel, `role="listbox"` on card list, `aria-label="Issues"` visible to AT | Section 5 ARIA | ❌ Missing |
| `AriaActiveDescendant` | `aria-activedescendant` on listbox points to selected card's `id` | Section 5 ARIA | ❌ Missing |
| `AriaLiveFooter` | Footer `aria-live="polite"` fires when count updates | Section 3.4 ARIA | ❌ Missing |
| `AriaSortAnnouncement` | Sort change is announced to screen readers | Section 5 ARIA | ❌ Missing |

### 2.9 Panel Width & Responsive Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `PanelMinWidth` | Panel at 360px — cards, text, icons all still readable | Section 2 min 360px | ❌ Missing |
| `PanelMaxWidth` | Panel at 420px — card content does not over-stretch | Section 2 max ~420px | ❌ Missing |
| `PanelResizable` | User drags divider; panel width reflects new size | Section 2 resizable | ❌ Missing |

### 2.10 Performance Stories

| Story name | What it must cover | Evidence from Rovo spec | Gap? |
|---|---|---|---|
| `1000Cards` | 1000 items, virtual rendering active (spec: `react-window` for 100+ cards); FPS ≥ 60 | Section 7.3 virtual rendering | ❌ Missing |
| `SlowNetwork` | Network throttled; skeleton shows for >300ms then cards render | Section 7.2 | ❌ Missing |

---

## 3. External Library Storybook — What Exists (for reference)

`external/catycomponents/apps/storybook/src/Data/DynamicTable.stories.tsx` contains 15 stories for the `@catylast/dynamic-table` package. These are **not** production-app stories for `IssueListPanel` — they document the separate design-system component library.

| Story exported | Covers |
|---|---|
| `Default` (Basic) | Minimum two-prop usage — columns + data |
| `SortableColumns` | Column-header click sorting |
| `PinnedColumns` | Sticky left-column pinning |
| `Selection` | Multi-row checkbox selection |
| `RowExpansion` | Hierarchical row expand/collapse |
| `ColumnVisibility` | Column picker toggle |
| `CustomCells` | Render-prop cell customization |
| `InlineEditing` | Status + assignee inline edit |
| `WithToolbar` | Toolbar left/right slots with filter input |
| `Compact` | Compact density (28px row height) |
| `Comfortable` | Comfortable density (44px row height) |
| `ReadOnly` | All interactivity disabled |
| `Empty` | Empty data set with custom message |
| `Loading` | Loading state |
| `Pagination` (+ `PaginationPositions`) | Per-page navigation, position variants |
| `IconOnlyType` | `WorkItemTypeIcon` with/without label |
| `Showcase` | Full feature showcase |

**Note:** `@catylast/dynamic-table` uses `@catylast/tokens` (not `@atlaskit/tokens`). It is NOT the Catalyst production `JiraTable` or `IssueListPanel` — it is the external component library's own table primitive.

---

## 4. Gap Summary

| Category | Stories required | Stories exist | Gap count |
|---|---|---|---|
| Core states | 5 | 0 | 5 |
| Interaction states | 5 | 0 | 5 |
| Content variants | 5 | 0 | 5 |
| Sort & filter | 5 | 0 | 5 |
| Infinite scroll | 3 | 0 | 3 |
| Keyboard navigation | 5 | 0 | 5 |
| Dark mode | 3 | 0 | 3 |
| ARIA / a11y | 4 | 0 | 4 |
| Panel width / responsive | 3 | 0 | 3 |
| Performance | 2 | 0 | 2 |
| **TOTAL** | **40** | **0** | **40** |

**Coverage: 0 / 40 = 0%.**

Every state the Rovo spec defines has zero Storybook story anchoring it. There is no visual regression baseline, no interaction test harness, no accessibility play-function, and no performance benchmark for the Left Panel Navigator surface.

---

## 5. Pre-conditions Before Stories Can Be Written

The following defects must be resolved before stories can be reliably authored or maintained:

1. **`-webkit-line-clamp: 2`** — Any "LongSummary" story cannot exercise the spec (no truncation) while the CSS clamp is present. Story would document incorrect behavior.
2. **`totalCount` prop ignored** — FooterCountVariants story cannot produce "12 of 50" because the logic bug renders `sortedItems.length` on both sides. The story would always render wrong output.
3. **`overflow-y: scroll !important`** — Scrollbar stories cannot use `overflow: auto`. Story would pin incorrect behavior.
4. **Lucide icons via `@/lib/atlaskit-icons`** — Icon stories would verify the wrong icon set. They must import `@atlaskit/icon` to be valid.
5. **Panel width 240px** — PanelMinWidth story cannot exercise spec-minimum 360px while CSS `--aw-left: 240px` is in effect.
6. **No `@atlaskit/spinner`** — Page2Loading story cannot show the correct Atlaskit spinner because it is not implemented.
7. **No group-by** — GroupByOpen story cannot be written because the `GroupBySelector` component does not exist.
8. **`CatalystOwnerAvatar` instead of `@atlaskit/avatar`** — AvatarVariants story cannot verify spec-compliant 28px avatar with white ring.

---

## 6. Storybook Infrastructure Status

| Infrastructure item | Status | Notes |
|---|---|---|
| `.storybook/` config under `src/` | **Absent** | No Storybook configured for main Catalyst app |
| Storybook package.json dependency | Unknown — not checked | Would need `@storybook/react-vite` or similar |
| External `@catylast` Storybook | Present at `external/catycomponents/apps/storybook/` | Different codebase, different tokens, not for production-app stories |
| Visual regression (Playwright/Chromatic) | **Absent** for production app | Only exists in external `catylast-storybook` via `storybook:visual` scripts |
| Interaction tests (play functions) | **Absent** for production app | None for any `src/` component |

To write stories for `IssueListPanel`, a Storybook instance must first be configured for the main `catalyst-prod-45` app. No stories can be written, run, or automatically verified until that infrastructure exists.
