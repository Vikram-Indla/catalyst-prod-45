

# ProjectHub Enterprise Visual Polish Audit

A comprehensive, invasive audit of every component surface in the ProjectHub module, identifying visual polish gaps against enterprise benchmarks (Linear, Jira Cloud, Bloomberg Terminal).

---

## AREA 1: Top Navigation Bar (`TopNav.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 1.1 | **No notification badge** | Plain bell icon | Red dot/count badge when unread notifications exist |
| 1.2 | **Search bar has no click handler** | Static `<div>` with text | Should trigger GlobalSearch on click; needs `onClick` and `cursor: pointer` |
| 1.3 | **No active indicator animation** | Instant `borderBottom` swap | 150ms slide transition on the active underline (Linear-style) |
| 1.4 | **Hub tabs use inline `onMouseEnter/Leave`** | Manual JS hover | Replace with CSS `:hover` via Tailwind `hover:text-[...]` for smoother transitions |
| 1.5 | **UserAvatar is static letter** | Hardcoded "V" | Should pull `useAuth()` profile image with fallback initials |
| 1.6 | **No keyboard shortcut registration** | `⌘K` label is decorative | Wire actual `Cmd+K` listener to open GlobalSearch |
| 1.7 | **Settings button is dead** | No `onClick` | Wire to `/admin/settings` or show tooltip "Coming soon" |

---

## AREA 2: Module Sidebar (`SidebarModuleNav.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 2.1 | **"All Projects v2" nav item exposed** | Internal dev route visible | Remove or gate behind admin flag |
| 2.2 | **No section divider between Resource 360 and Favorites** | Runs together | Add `1px solid #EBECF0` divider matching project sidebar |
| 2.3 | **"No starred projects" empty state too plain** | Grey text only | Add dashed-border box with star icon and "Star projects for quick access" CTA |
| 2.4 | **Module sidebar width inconsistent** | 192px vs project sidebar 220px | Standardize both to 220px for visual continuity during context switch |
| 2.5 | **Header badge "PH" is a circle** | Round badge | Should be 6px rounded square to match project sidebar badge style |
| 2.6 | **No hover tooltip on collapsed icons** | NavItem has `title` but only when collapsed | Already working — verify consistent |

---

## AREA 3: Project Sidebar (`SidebarProjectNav.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 3.1 | **Recents section has no empty state** | Hidden when 0 items | Show "No recent items" with clock icon when user has visited no items yet |
| 3.2 | **Dividers use inline `style={{ height: 1 }}`** | Inconsistent with `border-b` pattern elsewhere | Standardize to `<hr>` or consistent `border-b` Tailwind class |
| 3.3 | **AI badge uses purple `#7C3AED`** | Correct per rules | Verify it does NOT appear on non-AI items |
| 3.4 | **Active NavItem uses `rgba()` in dark mode** | `rgba(0,82,204,0.08)` | Replace with solid hex `#0D1526` per NOCTURNE rules |
| 3.5 | **Back to "All Projects" button looks flat** | Plain text link | Add left-border accent on hover, match NavItem interaction model |

---

## AREA 4: NavItem Component (`NavItem.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 4.1 | **No focus-visible ring** | No keyboard focus styling | Add `focus-visible:ring-2 focus-visible:ring-[#2563EB]` for WCAG AA |
| 4.2 | **Inline `onMouseEnter/Leave` for hover** | JS-driven background swap | Replace with Tailwind `hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]` |
| 4.3 | **Icon opacity 0.75 for inactive** | Subtle but inconsistent | Use explicit color tokens instead of opacity for predictable rendering |
| 4.4 | **Badge count pill radius inconsistent** | `borderRadius: 12` (count) vs `borderRadius: 4` (badge) | Standardize: text badges 4px, numeric counts use full-round pill |

---

## AREA 5: Project Switcher Dropdown (`ProjectSwitcher.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 5.1 | **Project badge shows full key text** | "BAU" crammed into 24×24px | Show only first 2 chars, match sidebar badge |
| 5.2 | **No keyboard navigation** | Only mouse interaction | Add `ArrowUp/Down` keyboard nav with `aria-activedescendant` |
| 5.3 | **Search input has no clear button** | Must manually delete text | Add X button when search has content |
| 5.4 | **Active project has no checkmark** | Blue background only | Add `Check` icon to right of active project row |
| 5.5 | **Uses `rgba()` in dark mode for active state** | `rgba(59,130,246,0.10)` | Replace with solid hex |

---

## AREA 6: All Projects Table (`ProjectTable.tsx`, `ProjectTableRow.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 6.1 | **Row height is 50px** | Exceeds 36px max from CLAUDE.md | Lock to 36px with `max-height: 36px` per table density rules |
| 6.2 | **Header height is 50px** | Too tall | Reduce to 36px per locked spec |
| 6.3 | **No row selection (checkbox column)** | No bulk actions | Add checkbox column for batch operations |
| 6.4 | **Hover uses inline JS** | `onMouseEnter` style swap | Use Tailwind `hover:bg-[...]` |
| 6.5 | **Key column redundant with Name column badge** | Key shown twice | Remove KEY column or remove key from badge |
| 6.6 | **Table has no sorting indicators** | Static headers | Add sort arrows with click-to-sort |
| 6.7 | **No context menu implemented** | `onContextMenu` prop exists but unverified | Wire right-click menu: Edit, Archive, Duplicate, Delete |

---

## AREA 7: Status & Health Badges (`project-list-utils.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 7.1 | **StatusBadge uses 4+ colors** | Teal, Amber, Green, Grey | Violates 3-color StatusLozenge guardrail (Grey/Blue/Green ONLY) |
| 7.2 | **"Active" uses teal `#0D9488`** | Not in allowed palette | Must be Blue: `bg:#DEEBFF text:#0747A6` |
| 7.3 | **"On Hold" uses amber `#D97706`** | Not in allowed palette | Must be Grey: `bg:#DFE1E6 text:#253858` |
| 7.4 | **Badges use `fontWeight: 500`** | Too light | StatusLozenge spec mandates `fontWeight: 700` + UPPERCASE |
| 7.5 | **HealthBadge also violates palette** | Green/Amber/Red | Health badges are semantic, not status — but should still use the 3-color rule or be clearly differentiated |
| 7.6 | **No dark mode overrides** | Same light-mode colors in dark mode | Needs dark-adjusted backgrounds |

---

## AREA 8: Project Cards (`ProjectCard.tsx`, `ProjectCardGrid.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 8.1 | **Progress bar always 0%** | `width: '0%'` hardcoded | Wire to real completion data or hide when no data |
| 8.2 | **Card uses generic `gray-200` Tailwind** | Not design-token-aligned | Use `border-[#E2E8F0] dark:border-[#2E2E2E]` |
| 8.3 | **AvatarStack uses fake letters** | `String.fromCharCode(65 + i)` | Pull real member initials/images from profiles |
| 8.4 | **Card grid has no skeleton loading** | No loading state | Add shimmer skeleton cards during data fetch |
| 8.5 | **Hover transform `-translate-y-0.5`** | Feels cheap | Use subtle shadow elevation change instead, no translate |
| 8.6 | **Card border-radius `rounded-xl` (12px)** | Inconsistent with 6px card radius spec | Use `rounded-[6px]` per `--cp-radius-card` |

---

## AREA 9: Toolbar & Filters (`ProjectToolbar.tsx`, `FilterDropdown.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 9.1 | **Duplicate "New Project" button** | Toolbar has `+ New Project` AND top nav has `+ Create` | Remove toolbar button per creation-entry-point policy (all creation via global nav) |
| 9.2 | **Filter dropdown uses native `<input type="checkbox">`** | Platform rule bans native selects | Replace with custom checkbox component |
| 9.3 | **View toggle button size mismatch** | 34×32px | Standardize to 32×32px |
| 9.4 | **FilterChips use `rgba()` in dark mode** | `rgba(37,99,235,0.15)` | Replace with solid hex |
| 9.5 | **"Apply" button in filter footer** | Unusual for immediate-apply filters | Either apply immediately on check or keep apply — be consistent |

---

## AREA 10: Project Status Tabs (`ProjectStatusTabs.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 10.1 | **Uses `rgba()` for dark mode borders** | `rgba(59,130,246,0.25)` | Replace with solid hex `#1E3A5F` |
| 10.2 | **Tab height 32px with `padding: 8px 12px`** | Padding inflates height beyond 32px | Use `py-0` with line-height to maintain exact 32px |
| 10.3 | **Count badges use `var(--divider)` bg** | Inconsistent token | Use explicit `#EBECF0` / `#2E2E2E` for light/dark |

---

## AREA 11: Create Project Modal (`CreateProjectModal.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 11.1 | **Footer buttons height 50px** | Oversized | Reduce to 36px per enterprise density |
| 11.2 | **No dark mode backdrop** | `rgba(0,0,0,0.5)` | Should be Atlassian `rgba(9,30,66,0.54)` light / `rgba(0,0,0,0.7)` dark |
| 11.3 | **StepIndicator not dark-mode aware** | Uses `var()` tokens only | Verify `var(--fg-1)`, `var(--fg-4)`, `var(--divider)` resolve correctly in dark |
| 11.4 | **Modal width 640px** | Fine but no responsive behavior | Add `max-width: calc(100vw - 32px)` for mobile |
| 11.5 | **Content area `minHeight: 300`** | Could be taller | Use `minHeight: 360` for breathing room |

---

## AREA 12: Dashboard Widgets (`WidgetCard.tsx`, `WidgetSkeleton.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 12.1 | **Widget card radius 12px** | Inconsistent with 6px card spec | Reduce to 8px max |
| 12.2 | **Embedded `<style>` tag in WidgetCard** | `.ph-widget-card:hover` inline CSS | Move to `phStyles.css` |
| 12.3 | **WidgetSkeleton uses `var(--divider)` in dark mode** | May not resolve to correct dark token | Verify or hardcode `#2E2E2E` for dark |
| 12.4 | **Skeleton has no dark-mode awareness** | Same shimmer in both modes | Add `.dark .ph-skeleton` class usage from `phStyles.css` |
| 12.5 | **EmptyState minHeight 60px** | Too short for visual weight | Increase to 80px minimum |

---

## AREA 13: Dashboard Page (`ProjectDashboardPage.tsx`)

| # | Issue | Current | Enterprise Target |
|---|-------|---------|-------------------|
| 13.1 | **Breadcrumb uses `var(--cp-text-tertiary)`** | May not be visible enough | Use `#42526E` / `#A1A1A1` per canonical breadcrumb spec |
| 13.2 | **Button styles use `var(--cp-*)` tokens** | Good, but mixed with raw values | Fully standardize |

---

## AREA 14: Global Cross-Cutting Issues

| # | Issue | Scope | Fix |
|---|-------|-------|-----|
| 14.1 | **`rgba()` used in dark mode** | NavItem, StatusTabs, FilterChips, ProjectSwitcher, WidgetCard | Replace ALL with solid hex per NOCTURNE rules |
| 14.2 | **Inline `onMouseEnter/Leave` pattern** | NavItem, ProjectTableRow, SidebarProjectNav recents, FilterDropdown | Replace with Tailwind `hover:` or CSS `:hover` |
| 14.3 | **`isDark` manual DOM check** | `document.documentElement.classList.contains('dark')` everywhere | Standardize to `useTheme()` hook |
| 14.4 | **No ARIA landmarks** | Sidebar missing `role="navigation"`, main missing `role="main"` | Add semantic roles for screen readers |
| 14.5 | **No focus-visible on any button** | Zero keyboard focus rings across entire shell | Add canonical `focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2` |
| 14.6 | **Mixed `style={{}}` and Tailwind classes** | Every component | Audit and migrate inline styles to Tailwind where possible |
| 14.7 | **No transition on sidebar collapse** | Width animates but content has no fade | Add `opacity` transition on labels during collapse |

---

## AREA 15: Missing Enterprise Features

| # | Feature | Impact |
|---|---------|--------|
| 15.1 | **No breadcrumb trail on All Projects page** | User has no location awareness |
| 15.2 | **No "Last visited" indicator on project rows** | Can't quickly identify recent work |
| 15.3 | **No bulk actions bar** | Can't archive/star multiple projects at once |
| 15.4 | **No column resizing on project table** | Fixed widths feel rigid |
| 15.5 | **No pagination component** | Large project lists have no page controls |
| 15.6 | **No export button** | Can't export project list to CSV |
| 15.7 | **No drag-to-reorder on dashboard widgets** | Widget positions feel locked |

---

## Priority Execution Order

```text
P0 — GUARDRAIL VIOLATIONS (fix immediately)
  7.1-7.4  StatusBadge 3-color violation
  14.1     rgba() in dark mode (NOCTURNE violation)
  14.3     isDark manual DOM check → useTheme()
  6.1-6.2  Table row height violation (50px → 36px)
  9.1      Duplicate creation button violation

P1 — VISUAL POLISH (high impact)
  14.5     Focus-visible rings (WCAG AA)
  14.2     Inline hover → Tailwind hover
  8.1      Progress bar hardcoded 0%
  8.3      Fake avatar letters
  1.5      Static UserAvatar
  5.2      Keyboard nav on ProjectSwitcher
  4.1      NavItem focus ring

P2 — REFINEMENT (enterprise feel)
  2.1      Remove "All Projects v2"
  11.1     Modal button height 50px → 36px
  8.6      Card radius 12px → 6px
  12.1     Widget card radius 12px → 8px
  3.4      Active NavItem rgba → solid hex
  10.1     Tabs rgba → solid hex
  2.4      Sidebar width standardization

P3 — FEATURES (nice to have)
  15.1-15.7 Missing enterprise features
  6.6      Sort indicators
  6.3      Row selection checkboxes
```

---

## Estimated Scope

- **62 individual polish items** identified across 15 areas
- **5 guardrail violations** that break platform rules (P0)
- **~25 files** need changes
- Recommend executing in 4 batches: P0 → P1 → P2 → P3

Approve this plan to begin execution starting with P0 guardrail violations.

