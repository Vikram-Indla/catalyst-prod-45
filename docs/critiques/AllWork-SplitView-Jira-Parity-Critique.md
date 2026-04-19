# Design Critique — AllWork Split View vs. Jira BAU-5419

**Scope:** `src/pages/workhub/AllWork.tsx` + `src/components/workhub/allwork/AllWorkSplitView.tsx` + `AllWorkHeader.tsx` + `AllWorkToolbar.tsx`
**Benchmark:** Jira Cloud issue view — https://digital-transformation.atlassian.net/browse/BAU-5419
**Screens:** `image1.png` (Attachments expanded), `image2.png` (main issue), screenshot 3 (responsive / 3 scrollbars)
**Stage:** Final polish — parity + dead CTA sweep
**Date:** 18 Apr 2026 · Owner: Vikram · Reviewer: Claude (design-critique + ux-copy)

---

## Overall Impression

The split view nails 80 % of Jira's density, typography, and tab anatomy — but the remaining 20 % is the part that makes the screen *feel* like Jira. Four of the five items you flagged are grounded in the code: the breadcrumb above the title is missing in the detail panel (it exists only at page level), the left-panel "Created" sort button has no `onClick` handler and lies about the actual sort field, the two quick-action square buttons under the title aren't rendered at all, and three `overflow-y-auto` siblings in a flex row create the responsive-view scrollbar stack. Search is wired but under-communicated, so it reads as broken even though it isn't.

---

## 1. Five Flagged Issues — Audit Verdicts

| # | User claim | Grounded in code? | Evidence | Severity |
|---|---|---|---|---|
| 1 | No Jira-style breadcrumb above title | **Confirmed missing in detail panel** | `AllWorkSplitView.tsx:171–209` detail header renders only `[icon] BAU-5419 [in parent_key]`. Breadcrumb at L212 is gated on `panelStack.length > 1` — only appears when drilled into a sub-task. `AllWorkHeader.tsx:27–33` has a *page-level* breadcrumb (`Projects / Senaei BAU / All Work`) — that is NOT the same thing Jira shows. | 🔴 Critical (parity) |
| 2 | Search work doesn't work | **Partially true — wired but silent** | `AllWorkToolbar.tsx:170–180` input is bound (`onChange → setSearchValue → onSearch`). `AllWork.tsx:75–78` sets `filters.search`. Real problems: (a) no debounce → 1 query per keystroke, (b) placeholder says "Search" not "Search work", (c) no visible applied-query state — user can't tell whether the search took effect, (d) split-view left list silently shrinks with no "Showing N results for 'x'" hint. | 🟡 Moderate |
| 3 | "+" button under title doesn't work | **Confirmed missing** | No `+` or adjacent icon button exists in `AllWorkSplitView.tsx` detail header. The user is comparing to Jira's "Add attachment / Add child / Add link" quick-action squares. They are simply not rendered. | 🔴 Critical (missing feature) |
| 4 | Sort doesn't work on left panel | **Confirmed dead CTA** | `AllWorkSplitView.tsx:112–114` — the button has **no `onClick`**. `sortBy` state at L40 is set once and never updated. Worse: the label shows `Created` but `AllWork.tsx:38–39` sorts by `updated_at` by default → **the UI lies about the sort field**. This violates `CG-09: Dead CTAs = 0`. | 🔴 Critical |
| 5 | 3 scrollbars in responsive view | **Confirmed structural** | Three sibling `overflow-y-auto` containers in a fixed flex row: L120 (left list), L285 (main detail), L425 (right sidebar @ 260 px). No breakpoint collapse. At < ~1120 px viewport, fixed widths (320 + flex-1 + 260) spill, producing horizontal scrollbar + each column's vertical scrollbar. | 🔴 Critical (WCAG, CG-13) |

---

## 2. Additional Jira-Parity Gaps (not yet flagged)

These showed up during the walkthrough of your test-case corpus (TC-G*, TC-L*, TC-H*, TC-S*, TC-A*, TC-AC*, TC-D*):

| Gap | Jira behaviour | Catalyst today | Severity |
|---|---|---|---|
| **TC-H1 Status dropdown** | Clicking `Backlog ▾` opens a transition menu | `StatusLozenge` is a display-only component — not clickable | 🔴 |
| **TC-H2 Lightning icon** | Opens quick action / automation menu | Not rendered | 🟡 |
| **TC-H3 Improve Epic** | Opens AI improvement dialog | Not rendered | 🟡 |
| **TC-H4 Watchers eye + count** | Opens watchers popover | Not rendered | 🟡 |
| **TC-H5 Share icon** | Opens share dialog | Rendered only in page header (AllWorkHeader.tsx:53–55), not in detail panel | 🟡 |
| **TC-H6 Issue overflow `...`** | Issue-action menu | Not rendered in detail panel | 🟡 |
| **TC-L1/L2 Order by + sort direction** | Dropdown + sort-direction icons | Dropdown is a dead button (see #4); no direction icons | 🔴 |
| **TC-AC7 Press `M` to comment** | Shortcut focuses composer | `AllWork.tsx:52–67` only handles `/` for search and `Esc` for close. **The Pro tip lies — `M` does nothing.** | 🔴 (false claim) |
| **TC-AC8 Activity tune/slider** | Opens activity filter menu | Not rendered | 🟢 |
| **TC-D1 Collapse/expand Details** | Details panel collapses | The 260 px sidebar has no caret / collapse state | 🟡 |
| **TC-D5 Configure gear** | Field-configuration entry | Not rendered | 🟡 |
| **Attachments table (TC-A1–A6)** | Sortable dynamic-table with trash/download/preview | Empty state only — `AllWorkEmptyState type="no-attachments"` — no real attachment list | 🟡 |
| **Saved filters / Filter chip button** | Top-bar pattern for saving queries | Not rendered | 🟡 |
| **Improve-Epic / Ask-AI lozenge** | Visible AI entry point | Not rendered in detail | 🟡 |

---

## 3. Responsive View — Three-Scrollbar Fix

**Root cause.** The split view is a single flex row with three siblings that each declare `overflow-y-auto`:

```
<div className="flex h-full ... overflow-hidden">                  ← clips horizontal
  <div style={{ width: 320 }} overflow-y-auto>      ← scrollbar A
  <div className="flex-1 overflow-hidden">
    <div className="flex-1 overflow-y-auto">        ← scrollbar B
    <div style={{ width: 260 }} overflow-y-auto>    ← scrollbar C
```

At widths < 1120 px, the 320 + 260 fixed columns eat so much of the viewport that the middle column's content wraps vertically and its scrollbar activates simultaneously with the two outer ones — all three show at once.

**Recommended fix (progressive, no schema change).**

1. Collapse right sidebar into a **Details drawer** at `< 1280 px`. Replace the inline 260 px column with a toggleable drawer triggered from the detail header ("Details" chip). Drawer overlays the main content instead of stealing width.
2. Collapse left navigator into a **slide-over issue list** at `< 960 px`. Replace the 320 px column with a toggle button (`☰ 1,247 items`) that slides the list over the main content.
3. Cap `overflow-y-auto` to **one** primary scroll region. The left list and right sidebar should only scroll when their overflow actually exceeds the viewport height at that breakpoint — use `max-height: 100%` + `overflow-y: auto` instead of unconditional `overflow-y-auto`.
4. Wrap the whole layout in a container query (`@container (min-width: 1280px)`) rather than viewport breakpoints — the split view lives inside a panel, so viewport-based breakpoints mislead when the sidebar is expanded/collapsed elsewhere.

**Acceptance:** at 1024 × 768, there is exactly **one** vertical scrollbar (main detail). No horizontal scrollbar at any viewport ≥ 360 px.

---

## 4. Breadcrumb Parity — Where It Belongs

Jira renders the breadcrumb **inside the detail panel**, above the title, every time:

```
Projects / Senaei BAU / Business Process – NDS - Final
BAU-5419
```

Catalyst renders the breadcrumb at the *page* level (`AllWorkHeader.tsx`) and only at the detail level when drilled into sub-tasks. Two changes:

1. **Lift the page-level breadcrumb into the detail panel** so it appears above `BAU-5419` / title — not just above the whole "All Work" tab header. The detail header currently skips the project chain.
2. **Keep the nested-stack breadcrumb** (`panelStack.length > 1`) but merge its visual pattern with the page breadcrumb — one component, two data sources (project chain + stack chain).

**Proposed anatomy:**

```
Projects  ›  Senaei BAU  ›  BAU-5419                   ← always
[Back?]  [Icon]  BAU-5419   · Backlog ▾  ⚡  Improve Epic  👁 1  ⤴  ⋯
Business Process – NDS - Final                          ← title
[+]  [⚙]                                                ← quick actions
```

---

## 5. Dead CTA Sweep (enforce `CG-09: Dead CTAs = 0`)

| Element | File · Line | Current state | Fix |
|---|---|---|---|
| Left-panel Sort button | `AllWorkSplitView.tsx:112` | No `onClick`, hard-coded "Created" label | Wire to `sortField`/`sortDir` from parent; open dropdown; propagate to `useAllWorkItems` |
| "Assign to me" | `AllWorkSplitView.tsx:443` | Button with no handler | Wire to Supabase update on `assignee_id` |
| Comment input | `AllWorkSplitView.tsx:371–377` | `<input>` not persisted | Wire to `jira_comments` insert |
| "Status update..." chip | `AllWorkSplitView.tsx:379–381` | No handler | Insert template into comment editor on click |
| "Thanks!" chip | `AllWorkSplitView.tsx:382–384` | No handler | Same — insert template |
| Star / Share / More in `AllWorkHeader` | `AllWorkHeader.tsx:50–58` | All three dead | Wire to favourites, share modal, actions menu |
| Pro tip `M` keybinding | Text claim, not wired | `AllWork.tsx:52–67` only handles `/` and `Esc` | Either wire `M` → focus composer, OR remove the tip |
| Page breadcrumb link "Projects" | `AllWorkHeader.tsx:28` | `href="#"` | Route to `/projects` or delete |

---

## 6. UX Copy Review (applying `/design:ux-copy` lens to your TC corpus)

### 6.1 Global top bar (TC-G*)

| Element | Current | Issues | Recommended |
|---|---|---|---|
| Search placeholder | `Search` | Generic; doesn't match Jira's "Search work" | `Search work items` |
| Search aria-label | `Search work items` | OK — keep | — |
| Ask AI button | (not rendered) | — | `Ask AI` (sentence case — NOT "ASK AI") |
| Filter button | (separate chips) | Jira uses one `Filter` button; Catalyst uses inline chips. Decide one pattern. | Keep chips; rename left-most `Type` → `Work type` to match Jira's terminology |
| Clear filters | `Clear` | OK | Keep. Consider `Clear filters` for screen reader clarity |
| `{n} items` label | `1,247 items` | OK | Keep (JetBrains Mono numeric is a nice touch) |
| View toggle labels | `Grid` / `Split` | Jira uses `Detail` / `List`; decide terminology | `List` / `Detail view` (Catalyst/Jira hybrid) |

### 6.2 Left navigator (TC-L*)

| Element | Current | Issues | Recommended |
|---|---|---|---|
| Sort button | `Created` | Ambiguous — is it value or selector? Plus dead CTA. Worse: lies (sort is actually `updated_at`) | `Sort: Most recently updated ▾` |
| Footer count | `12 of 12` | Redundant with header "12 items" | Delete — keep only header count |
| Empty list state | (none visible — falls to `AllWorkEmptyState`) | No copy for "no items match" inside split view | Add: `No work items match your filters.` + `Clear filters` link |

### 6.3 Issue header (TC-H*)

| Element | Current | Issues | Recommended |
|---|---|---|---|
| Issue key | `BAU-5419` | OK | Keep — JetBrains Mono, `--cp-blue` |
| Parent fallback | `in BAU-5418` | Preposition-only — weak | `Parent: BAU-5418` or render as breadcrumb segment |
| Status lozenge | `Backlog` | Not clickable → no transitions | Label stays `Backlog`; add affordance (chevron) when interactive |
| Back button label | `Back` | OK | Keep — matches Jira pattern |
| Pagination label | `3/47` | Terse but scannable | Acceptable in monospace; consider `3 of 47` for a11y |
| Missing: lightning menu trigger | — | — | Button aria-label: `Quick actions`; tooltip: `Automate or log work` |
| Missing: `Improve Epic` | — | — | Keep verb-first; `Improve with AI` is more discoverable |
| Missing: watchers | — | — | Button aria-label: `{n} watching this issue` |
| Missing: share | — | — | Tooltip: `Copy link or share` |
| Missing: `+` under title | — | — | Not a plain `+` — needs clarity. Use `+ Add` split button with menu: `Add child issue`, `Add attachment`, `Add link` |

### 6.4 Section headers (TC-S*)

| Element | Current | Issues | Recommended |
|---|---|---|---|
| `Key Details` uppercase label | ALL CAPS 11 px | Hierarchy OK | Keep |
| `Description` empty state | `No description provided` | Passive | `Add a description to explain the work. [+ Add description]` |
| `Attachments` count | (tab shows paperclip only) | No count badge when attachments exist | Mirror Jira — `Attachments (1)` |
| `Child work items` | Tab named `Sub-Tasks` | Inconsistent with Jira label | Pick one term across platform — `Child work items` matches Jira; `Sub-tasks` matches Atlaskit. **Decide and enforce.** |
| `Linked work items` | Tab named `Links` | Same inconsistency | `Linked work items` OR `Links` — pick one |

### 6.5 Attachments (TC-A*)

| Element | Current | Issues | Recommended |
|---|---|---|---|
| Empty state | (generic component) | Should explain the value | `Drop files here or paste from clipboard. Attachments stay with this work item.` |
| Add attachment CTA | (missing) | — | `+ Add attachment` (explicit — not just `+`) |
| Delete confirm | (missing) | — | `Delete "{filename}"? This can't be undone.` · `Delete` / `Keep` |
| Download tooltip | (missing) | — | `Download {filename}` |
| Preview tooltip | (missing) | — | `Open preview` |
| Sort header | `Date added` | OK | Keep |

### 6.6 Activity (TC-AC*)

| Element | Current | Issues | Recommended |
|---|---|---|---|
| Tab: `All` | OK | — | Keep |
| Tab: `Comments` | OK | — | Keep |
| Tab: `History` | OK | — | Keep |
| Tab: `Work log` | OK | — | Keep |
| Tab: `SLA History` (Jira) | Not rendered | Decide if needed | If in scope: `SLA` (shorter) |
| Tab: `Timepiece` | Not rendered, unclear what this is | — | If this is a timing extension, call it `Time tracking` or omit |
| Comment placeholder | `Add a comment...` | OK | Keep |
| Chip: `Status update...` | Ellipsis suggests truncation, not template | Ambiguous affordance | `Post status update` (no ellipsis) |
| Chip: `Thanks!` | Informal; mixes exclamation with business tone | — | `Say thanks` (verb-first, matches chip pattern) |
| Chip: `Agree...` (Jira) | Not rendered | — | `Agree` (no ellipsis) |
| Pro tip | `Pro tip: press M to comment` | **Currently false** — `M` not wired | Either wire the keybind OR delete the tip. Copy if kept: `Tip: press M to comment` (drop "Pro" — reads marketing-y) |
| No-activity empty | `No activity yet` | Dead-end copy | `No activity yet. Comments, status changes, and work logs will appear here.` |

### 6.7 Details panel (TC-D*)

| Element | Current | Issues | Recommended |
|---|---|---|---|
| Panel header | (no header) | Jira shows `Details` with collapse caret | Add `Details ▾` header, collapsible |
| Unassigned state | `Unassigned` (italic, fg-3) | OK | Keep |
| `Assign to me` link | OK | — | Keep |
| Fix Version empty | `—` | Inconsistent — Reporter also shows `—`, Labels shows `None` | Standardise empty value: `—` everywhere OR `None` everywhere. Recommend `—` (less visually heavy) |
| Labels empty | `None` | See above | `—` |
| `Created` / `Updated` | `2 days ago` | OK — matches Jira | Keep. Ensure tooltip shows absolute timestamp (already done via `title=` attribute ✓) |
| Missing: `Configure` | — | Jira entry point for field config | `Configure fields` (verb-first) |

---

## 7. Consistency Issues (design-system)

| Issue | Where | Recommendation |
|---|---|---|
| Inline `#1558bc` instead of `--cp-blue` token | `AllWorkSplitView.tsx:253, 254, 257, 336, 338, 341` | Replace all `#1558bc` with `var(--cp-blue)` or `#2563EB` per CLAUDE.md §4 (primary brand is `#2563EB`, not `#1558bc`). Currently **two blues** on the same screen. |
| Two active-tab blues | Hub header uses `#1558bc` (Atlaskit blue); toolbar filter active uses `var(--cp-blue)` (`#2563EB`) | Pick one. Catalyst V12 locks primary to `#2563EB`. |
| Three "empty value" conventions | `—`, `None`, `No description provided`, `No activity yet` | Define 2 patterns only: `—` for inline fields; `No {thing} yet. {Next step}` for panels. |
| Two sort paradigms | Parent table sorts by click on header (`onSort` in `AllWork.tsx:159`); split-view left list has a dead button | Unify — split view should use the same `sortField` / `sortDir` state from the parent. |
| Two breadcrumb patterns | Page (`AllWorkHeader:27–33`) and nested stack (`AllWorkSplitView:212–236`) | Consolidate into one component; accept `segments: BreadcrumbSegment[]`. |

---

## 8. Priority Recommendations (do these first)

1. **Wire the dead sort button + make the label honest.** `AllWorkSplitView.tsx:112` — bind `onClick` to open a dropdown of sort fields (`Created`, `Updated`, `Priority`, `Key`), pipe through to `useAllWorkItems`, and default the label to match the *actual* sort (`Sort: Most recently updated`). Fixes TC-L1, TC-L2, and CG-09. 🔴
2. **Remove the 3-scrollbar stack.** Collapse right sidebar into a Details drawer at `< 1280 px`; collapse left list into a slide-over at `< 960 px`. Exactly one `overflow-y-auto` region on narrow widths. 🔴
3. **Lift breadcrumb into the detail panel.** Render `Projects / Senaei BAU / BAU-5419` above the title every time (merge with the sub-task stack breadcrumb). 🔴
4. **Delete or wire the `Pro tip: M` line.** False claims are worse than no tip. If you wire it, add `M` to `AllWork.tsx:52–67` and ensure focus moves to the composer. 🔴
5. **Add the `+ Add` split button under the title** with menu items: `Add child issue`, `Add attachment`, `Add link`. Not a naked `+` — label it so users don't have to guess. 🔴
6. **Normalise empty-value copy** to two patterns (`—` inline, `No X yet. {next step}` in panels). 🟡
7. **Kill `#1558bc`** in favour of `--cp-blue` / `#2563EB` — CLAUDE.md §4 is the source of truth. 🟡
8. **Debounce the search input** (250 ms) and surface an applied-query chip (`"meeting"  ✕`) so users can see their search took effect. 🟡

---

## 9. What Works Well

- Keyboard shortcuts for `/` (search focus) and `Esc` (close) are wired cleanly in `AllWork.tsx:52–67`. Keep this pattern; extend to `M`.
- The `panelStack` pattern for nested sub-task drill-down (`AllWorkSplitView:45–95`) is elegant — better than URL-based navigation for a detail panel.
- Tab rail typography (12 px, weight 600 when active, 2 px underline) matches Jira perfectly.
- `JetBrains Mono` for issue keys, counts, and timestamps is the right call — legible and signals "data" vs. "prose".
- Status lozenge discipline (3 colours, locked) holds up.
- ARIA roles are present on tabs, radio groups, and the listbox — good a11y baseline.
- `formatDistanceToNow` with `title=` tooltip on absolute timestamp — textbook.

---

## 10. Acceptance Checklist

```
□ Detail panel renders: "Projects / Senaei BAU / BAU-5419" above title
□ Left-panel sort button opens dropdown; label reflects actual sort state
□ Pressing M focuses the comment composer (or Pro tip is removed)
□ + Add split button under title with 3 menu items
□ At 1024×768 viewport: exactly 1 vertical scrollbar, 0 horizontal
□ Search has 250 ms debounce + applied-query chip
□ All #1558bc replaced with --cp-blue / #2563EB
□ Empty values: inline = "—", panels = "No X yet. {next step}"
□ "Assign to me" click actually assigns (Supabase update)
□ Comment input submits (Enter) + chips insert templates
□ All dead CTAs from §5 either wired or deleted
□ Tab naming decision recorded: "Child work items" vs "Sub-Tasks" — one wins
```

---

**Sources:**
- [AllWork.tsx](computer:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/pages/workhub/AllWork.tsx)
- [AllWorkSplitView.tsx](computer:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/components/workhub/allwork/AllWorkSplitView.tsx)
- [AllWorkHeader.tsx](computer:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/components/workhub/allwork/AllWorkHeader.tsx)
- [AllWorkToolbar.tsx](computer:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/src/components/workhub/allwork/AllWorkToolbar.tsx)
- [CLAUDE.md §4, §5, §7, §14](computer:///Users/vikramindla/Documents/GitHub/catalyst-prod-44/CLAUDE.md)
