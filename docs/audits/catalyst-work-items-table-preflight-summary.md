# Catalyst Left Panel Navigator — Preflight Audit Summary

> Preflight audit — 2026-05-21. **No fixes applied.**
> Component audited: `IssueListPanel` (left panel navigator of the All Work / Issue View split pane)
> Evidence: Rovo spec sections 1–21, CLAUDE.md ADS guardrails, WCAG 2.1 AA, live codebase
> Full audit documents in `docs/audits/`

---

## Audit Documents Produced

| # | Document | Status |
|---|---|---|
| 1 | `catalyst-work-items-table-current-map.md` | ✅ Complete |
| 2 | `catalyst-work-items-table-ads-gap-analysis.md` | ✅ Complete (56 rows) |
| 3 | `catalyst-work-items-table-css-token-violations.md` | ✅ Complete (44+ violations) |
| 4 | `screenshots/work-items-table/` | ⚠️ Directory created; runtime capture deferred pending browser session |
| 5 | `catalyst-work-items-table-storybook-gap.md` | ✅ Complete (40 stories missing, 0% coverage) |
| 6 | `catalyst-work-items-table-a11y-gap.md` | ✅ Complete (23 gaps, 8 P0) |
| 7 | `catalyst-work-items-table-preflight-summary.md` | ✅ This document |

---

## 1. Component Overview (What Was Audited)

The audit targets the **Jira Left Panel Navigator** — the scrollable issue-card sidebar that appears in the split-view layout at `/project-hub/BAU/allwork`. The Catalyst implementation is `IssueListPanel.tsx` (264 LOC) styled by `allwork.css` (1,700 LOC, scoped to `.jlp*` selectors).

This is **not** `@atlaskit/dynamic-table` or `JiraTable`. It is a card-list sidebar component, architecturally distinct from the backlog table. The Rovo spec supplied for this audit precisely describes this sidebar's component architecture across 21 sections.

---

## 2. Top 20 Parity Gaps (vs Rovo Spec)

Ranked by spec severity. Full 56-row matrix in `catalyst-work-items-table-ads-gap-analysis.md`.

| Rank | Gap | Severity | Files |
|---|---|---|---|
| 1 | **Summary truncation** — `-webkit-line-clamp: 2` in CSS; spec says no truncation | **P0** | `allwork.css:364` |
| 2 | **Group-by selector** — completely absent; spec requires `@atlaskit/dropdown-menu` group-by | **P0** | `IssueListPanel.tsx` |
| 3 | **Infinite scroll** — all items rendered at once; spec requires IntersectionObserver + 50/page | **P0** | `IssueListPanel.tsx` |
| 4 | **Footer count logic bug** — both sides read `sortedItems.length`; `totalCount` prop unused | **P0** | `IssueListPanel.tsx:247` |
| 5 | **Panel width 240px** — `--aw-left: 240px` in grid; spec requires ~360–420px | **P0** | `allwork.css:180` |
| 6 | **`role="navigation"` absent** — no landmark wrapper; WCAG 2.4.1 failure | **P0** | `IssueListPanel.tsx` |
| 7 | **`aria-activedescendant` absent** — keyboard navigation silent to AT | **P0** | `IssueListPanel.tsx` |
| 8 | **Card `id` absent** — prerequisite for `aria-activedescendant` | **P0** | `IssueListPanel.tsx` |
| 9 | **Card focus ring absent** — no `:focus-visible` ring; WCAG 2.4.7 failure | **P0** | `allwork.css` |
| 10 | **Group headers absent** — when grouping active, no collapsible group header rows | **P0** | `IssueListPanel.tsx` |
| 11 | **All icons wrong library** — ChevronDown, RotateCcw, ArrowUpNarrowWide all from Lucide via `@/lib/atlaskit-icons`; spec requires `@atlaskit/icon` | **P1** | `IssueListPanel.tsx:2` |
| 12 | **Card padding 12px** — spec requires `16px`; 4px short on top/bottom | **P1** | `allwork.css:351` |
| 13 | **Issue type icon 16px** — spec requires 20px | **P1** | `IssueListPanel.tsx:197` |
| 14 | **Assignee avatar wrong component** — `CatalystOwnerAvatar size="md"` (~32px); spec requires `@atlaskit/avatar size="small"` (28px) + 2px white ring | **P1** | `IssueListPanel.tsx:200` |
| 15 | **Hover token wrong** — `var(--ds-surface-sunken)` resolves to wrong color; spec: `var(--ds-background-neutral-hovered)` | **P1** | `allwork.css:357` |
| 16 | **Active card key color not applied** — key always uses `--aw-text-subtle`; selected card should use `#0C66E4` | **P1** | `allwork.css` |
| 17 | **Scrollbar width 20px** — spec requires 6–8px | **P1** | `allwork.css:320` |
| 18 | **Keyboard: J/K, Enter, Home/End, Escape absent** — only ArrowUp/Down implemented | **P1** | `IssueListPanel.tsx:152` |
| 19 | **Auto-scroll to active card absent** — arrow-key navigation does not scroll card into view | **P1** | `IssueListPanel.tsx` |
| 20 | **Sort/toolbar buttons not `@atlaskit/button IconButton`** — native `<button>`; ADS requires `@atlaskit/button` | **P1** | `IssueListPanel.tsx:162` |

---

## 3. Top 20 CSS / Token Violations

Ranked by impact. Full 44-row table in `catalyst-work-items-table-css-token-violations.md`.

| Rank | File | Line | Current value | Violation | Suggested token |
|---|---|---|---|---|---|
| 1 | `allwork.css` | 313 | `overflow-y: scroll !important` | `!important` banned per CLAUDE.md | `overflow-y: auto` |
| 2 | `allwork.css` | 364 | `-webkit-line-clamp: 2` | Spec violation (no truncation) | Remove |
| 3 | `allwork.css` | 180 | `--aw-left: 240px` | Panel width below spec minimum | `clamp(360px, 30vw, 420px)` |
| 4 | `allwork.css` | 8 | `--aw-bg: var(--cp-bg-elevated, ...)` | Non-ADS `--cp-*` token | `var(--ds-surface, #FFFFFF)` |
| 5 | `allwork.css` | 10 | `--aw-hover: var(--ds-surface-sunken, ...)` | Wrong token for hover | `var(--ds-background-neutral-subtle-hovered, #091E420F)` |
| 6 | `allwork.css` | 11 | `--aw-text: var(--ds-text, var(--cp-text-primary, ...))` | Triple-nested with non-ADS tokens | `var(--ds-text, #172B4D)` |
| 7 | `allwork.css` | 13 | `--aw-border: rgba(9,30,66,0.13)` | Raw `rgba()` | `var(--ds-border, #091E4224)` |
| 8 | `allwork.css` | 14 | `--aw-blue: #0C66E4` | Hardcoded hex root variable | `var(--ds-border-brand, #0C66E4)` |
| 9 | `allwork.css` | 320 | `::-webkit-scrollbar { width: 20px }` | Scrollbar 2.5× too wide | `width: 6px` |
| 10 | `allwork.css` | 283 | `box-shadow: 0 4px 16px rgba(9,30,66,0.15)` | Raw `rgba()` shadow | `var(--ds-shadow-overlay, ...)` |
| 11 | `allwork.css` | 304 | `accent-color: #0C66E4` | Hardcoded hex | `var(--ds-background-brand-bold, #0C66E4)` |
| 12 | `allwork.css` | 351 | `padding: 12px 16px` on `.jlpCard` | Off-grid (spec: 16px) | `padding: 16px` |
| 13 | `allwork.css` | 374 | `color: #0C66E4` on `.jlpCardSummaryActive` | Hardcoded hex — and contrast ratio 3.85:1 fails WCAG AA | `var(--ds-text-selected, #0C66E4)` |
| 14 | `allwork.css` | 391 | `color: var(--aw-text-subtle)` on `.jlpCardKey` | Resolves to `color.text.subtlest`; spec: `color.text.subtle` | `var(--ds-text-subtle, #44546F)` |
| 15 | `allwork.css` | 246 | `font: 500 13px/28px` on `.jlpSortBtn` | 13px not on ADS scale | `font-size: 14px` |
| 16 | `allwork.css` | 84–503 | ~20 `.dark .jlp*` rules with hardcoded hex | ADS dark mode is token-native; overrides are unnecessary and break theme | Delete all; use `var(--ds-*)` tokens |
| 17 | `allwork.css` | 426 | `font: 400 13px/16px` on `.jlpFooterCount` | 13px not on ADS scale | `font-size: 14px` |
| 18 | `allwork.css` | 87 | `border-color: #85B8FF` on `:focus-within` | Hardcoded hex | `var(--ds-border-focused, #388BFF)` |
| 19 | `allwork.css` | 327 | `background: #A5ADBA` on scrollbar thumb | Hardcoded hex | `var(--ds-background-neutral-bold, #626F86)` |
| 20 | `IssueListPanel.tsx` | 238 | `color: 'var(--cp-primary-60, #0052CC)'` | `--cp-*` token on IssueKeyLink style | `var(--ds-link, #0C66E4)` |

---

## 4. Top 20 Dark Mode Violations

All are in `allwork.css` lines 484–503. Every `.dark .jlp*` rule is a violation because ADS tokens flip natively via `setGlobalTheme`. These override rules prevent the ADS dark theme from working. The full list:

| Rank | Rule | Lines | What it overrides |
|---|---|---|---|
| 1–20 | All `.dark .jlp*` rules | 484–503 | ~20 dark-mode selector overrides with hardcoded hex (`rgba(12,102,228,0.15)`, `#4C9AFF`, `rgba(12,102,228,0.12)`, etc.) instead of ADS tokens that would auto-flip |

Individually the worst are:

| Line | Rule | Issue |
|---|---|---|
| 496 | `.dark .jlpCard.jlpCardSelected { background: rgba(12,102,228,0.12) }` | Not ADS token; blocks dark `--ds-background-selected` |
| 499 | `.dark .jlpCardSummaryActive { color: #4C9AFF }` | Hardcoded; should be `var(--ds-text-brand)` |
| 484 | `.dark .jlpBody { background: #1D2125 }` | Hardcoded; should be `var(--ds-surface, ...)` |
| 487 | `.dark .jlpCard { background: #1D2125; border-bottom-color: rgba(255,255,255,0.06) }` | Both hardcoded |
| 489 | `.dark .jlpCard:hover { background: rgba(255,255,255,0.04) }` | Hardcoded; wrong hover token |
| 492 | `.dark .jlpCardSummary { color: #C7D1DB }` | Hardcoded; should be `var(--ds-text)` |

**Remediation:** Delete all ~20 `.dark .jlp*` rules. Apply ADS tokens (`var(--ds-*)`) to the base light rules. The ADS theme system automatically inverts token values when the dark theme is active.

---

## 5. Top 20 Accessibility Gaps

Full analysis in `catalyst-work-items-table-a11y-gap.md` (23 gaps, 8 P0 WCAG failures).

| Rank | Gap | WCAG | Severity |
|---|---|---|---|
| 1 | `role="navigation"` + `aria-label="Issue list"` absent on panel wrapper | 2.4.1 Bypass Blocks (A) | P0 |
| 2 | `aria-activedescendant` absent on listbox — keyboard selection silent to AT | 4.1.2 Name/Role/Value (A) | P0 |
| 3 | Cards have no `id` attribute — `aria-activedescendant` cannot work | 4.1.2 Name/Role/Value (A) | P0 |
| 4 | Enter/Space do not activate selected card — keyboard-only users cannot open issues | 2.1.1 Keyboard (A) | P0 |
| 5 | J, K, Home, End, Escape keyboard shortcuts absent | 2.1.1 Keyboard (A) | P0 |
| 6 | No focus ring on cards or toolbar buttons | 2.4.7 Focus Visible (AA), 2.4.11 Focus Appearance (AA WCAG 2.2) | P0 |
| 7 | Active card summary text `#0C66E4` on `#E9F2FF` bg — contrast ratio **3.85:1 FAILS AA** (req. 4.5:1) | 1.4.3 Contrast Minimum (AA) | P0 |
| 8 | `tabIndex={0}` and `role="listbox"` are on different elements | 4.1.2 Name/Role/Value (A) | P1 |
| 9 | Sort button missing `aria-haspopup="listbox"` and `aria-expanded` | 4.1.2 Name/Role/Value (A) | P1 |
| 10 | Self-rolled sort dropdown — must be `@atlaskit/dropdown-menu` per CLAUDE.md | 2.1.1 Keyboard (A), 4.1.2 | P1 |
| 11 | Sort direction `<button>` uses `title` (unreliable AT) instead of `aria-label` | 4.1.2 Name/Role/Value (A) | P1 |
| 12 | Footer count has no `aria-live="polite"` — count changes silent to AT | 4.1.3 Status Messages (AA) | P1 |
| 13 | Loading skeleton: no `aria-busy="true"` / no `aria-hidden` on skeleton cards | 4.1.3 Status Messages (AA) | P1 |
| 14 | Empty state has no `role="alert"` or `aria-live` | 4.1.3 Status Messages (AA) | P1 |
| 15 | `JiraIssueTypeIcon` SVG not `aria-hidden` — decorative icon read by AT | 1.1.1 Non-text Content (A) | P2 |
| 16 | Lucide icon SVGs (`ChevronDown`, `RotateCcw`, etc.) not `aria-hidden` | 1.1.1 Non-text Content (A) | P2 |
| 17 | Assignee avatar has no accessible name when unassigned (`name={undefined}`) | 1.1.1 Non-text Content (A) | P2 |
| 18 | Sort dropdown group divider is plain `<div>` — no `role="separator"` | 1.3.1 Info and Relationships (A) | P2 |
| 19 | Issue key link announces key only — no type context for AT users | 1.3.3 Sensory Characteristics (A) | P2 |
| 20 | Sort direction state not communicated to AT (no `aria-label` update on toggle) | 4.1.2 Name/Role/Value (A) | P2 |

---

## 6. Missing Storybook Stories

Full list in `catalyst-work-items-table-storybook-gap.md`.

**Coverage: 0 / 40 = 0%.** No Storybook instance is configured for the main Catalyst app. Every required story is a gap.

| Category | Required | Exist |
|---|---|---|
| Core states (Default, Loading, Empty, Error, End) | 5 | 0 |
| Interaction (Selected, Hover, Focus, Active+Hover, Pressed) | 5 | 0 |
| Content variants (LongSummary, AllIssueTypes, etc.) | 5 | 0 |
| Sort & filter | 5 | 0 |
| Infinite scroll | 3 | 0 |
| Keyboard navigation | 5 | 0 |
| Dark mode | 3 | 0 |
| ARIA / a11y | 4 | 0 |
| Panel width / responsive | 3 | 0 |
| Performance (1000 cards, slow network) | 2 | 0 |
| **Total** | **40** | **0** |

Pre-conditions: 8 P0 defects must be fixed before stories can accurately document correct behavior (stories written now would document violations, not spec).

---

## 7. Missing Screenshots

Runtime screenshots were not captured in this audit session. The following screenshots should be captured via browser tooling when fixes are applied:

| Screenshot | What to show |
|---|---|
| `01-default-light.png` | Panel at 360–420px, 20 cards, light mode |
| `02-default-dark.png` | Same, dark mode via `setGlobalTheme('dark')` |
| `03-card-selected.png` | Card in selected state (blue bar, `#E9F2FF` bg) |
| `04-card-hover.png` | Card in hover state (`#F1F2F4` bg) |
| `05-card-active-hover.png` | Selected card + hover (`#CCE0FF` bg) |
| `06-card-focus-ring.png` | Card with ADS focus ring via keyboard |
| `07-loading-skeleton.png` | 6 skeleton cards on initial load |
| `08-loading-spinner.png` | Spinner at list bottom during infinite scroll fetch |
| `09-empty-state.png` | No issues found + Reset search link |
| `10-error-state.png` | "Failed to load more issues. Retry" |
| `11-sort-menu-open.png` | Sort dropdown open with radio options |
| `12-long-summary.png` | Card with 5-line summary (no clamp) |
| `13-group-header.png` | Group-by active — group headers visible |
| `14-footer-count.png` | "50 of 1000+" footer |
| `15-panel-240-vs-360.png` | Side-by-side comparison: current 240px vs spec 360px |

---

## 8. What Is Safe to Fix in a Single Pass

The following changes are mechanical/no-product-decision required. They can be applied in one implementation pass without Vikram approval beyond this audit:

### 8a. CSS-only fixes (no TSX changes required)

- Remove `-webkit-line-clamp: 2`, `-webkit-box-orient: vertical`, `overflow: hidden` from `.jlpCardSummary`
- Change `overflow-y: scroll !important` → `overflow-y: auto` (remove `!important`)
- Change `::-webkit-scrollbar { width: 20px }` → `width: 6px`
- Change scrollbar track `background: #F1F2F4` → `background: transparent`
- Change scrollbar track `border-left` → remove or `border-left: none`
- Change scrollbar thumb `background: #A5ADBA` → `var(--ds-background-neutral-bold, #626F86)`
- Change scrollbar thumb `border: 3px solid #F1F2F4` → `border: 3px solid transparent; background-clip: content-box`
- Change scrollbar thumb hover `background: #7A869A` → `var(--ds-background-neutral-bold-hovered, #7A869A)`
- Delete all ~20 `.dark .jlp*` rules
- Replace all `--cp-*` token references with `var(--ds-*)` equivalents
- Replace all raw hex and `rgba()` values in root variables with `var(--ds-*)` tokens
- Change `.jlpCard { padding: 12px 16px }` → `padding: 16px`
- Change `.jlpCardKey { color: var(--aw-text-subtle) }` → `var(--ds-text-subtle, #44546F)`
- Add `.jlpCard.jlpCardSelected .jlpCardKey { color: var(--ds-text-selected, #0C66E4) }`
- Change `.jlpCard:hover { background: var(--aw-hover) }` → `var(--ds-background-neutral-hovered, #F1F2F4)`
- Change `.jlpSortBtn font-size: 13px` → `14px`
- Change `.jlpFooterCount font-size: 13px` → `14px`
- Change `--aw-hover` root variable to `var(--ds-background-neutral-subtle-hovered, #091E420F)`
- Add `aria-live="polite"` attribute to `.jlpFooterCount` (can be done in TSX or CSS `content:` trick)

### 8b. TSX-only fixes (no ADS component changes)

- Fix footer count: `{items.length} of <strong>{totalCount >= 1000 ? '1000+' : totalCount}</strong>` (requires `loadedCount` wiring)
- Add `id={`jlp-card-${item.issue_key}`}` to each card
- Add `aria-activedescendant` to listbox container
- Add `role="navigation"` + `aria-label="Issue list"` wrapper
- Merge `tabIndex={0}` and `role="listbox"` onto the same element
- Add `aria-hidden="true"` to `<JiraIssueTypeIcon>` in card context
- Add `aria-label` to unassigned avatar placeholder
- Change `<JiraIssueTypeIcon size={16}>` → `size={20}`
- Add J/K/Enter/Space/Home/End/Escape to `handleKeyDown`
- Add `scrollIntoView({ block: 'nearest' })` on selection change
- Add `aria-busy="true"` + `aria-live` to loading/empty states

### 8c. ADS component replacements (require `@atlaskit/*` imports)

- Replace Lucide icons with `@atlaskit/icon` glyphs
- Replace `<button className="jlpToolBtn">` with `@atlaskit/button IconButton appearance="subtle"`
- Replace self-rolled sort dropdown with `@atlaskit/dropdown-menu`
- Replace `CatalystOwnerAvatar` with `@atlaskit/avatar size="small"` + white ring border
- Add `@atlaskit/focus-ring` to card and button focus states

---

## 9. What Requires a Product Decision Before Fixing

These items need explicit Vikram approval:

| Item | Decision required |
|---|---|
| **Group-by selector** | Which fields appear in the group-by dropdown? Does Catalyst have a grouping data model? Can the parent feed grouped data? |
| **Infinite scroll integration** | What is the Catalyst data fetching API for paginating issues? Does `IssueListPanel` own its own query or does the parent feed `items`? |
| **Panel width 360–420px** | Increasing from 240px affects the entire shell layout. Does the detail pane have enough room? Is this gated on a viewport breakpoint? |
| **AllWorkSplitView deprecation** | Confirm safe to delete `AllWorkSplitView.tsx` and remove its route from `src/pages/workhub/AllWork.tsx`. |
| **`@atlaskit/avatar` vs `CatalystOwnerAvatar`** | `CatalystOwnerAvatar` is a custom avatar component used across many surfaces. Should the `size="small"` variant be added to `CatalystOwnerAvatar` (local fix) or should `@atlaskit/avatar` be used directly in `IssueListPanel` (per spec)? |
| **URL sync for selectedIssue** | Is the parent component already syncing `?selectedIssue=KEY` to the URL? Does `IssueListPanel` need to drive that or consume it? |
| **Storybook infrastructure** | No Storybook is configured for the main app. Does Vikram want to set one up, or should test coverage be handled through Vitest + Playwright only? |

---

## 10. Questions for Rovo Follow-up

Based on the audit, the following questions are open for the Rovo evidence pack owner:

1. **Group-by field list:** The spec mentions group-by options (Parent, Status, Assignee, Priority, Sprint, Epic, Label, Issue Type, Fix Version, None). Are all these options mandatory in the Catalyst release, or is a subset acceptable?

2. **Infinite scroll vs pagination:** Section 7 specifies IntersectionObserver + 50-item pages. Does the Catalyst data layer expose a page-based API, or does it return all items in a single response (current behavior)? If the latter, does infinite scroll need a new endpoint/hook?

3. **Panel resize handle:** Section 2 references a resize handle between the panel and detail pane. Is this mandatory for the initial release? The current `--aw-left: 240px` CSS grid layout has no resize mechanism.

4. **Group header ARIA:** Section 5 specifies `role="group"` on group headers with `aria-label="Parent: [summary]"`. For Assignee grouping, what value goes in `aria-label`? "Assignee: [name]" or "Assigned to [name]"?

5. **Load-more error state:** Section 7.2 mentions "Failed to load more issues. Retry" with a retry link. Is the retry link a `<button>` or `<a>`? Should it reissue the last page request, or restart from page 1?

6. **First card auto-selection:** The spec implies the first card (or previously-viewed card) is auto-selected on initial load. Is this behavior owned by `IssueListPanel` or by the parent shell (`IssueViewShell`)?

7. **Keyboard Escape:** Section 5 says Escape moves focus to the detail pane. What is the `onEscape` callback signature the parent must implement? Does it set `document.activeElement` to a specific element in the detail pane, or is a general focus-move sufficient?

8. **Virtual rendering threshold:** Section 7.3 mentions `react-window` for 100+ cards. Does this need to be wired through `@tanstack/react-virtual` (already used in `JiraTable`) for consistency, or is `react-window` the preferred library for the panel?

9. **`@atlaskit/icon` glyph names:** The spec lists ChevronDown, refresh, arrow-up, arrow-down. What are the exact `@atlaskit/icon` glyph import paths for: (a) ChevronDown, (b) Refresh, (c) SortAscending, (d) SortDescending? Glyph naming in `@atlaskit/icon` v22 differs from earlier versions.

10. **Selected card key color vs spec contrast:** Spec says active card summary = `#0C66E4` on `#E9F2FF` (contrast 3.85:1 — fails WCAG AA). Is this an intentional parity-with-Jira override, or should Catalyst use a darker blue to achieve AA compliance? (Jira itself fails this contrast check; Catalyst may choose to deviate for accessibility.)

---

## 11. Overall Health Scorecard

| Dimension | Score | Basis |
|---|---|---|
| Parity with Rovo spec | **23 / 56 gaps compliant (41%)** | 9 P0, 26 P1, 21 P2 gaps |
| CSS / token compliance | **~0%** | 44+ violations; root variable block is non-ADS |
| Dark mode | **Non-functional** | ~20 `.dark .jlp*` override rules block ADS token theming |
| Accessibility (WCAG 2.1 AA) | **Fails** | 8 P0 WCAG failures including contrast, keyboard, ARIA |
| Storybook coverage | **0%** | 0 of 40 required stories exist |
| Screenshot baseline | **None** | Runtime capture deferred |
| Code health | **Medium risk** | `overflow-y: scroll !important`, deprecated `AllWorkSplitView` still compiled, `totalCount` prop silently ignored |

**Readiness for production (Rovo spec parity): NOT READY.**
The P0 items (truncation, panel width, group-by, infinite scroll, footer count bug, focus ring, WCAG contrast) must all be resolved before the component can be considered production-ready against the Rovo spec.
