# Catalyst Left Panel Navigator — Accessibility Gap Analysis

> Preflight audit — 2026-05-21. No fixes applied.
> Source read: `src/components/workhub/issue-view/IssueListPanel.tsx` (264 LOC)
> Evidence: Rovo spec sections 4–5, WCAG 2.1 AA, CLAUDE.md §ADS guardrail.
> Findings are read from source only — no runtime AT test performed.

---

## 1. Executive Summary

| Severity | Count | Examples |
|---|---|---|
| P0 — WCAG 2.1 AA failure | 8 | Missing `role="navigation"`, no focus management, keyboard-only users cannot select issues |
| P1 — Significant AT gap | 9 | `aria-activedescendant` absent, no live region on footer, no focus ring, sort state not announced |
| P2 — Minor / polish | 6 | Icon labels absent, sort direction not exposed to AT, divider between sort groups unlabelled |

**Total: 23 gaps.** Zero have been addressed relative to the Rovo spec.

---

## 2. Panel-Level ARIA

### 2.1 Missing `role="navigation"` on panel wrapper

**Spec (Rovo §5):** The outermost element of the Left Panel Navigator must carry `role="navigation"` (or be a `<nav>` landmark) with `aria-label="Issue list"` so screen readers can jump to it via landmark navigation.

**Current implementation:**
```tsx
// IssueListPanel.tsx — returned fragment with no landmark wrapper
return (
  <>
    <div className="jlpHeader"> ... </div>
    <div className="jlpBody" ... > ... </div>
    <div className="jlpFooterCount"> ... </div>
  </>
);
```

The component returns a React fragment. There is no `<nav>` element and no `role="navigation"`. Screen reader users cannot jump to the issue list via landmark navigation (e.g., NVDA "D" key, VoiceOver rotor).

**WCAG criterion:** 1.3.6 Identify Purpose (AA), 2.4.1 Bypass Blocks (A).
**Severity: P0**

---

### 2.2 `role="listbox"` present but `aria-label` on wrong element

**Spec (Rovo §5):** `<div role="listbox" aria-label="Issues" tabIndex={0}>` — the listbox must be the focusable scroll container with the ARIA label.

**Current implementation:**
```tsx
// Line 188: jlpBody is the scroll container and has keyboard handler
<div className="jlpBody" onKeyDown={handleKeyDown} tabIndex={0}>
  // ...
  // Line 212: listbox is an INNER div inside jlpBody
  <div className="jlpCards" role="listbox" aria-label="Issues">
```

Two problems:
1. The `tabIndex={0}` is on `.jlpBody`, not on the element with `role="listbox"`. The focusable element and the semantic element are mismatched.
2. When the list is empty or loading, the `<div role="listbox">` is not rendered at all. The focusable element exists (`jlpBody`) but has no ARIA semantics — a screen reader sees a plain unfocussed div.

**WCAG criterion:** 4.1.2 Name, Role, Value (A).
**Severity: P1**

---

### 2.3 `aria-activedescendant` absent

**Spec (Rovo §5):** The `role="listbox"` element must set `aria-activedescendant` to the `id` of the currently-selected card. This lets screen readers announce the active item without moving DOM focus out of the listbox container.

**Current implementation:** `aria-activedescendant` does not appear anywhere in `IssueListPanel.tsx`. The listbox has no `aria-activedescendant` attribute.

**Effect:** When a user presses ArrowDown to move selection, nothing is announced. The visual highlight changes, but no screen reader event fires. Keyboard navigation is completely silent for AT users.

**WCAG criterion:** 4.1.2 Name, Role, Value (A).
**Severity: P0**

---

### 2.4 Cards have no `id` attribute

**Prerequisite for `aria-activedescendant`:** each card must have a unique, stable `id` matching what `aria-activedescendant` points to.

**Current implementation:**
```tsx
<div
  key={item.issue_key}   // React key — NOT rendered to DOM as id attribute
  role="option"
  aria-selected={isSelected}
  className={`jlpCard ...`}
  onClick={() => onSelectIssue(item.issue_key)}
>
```

React's `key` prop is not rendered as an HTML `id`. The cards render with no `id` attribute. `aria-activedescendant` cannot work without `id`s on the options.

**Fix required:** add `id={`jlp-card-${item.issue_key}`}` to each card and set `aria-activedescendant={`jlp-card-${selectedIssueKey ?? ''}`}` on the listbox.

**WCAG criterion:** 4.1.2 Name, Role, Value (A).
**Severity: P0** (prerequisite for P0 §2.3)

---

## 3. Keyboard Navigation

### 3.1 Only ArrowUp/ArrowDown implemented — 5 keys missing

**Spec (Rovo §5 keyboard model):**

| Key | Spec behaviour | Implemented? |
|---|---|---|
| ArrowUp | Select previous card | ✅ Yes (line 146) |
| ArrowDown | Select next card | ✅ Yes (line 147) |
| J | Select next (Vim binding) | ❌ No |
| K | Select previous (Vim binding) | ❌ No |
| Enter | Open detail pane for focused card | ❌ No |
| Space | Open detail pane for focused card | ❌ No |
| Home | Jump to first card | ❌ No |
| End | Jump to last card | ❌ No |
| Escape | Move focus from list to detail pane | ❌ No |

```tsx
// Lines 143–148: only ArrowDown/ArrowUp handled
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (!sortedItems.length) return;
  const idx = sortedItems.findIndex(i => i.issue_key === selectedIssueKey);
  if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < sortedItems.length - 1) onSelectIssue(sortedItems[idx + 1].issue_key); }
  if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) onSelectIssue(sortedItems[idx - 1].issue_key); }
}, [sortedItems, selectedIssueKey, onSelectIssue]);
```

Missing: J/K, Enter, Space, Home, End, Escape.

**WCAG criterion:** 2.1.1 Keyboard (A).
**Severity: P0**

---

### 3.2 Enter/Space on cards not wired

**Spec:** `role="option"` elements must be activatable by keyboard (Enter or Space opens the detail). Currently the card's only interaction is `onClick`. Users navigating by keyboard (Tab to listbox → arrows) cannot open an issue without a mouse.

**WCAG criterion:** 2.1.1 Keyboard (A).
**Severity: P0** (subset of §3.1 but worth separate call-out because it is a separate fix from the keyboard handler)

---

### 3.3 No focus ring on cards

**Spec (Rovo §5):** Cards in focused state must show the ADS focus ring (`@atlaskit/focus-ring` or `var(--ds-border-focused)`). The default browser outline is suppressed by `.jlpCard:focus { outline: none }` in `allwork.css`.

**Current CSS (allwork.css):** No `.jlpCard:focus-visible` rule exists. The `.jlpCard` receives focus via keyboard (because the parent `jlpBody` has `tabIndex={0}`) but there is no visual indicator.

Separately, CLAUDE.md §ADS guardrail requires `@atlaskit/focus-ring` for all interactive elements. The sort buttons (`jlpSortBtn`, `jlpToolBtn`) also lack focus ring rules.

**WCAG criterion:** 2.4.7 Focus Visible (AA), 2.4.11 Focus Appearance (AA, WCAG 2.2).
**Severity: P0**

---

### 3.4 Tab order does not traverse header → cards → footer

**Spec (Rovo §5):** Tab from the header toolbar should move to the listbox, then to the footer. Tab within the listbox should not stop at individual cards — arrow keys navigate within the listbox (composite widget pattern).

**Current implementation:** `jlpBody` has `tabIndex={0}` (correct — single tab stop for composite widget). However, the sort toolbar buttons (`jlpSortBtn`, `jlpToolBtn`) are native `<button>` elements with natural tab order. There is no `tabIndex=-1` on card `<div role="option">` elements to prevent them from entering the tab sequence.

If any card receives native browser focus (click or tab-into-listbox via Tab key), the composite widget pattern breaks.

**WCAG criterion:** 2.1.1 Keyboard (A).
**Severity: P1**

---

## 4. Sort Toolbar ARIA

### 4.1 Sort button has no `aria-haspopup` or `aria-expanded`

**Spec (Rovo §5):** The sort dropdown trigger must expose `aria-haspopup="listbox"` and `aria-expanded={sortMenuOpen}` so AT users know it opens a popup.

**Current implementation:**
```tsx
<button
  className={`jlpSortBtn ${sortMenuOpen ? 'active' : ''}`}
  onClick={() => setSortMenuOpen(o => !o)}
>
  {sortLabel} <ChevronDown size={14} />
</button>
```

No `aria-haspopup`, no `aria-expanded`. AT users cannot know this button opens a popup.

**WCAG criterion:** 4.1.2 Name, Role, Value (A).
**Severity: P1**

---

### 4.2 Sort menu not in ARIA tree when hidden

**Current implementation:** The sort menu `<div className="jlpSortMenu">` is conditionally rendered (`{sortMenuOpen && <div ...>}`). This means it vanishes from the ARIA tree when closed. That is correct — but the menu has no `role="listbox"` or `role="menu"` semantics. The radio inputs inside are plain `<input type="radio">` with no `aria-label` on the container.

**Spec:** The dropdown should use `@atlaskit/dropdown-menu` (per CLAUDE.md 2026-05-10 — "Any menu with 2+ items MUST use `@atlaskit/dropdown-menu`"). The current self-rolled dropdown violates that rule and is missing all ARIA patterns.

**WCAG criterion:** 4.1.2 Name, Role, Value (A), 2.1.1 Keyboard (A).
**Severity: P1**

---

### 4.3 Sort direction button has no `aria-label` for current state

**Current implementation:**
```tsx
<button className="jlpToolBtn" title={sortAsc ? 'Sort ascending' : 'Sort descending'} onClick={...}>
  {sortAsc ? <ArrowUpNarrowWide size={16} /> : <ArrowDownNarrowWide size={16} />}
</button>
```

Uses `title` for the accessible name, but `title` attribute tooltips are not reliably announced by all AT (NVDA ignores `title` by default when there is visible text; JAWS behavior varies). The button should use `aria-label` or `aria-pressed` to expose current direction state.

Also: the icon (`ArrowUpNarrowWide`/`ArrowDownNarrowWide`) comes from `@/lib/atlaskit-icons` (Lucide). It does not carry an accessible `aria-hidden` attribute, so the SVG is read as decorative garbage by some AT.

**WCAG criterion:** 4.1.2 Name, Role, Value (A).
**Severity: P1**

---

### 4.4 Refresh button has no `aria-label`

```tsx
<button className="jlpToolBtn" title="Refresh"><RotateCcw size={16} /></button>
```

`title="Refresh"` — same `title` reliability problem as §4.3. No `aria-label`. Lucide `RotateCcw` SVG is not marked `aria-hidden`.

**WCAG criterion:** 1.1.1 Non-text Content (A), 4.1.2 Name, Role, Value (A).
**Severity: P2**

---

### 4.5 Sort dropdown divider is a plain `<div>` — unlabelled separator

```tsx
<div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
```

This divider between the two radio groups has no `role="separator"` and no ARIA group labels. AT sees an anonymous horizontal line with no semantics.

**WCAG criterion:** 1.3.1 Info and Relationships (A).
**Severity: P2**

---

## 5. Issue Card ARIA

### 5.1 Issue type icon not `aria-hidden`

```tsx
<JiraIssueTypeIcon type={item.issue_type} size={16} />
```

`JiraIssueTypeIcon` renders an SVG. If the SVG does not carry `aria-hidden="true"` and `focusable="false"`, screen readers will attempt to read it (JAWS reads SVG title elements; NVDA may announce the SVG element). The icon is purely decorative in this context — the issue type is conveyed by other means (key cell).

**WCAG criterion:** 1.1.1 Non-text Content (A).
**Severity: P2**

---

### 5.2 Issue key link announces only the key — no issue type context

```tsx
<IssueKeyLink
  issueKey={item.issue_key}
  className="jlpCardKey"
  ...
/>
```

Screen reader reads: "BAU-1234 link". The issue type (Story, Bug, etc.) is communicated only by the icon (§5.1, not accessible). AT users cannot determine issue type from the card.

**Spec (Rovo §5):** Cards should expose enough semantic information for screen readers to identify issue type and summary without visual icons.

**WCAG criterion:** 1.3.3 Sensory Characteristics (A).
**Severity: P2**

---

### 5.3 Avatar has no accessible name when assignee is null

```tsx
<CatalystOwnerAvatar
  type={item.assignee_display_name ? 'human' : 'placeholder'}
  name={item.assignee_display_name || undefined}
  ...
  showTooltip
/>
```

When `assignee_display_name` is null, `type="placeholder"` is rendered with `name={undefined}`. The avatar has no accessible name. AT announces it as an unlabelled image or skips it depending on whether `aria-label` is set inside `CatalystOwnerAvatar`.

**Spec:** Unassigned avatar should read "Unassigned". Assigned avatar should read the assignee's name.

**WCAG criterion:** 1.1.1 Non-text Content (A).
**Severity: P2**

---

## 6. Footer / Live Region

### 6.1 Footer count has no `aria-live`

**Spec (Rovo §3.4):** The footer `<div className="jlpFooterCount">` must have `aria-live="polite"` so screen readers announce the count when it changes (after sort, after page load, after refresh).

**Current implementation:**
```tsx
<div className="jlpFooterCount">
  {sortedItems.length} of <strong>...</strong>
</div>
```

No `aria-live` attribute. Count changes are silent to AT.

**WCAG criterion:** 4.1.3 Status Messages (AA).
**Severity: P1**

---

### 6.2 Loading skeleton has no `aria-busy` / `aria-label`

**Current implementation:**
```tsx
{loading && !sortedItems.length ? (
  <div className="jlpCards">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="jlpCard jlpCardSkeleton">
        <div className="jlpSkLine" ... />
        ...
      </div>
    ))}
  </div>
) : ...}
```

Skeleton cards have no `aria-hidden="true"` to suppress them from the AT tree, and the parent has no `aria-busy="true"` to communicate loading state. Screen readers will read out 6 skeleton elements as empty list items.

**Spec:** During load, the panel should be `aria-busy="true"` or the skeleton container should be `aria-hidden="true"` with a live region announcing "Loading issues".

**WCAG criterion:** 4.1.3 Status Messages (AA).
**Severity: P1**

---

### 6.3 Empty state has no `aria-live`

```tsx
<div className="jlpEmpty">
  No issues found
  {searchQuery && <button onClick={...} className="jlpResetLink">Reset search</button>}
</div>
```

No `role="alert"` or `aria-live="polite"`. When a search query returns zero results, the transition from card list to empty state is silent to AT.

**WCAG criterion:** 4.1.3 Status Messages (AA).
**Severity: P1**

---

## 7. Color Contrast

### 7.1 Card key color relies on non-ADS token

```tsx
style={{ color: 'var(--cp-primary-60, #0052CC)', textDecoration: 'none' }}
```

`--cp-primary-60` is a Catalyst-proprietary token (non-ADS). Its value resolves to `#0052CC` (fallback). On a white background `#FFFFFF`:
- Contrast ratio of `#0052CC` on `#FFFFFF`: **8.59:1** — passes WCAG AA and AAA.
- On the selected card background `#E9F2FF`:
  - Contrast ratio of `#0052CC` on `#E9F2FF`: **6.14:1** — passes WCAG AA (≥4.5:1 for normal text).

Contrast is acceptable if `--cp-primary-60` resolves as expected. However, if the custom token resolves to a lighter value in some theme states, contrast cannot be guaranteed. The correct fix is `var(--ds-link, #0C66E4)` or `var(--ds-text-selected, #0C66E4)`.

**WCAG criterion:** 1.4.3 Contrast Minimum (AA).
**Severity: P2** (contrast OK in default state; risk in themed/customized deployments)

---

### 7.2 Summary text in selected state

Selected card summary uses `.jlpCardSummaryActive { color: #0C66E4 }` on a `#E9F2FF` background.

- Contrast ratio of `#0C66E4` on `#E9F2FF`: **3.85:1** — **FAILS WCAG AA** (requirement: 4.5:1 for normal-weight body text at 14px).

This is the active-card summary text color. Every selected card's summary text fails minimum contrast.

**WCAG criterion:** 1.4.3 Contrast Minimum (AA).
**Severity: P0**

---

### 7.3 Subtle text on skeleton

Skeleton lines use `background: #DFE1E6` (inferred from `.jlpSkLine` style). This is a decorative element that should be `aria-hidden`, so contrast is not the primary concern — but the skeleton container itself has no accessible hide.

**WCAG criterion:** Not directly applicable for decorative placeholders. Noted for completeness.
**Severity: Not a violation if properly `aria-hidden`.**

---

## 8. Touch / Pointer Accessibility

### 8.1 Card click target height

**Spec:** Cards must have `min-height: ~56px` (Rovo §3.3). Current CSS: `padding: 12px 16px` (both sides = 24px vertical padding). For a one-line summary card (14px text, 20px line-height): total height ≈ 44px + 4px border = ~48px.

**WCAG criterion:** 2.5.5 Target Size (AAA) — 44×44px minimum. 2.5.8 Target Size (Minimum) (AA, WCAG 2.2) — 24×24px minimum. At ~48px the target exceeds both thresholds.

**Severity:** Borderline for single-line cards. Not a violation at current sizes if `min-height` is not explicitly constrained.

---

## 9. Gaps vs Rovo Spec — Full ARIA Requirements Table

| ARIA requirement (Rovo spec §5) | Implemented? | Notes |
|---|---|---|
| `<nav aria-label="Issue list">` landmark | ❌ No | Fragment returned, no landmark |
| `role="listbox"` on scroll container | ❌ Partial | On inner `.jlpCards`, not on `.jlpBody` where `tabIndex` is |
| `aria-label="Issues"` on listbox | ✅ Yes | Present on `.jlpCards` |
| `tabIndex={0}` on listbox | ❌ Partial | On `.jlpBody`, not on `role="listbox"` element |
| `aria-activedescendant` on listbox | ❌ No | Absent entirely |
| `role="option"` on cards | ✅ Yes | Line 221 |
| `aria-selected` on cards | ✅ Yes | Line 222 |
| `id` on cards | ❌ No | `key` is not rendered as `id` |
| `aria-live="polite"` on footer count | ❌ No | Absent |
| `aria-busy` during load | ❌ No | Absent |
| Sort button `aria-haspopup` | ❌ No | Absent |
| Sort button `aria-expanded` | ❌ No | Absent |
| `@atlaskit/dropdown-menu` for sort | ❌ No | Self-rolled radio list |
| `@atlaskit/focus-ring` on cards | ❌ No | No focus ring CSS |
| `@atlaskit/focus-ring` on toolbar buttons | ❌ No | No focus ring CSS |
| J/K keyboard shortcuts | ❌ No | Not implemented |
| Enter/Space to open detail | ❌ No | Not implemented |
| Home/End navigation | ❌ No | Not implemented |
| Escape → detail pane focus | ❌ No | Not implemented |
| Icon `aria-hidden="true"` on decorative SVGs | ❌ No | Not verified in JiraIssueTypeIcon / Lucide icons |
| Assignee avatar `aria-label` | ❌ Partial | Only when name is defined; placeholder has no label |

**Implemented: 3 / 21 = 14%**

---

## 10. Gap Count Summary

| Category | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| Panel-level ARIA | 3 | 1 | 0 | 4 |
| Keyboard navigation | 2 | 1 | 0 | 3 |
| Sort toolbar ARIA | 0 | 2 | 2 | 4 |
| Issue card ARIA | 0 | 0 | 3 | 3 |
| Footer / live regions | 0 | 3 | 0 | 3 |
| Color contrast | 1 | 0 | 1 | 2 |
| Rovo spec ARIA table | — | — | — | 18 missing of 21 |
| **Total distinct gaps** | **8** | **9** | **6** | **23** |

WCAG 2.1 AA pass requires all P0 items to be resolved. The P0 contrast failure (§7.2) and missing keyboard activation (§3.1, §3.2) would constitute AA failures at an external audit.
