# Catalyst Work Items — Left Panel Navigator: Current Implementation Map

> Preflight audit — 2026-05-21. No fixes applied.
> Rovo evidence pack: Jira Left Panel Navigator specification (sections 1–21).

---

## 1. Component Hierarchy

```
<IssueViewShell>               src/components/workhub/issue-view/IssueViewShell.tsx
└── <IssueListPanel>           src/components/workhub/issue-view/IssueListPanel.tsx (264 LOC)
    ├── <div.jlpHeader>        Sticky sort toolbar
    │   ├── <div.jlpSortRow>
    │   │   ├── <button.jlpSortBtn>  Sort-order dropdown trigger (label + ChevronDown)
    │   │   ├── <button.jlpToolBtn>  Sort direction toggle (ArrowUpNarrowWide / ArrowDownNarrowWide)
    │   │   └── <button.jlpToolBtn>  Refresh button (RotateCcw icon)
    │   └── <div.jlpSortMenu>  Self-rolled radio-list dropdown (conditionally rendered)
    ├── <div.jlpBody>          Scrollable card list (tabIndex=0, onKeyDown)
    │   ├── [Skeleton cards]   6×skeleton on initial load
    │   ├── <div.jlpEmpty>     Empty state (no items / search miss)
    │   └── <div.jlpCards role="listbox" aria-label="Issues">
    │       └── <div.jlpCard role="option" aria-selected>   Per-issue card
    │           ├── <div.jlpCardSummary>  Summary text (2-line clamp ← VIOLATION)
    │           └── <div.jlpCardFooter>
    │               ├── <div.jlpCardMeta>
    │               │   ├── <JiraIssueTypeIcon>  Issue type icon
    │               │   └── <IssueKeyLink.jlpCardKey>  Issue key
    │               └── <CatalystOwnerAvatar>  Assignee avatar (size="md")
    └── <div.jlpFooterCount>   "N of <strong>N</strong>" footer (broken logic)

Legacy (deprecated 2026-04-19 — DO NOT EDIT):
<AllWorkSplitView>             src/components/workhub/allwork/AllWorkSplitView.tsx (756 LOC)
  └── Left card list (custom, pre-JiraIssueTypeIcon era, Lucide icons throughout)
```

---

## 2. File Inventory

| File | Purpose | Imports Atlaskit? | Styling method | Risk |
|---|---|---|---|---|
| `src/components/workhub/issue-view/IssueListPanel.tsx` | **Active** left-panel card list | Partial — `JiraIssueTypeIcon` only; uses `@/lib/atlaskit-icons` (Lucide re-exports) for ChevronDown/ArrowUpNarrowWide/ArrowDownNarrowWide/RotateCcw | Global CSS via `src/styles/allwork.css` (`.jlp*` classes) | HIGH — active surface |
| `src/components/workhub/issue-view/IssueViewShell.tsx` | Shell that mounts IssueListPanel + detail pane | Unknown (not read) | Unknown | MEDIUM |
| `src/styles/allwork.css` | 1700+ LOC CSS for the entire allwork surface including `.jlp*` card-list rules + `.aw*` detail-panel rules | N/A | Raw CSS with `var(--cp-*)` + `var(--ds-*)` mixed tokens, hardcoded hex fallbacks | HIGH — primary token risk |
| `src/components/workhub/allwork/AllWorkSplitView.tsx` | DEPRECATED split-view (legacy `/workhub/all-work` route) | None — all Lucide icons | Inline styles + ad-hoc CSS | MEDIUM (deprecated but still compiled) |
| `src/types/issue-view.types.ts` | Type definitions for the issue-view module | N/A | N/A | LOW |
| `src/components/workhub/issue-view/index.ts` | Barrel export | N/A | N/A | LOW |
| `src/pages/project-hub/HierarchyAllWorkPage.tsx` | Consumer of IssueListPanel | Unknown | Unknown | MEDIUM |

---

## 3. Sub-Component Map

### 3.1 Header Toolbar

| Sub-component | Implementation | Spec requires | Delta |
|---|---|---|---|
| Container | `<div.jlpHeader>` sticky top, border-bottom | 48px height, `flex`, `align-items: center`, `justify-content: space-between` | Height not explicitly set — rendered height unknown |
| Group-by selector | **ABSENT** — replaced by a sort-order dropdown | `<GroupBySelector>` with field label + ChevronDown, `role="button"`, `aria-haspopup="listbox"` | **CRITICAL GAP** |
| Sort config button | Arrow-direction toggle (`ArrowUpNarrowWide` / `ArrowDownNarrowWide`) | `≡↕` icon button, opens popup for sort config, `@atlaskit/button <IconButton>` | Partial — direction toggle present but wrong icon/semantics |
| Refresh button | `RotateCcw` from Lucide (via `@/lib/atlaskit-icons`) | `RefreshIcon` from `@atlaskit/icon`, 360° rotation animation on click | Wrong icon source; no animation |
| Header chevron | `ChevronDown` from `@/lib/atlaskit-icons` (Lucide) | `ChevronDownIcon` from `@atlaskit/icon`, rotates 180° when dropdown open | Wrong icon source |

### 3.2 Issue Card List

| Sub-component | Implementation | Spec requires | Delta |
|---|---|---|---|
| List container | `<div.jlpBody>` — `overflow-y: scroll`, `scrollbar-gutter: stable` | `flex-direction: column`, `overflow-y: auto`, `background: #F7F8F9` (gap color) | Scrollbar 20px wide; background not set as card-gap mechanism |
| Card separator | `border-bottom: 1px solid var(--aw-border)` on each card | `1px gap` via container `background: #F7F8F9` showing through | Method differs — border vs gap |
| Scrollbar | `::-webkit-scrollbar { width: 20px }` — very wide | 6–8px thin style | Width 2.5–3× too large |
| Infinite scroll | **ABSENT** — all items rendered at once | IntersectionObserver at ~200px from bottom, 50-item pages | **CRITICAL GAP** |
| Load-more spinner | **ABSENT** | `@atlaskit/spinner <Spinner size="medium">` at list bottom | **CRITICAL GAP** |
| Virtual rendering | **ABSENT** — no `@tanstack/react-virtual` or similar | `react-window` for 100+ cards | **GAP** |

### 3.3 Issue Card

| Sub-component | Implementation | Spec requires | Delta |
|---|---|---|---|
| Card container | `<div.jlpCard>` — `padding: 12px 16px`, `border-left: 3px solid transparent` | `padding: 16px`, `position: relative`, `min-height: ~56px` | Padding 4px short; min-height missing |
| Left accent bar | `border-left: 3px solid transparent` → `#0C66E4` on selected | `position: absolute; left: 0; top: 0; bottom: 0; width: 3px` | Method works but border approach collapses to nothing on very narrow containers |
| Summary text | `<div.jlpCardSummary>` — **`-webkit-line-clamp: 2`** | No truncation — full summary, unlimited lines | **P0 SPEC VIOLATION** — spec explicitly says "no hard limit" |
| Active summary color | `.jlpCardSummaryActive { color: #0C66E4; font-weight: 500 }` | `color: #0C66E4 (color.text.selected)` | Color ✓ but `font-weight: 500` deviates (spec says 400) |
| Issue key color | `.jlpCardKey { color: var(--aw-text-subtle) }` — always same color | Active card: `#0C66E4`; Inactive: `#44546F` | Active state key color not applied |
| Metadata row | `<div.jlpCardFooter>` flex, `justify-content: space-between` | `align-items: center`, `justify-content: space-between`, height 24px | Height not set |
| Issue type icon | `<JiraIssueTypeIcon type={...} size={16}>` | 20px × 20px, `border-radius: 50%` circle | Size 16px vs spec 20px |
| Assignee avatar | `<CatalystOwnerAvatar size="md">` | `@atlaskit/avatar <Avatar size="small">` 28px × 28px, `border: 2px solid #FFFFFF` | Custom component; size likely 32px (md); no white ring |
| Avatar tooltip | Handled inside `CatalystOwnerAvatar showTooltip` | `@atlaskit/tooltip` — appears after 300ms | Wrapped — may differ in delay/styling |
| Card states | hover ✓, selected ✓ | hover, selected, active+hover, focused, pressed | Active+hover (`#CCE0FF`) missing; pressed missing; focus ring missing |

### 3.4 Panel Footer

| Sub-component | Implementation | Spec requires | Delta |
|---|---|---|---|
| Container | `<div.jlpFooterCount>` sticky bottom, `border-top` | 40px height, `flex`, `justify-content: center` | Height not set |
| Result count | `{sortedItems.length} of <strong>{sortedItems.length >= 1000 ? '1000+' : sortedItems.length}</strong>` | `"{loadedCount} of {totalCount}"` — loaded in regular weight, total in bold blue | **LOGIC BUG**: both numbers use `sortedItems.length`; `totalCount` prop ignored; loaded count always equals total rendered |
| Count ARIA | **ABSENT** | `aria-live="polite"` | Missing live region |

---

## 4. Data Model

| Aspect | Current | Spec |
|---|---|---|
| Data source | `items: AllWorkItem[]` prop — parent fetches everything | JQL result set, 50/page |
| Page size | N/A — all items passed in | 50 per page |
| Current selection | `selectedIssueKey: string \| null` prop | Single issue key |
| Grouping field | **ABSENT** | Group-by field (Parent, Status, Assignee, Priority, etc.) |
| Sort order | Local `useState<SortKey>` + `sortAsc` | JQL `ORDER BY` or sort config |
| Total count | `totalCount?: number` prop — **accepted but unused in render** | `totalCount` from API, may show `1000+` |
| Loaded count | `sortedItems.length` (= total rendered, not paginated) | Increments per page fetch |

---

## 5. Sort Model

- **Current**: 10-option radio-list dropdown (Last viewed / Created / Key / Priority / Resolved / Status / Work type / Assignee / Reporter / Summary)
- **Spec**: Sort is part of the sort-config popup (`≡↕` button); grouping is a separate concept on the left side of the header
- **Delta**: Sort is implemented but conflated with group-by; no secondary sort; no sort-config popup UX

---

## 6. Keyboard Model

| Key | Current | Spec |
|---|---|---|
| ArrowUp | ✓ (onKeyDown on jlpBody) | ✓ |
| ArrowDown | ✓ | ✓ |
| J / K | **ABSENT** | Required |
| Enter | **ABSENT** | Required |
| Space | **ABSENT** | Required |
| Home | **ABSENT** | Required |
| End | **ABSENT** | Required |
| Tab | Native browser behavior only | Navigate header → cards → footer |
| Escape | **ABSENT** | Move focus to detail pane |

---

## 7. Pagination / Infinite Scroll Model

| Aspect | Current | Spec |
|---|---|---|
| Strategy | All items rendered (no pagination) | Infinite scroll — 50 items per page |
| Trigger | N/A | IntersectionObserver at ~200px from bottom |
| Load indicator | Skeleton on initial load only | `@atlaskit/spinner` at list bottom |
| End-of-list | N/A | No further fetch; footer shows final count |
| Error handling | N/A | "Failed to load more issues. Retry" with retry link |
| Debounce | N/A | 200ms scroll debounce |

---

## 8. Dark Mode Model

| Aspect | Current | Spec |
|---|---|---|
| Mechanism | `.dark .jlp*` selector overrides in `allwork.css` (~20 rules) | ADS tokens flip natively — no overrides needed |
| Token usage | Mixed: some `var(--ds-*)`, many raw hex fallbacks | `@atlaskit/tokens` — all colors via tokens |
| Hard-coded dark values | `#111111`, `#1F1F21`, `#242528`, `#454545`, `#878787`, `#A1A1A1` | Not applicable — tokens handle dark |

---

## 9. CSS Files

| File | Size | Scope |
|---|---|---|
| `src/styles/allwork.css` | 1,700 LOC | All `.jlp*` (card list) + `.aw*` (shell/detail panel) rules |

No CSS modules. No styled-components. No Tailwind in this component.

---

## 10. Storybook / Test Files

| Type | File | Coverage |
|---|---|---|
| Storybook | **NONE** | — |
| Unit tests | **NONE** for IssueListPanel | — |
| E2E / Playwright | **NONE** specifically for left panel navigator | — |

---

## 11. ADS Component Usage

| Spec requires | Catalyst uses | Compliant? |
|---|---|---|
| `@atlaskit/dropdown-menu` (group-by) | Self-rolled `<div>` with radio inputs | ❌ |
| `@atlaskit/button IconButton` (sort/refresh) | Native `<button>` | ❌ |
| `@atlaskit/icon ChevronDownIcon` | `ChevronDown` from `@/lib/atlaskit-icons` (Lucide) | ❌ |
| `@atlaskit/icon RefreshIcon` | `RotateCcw` from `@/lib/atlaskit-icons` (Lucide) | ❌ |
| `@atlaskit/avatar Avatar` (assignee) | `CatalystOwnerAvatar` (custom component) | ❌ |
| `@atlaskit/tooltip Tooltip` (avatar/buttons) | Inside `CatalystOwnerAvatar` (unknown) | ❌ (unverified) |
| `@atlaskit/spinner Spinner` (load-more) | Custom skeleton only | ❌ |
| `@atlaskit/focus-ring` | Native browser focus (unstyled) | ❌ |
| `@atlaskit/tokens token()` | Mix of `var(--ds-*)` and `var(--cp-*)` and raw hex | ❌ partial |
