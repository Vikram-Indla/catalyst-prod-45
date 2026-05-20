---
name: gap-report-spec
version: 1.0.0
description: >-
  Mandatory gap report table format for /catalyst-agent v3. Every probe cycle
  MUST output one structured comparison table per component — never prose or bullets.
  Also defines the ADS Compliance Scan table and Completion Evidence Block formats.
---

# GAP_REPORT.md — Mandatory Output Formats for /catalyst-agent v3

This file defines the ONLY accepted output format for probe results, ADS scans, and
completion evidence. Prose findings lists are REJECTED. Tables are MANDATORY.

---

## 1. Gap Report Table (Step 5 output — one table per component)

### Header

```
Component N — [Component Name]
URL probed: http://localhost:8080/[path] vs https://digital-transformation.atlassian.net/[path]
Probe timestamp: [ISO time]
```

### Table format

```
# | Dimension            | Jira (live probe)                          | Catalyst Current                         | Gap
--|----------------------|--------------------------------------------|------------------------------------------|------
1 | [dimension label]    | [exact measured value from Jira DOM]       | [exact measured value from Catalyst DOM] | [delta or "Match"]
```

**Rules:**
- `#` = row number, sequential
- `Dimension` = one of the standard dimensions below, or a surface-specific label
- `Jira (live probe)` = computed-style measurements, DOM structure, or Jira MCP schema — never assumptions
- `Catalyst Current` = same measurement from localhost:8080 — never assumptions
- `Gap` = specific delta (e.g. "11px → 14px") or `Match` if identical; never "N/A" unless the dimension truly doesn't apply and you state why
- If a dimension cannot be probed (e.g. Jira side unreachable), mark `[unprobed — lane timed out]` and log it as an open question

---

## 2. Standard Dimension Lists

Use these as the starting dimension set. Add surface-specific dimensions below the standard set.

### UI Component (popover, popout, panel, modal)

```
# | Dimension
1 | Trigger element (label, icon, shortcut)
2 | Panel size (width x height)
3 | Panel position (alignment, offset)
4 | Header (title, close button, typography)
5 | Search input (placeholder, icon, clear behaviour)
6 | List item layout (icon, label, secondary text, spacing)
7 | Multi-select behaviour (checkbox, count badge)
8 | Footer (apply/clear/cancel buttons, layout)
9 | Active accent (selected state indicator)
10 | Token compliance (@atlaskit/* + var(--ds-*))
11 | Typography (font-size, font-weight, color)
12 | Spacing grid (4/8/16/24/32px only)
13 | Keyboard navigation (Tab, Arrow, Enter, Esc)
14 | Accessibility (ARIA role, label, focus ring)
```

### List / Table surface

```
# | Dimension
1 | Column set (names, order, visibility defaults)
2 | Column widths (px or %)
3 | Row height (px, density: compact/comfortable/spacious)
4 | Cell renderers (key cell, status pill, assignee, etc.)
5 | Sort mechanism (header click, indicator direction)
6 | Group-by (header row, collapse chevron, count badge)
7 | Inline create row (trigger, placeholder, type picker)
8 | Bulk select (checkbox column, footer bar)
9 | Row hover affordances (drag handle, action buttons)
10 | Toolbar (filter chips, group, view toggle, search)
11 | Column picker (field count, search, tabs)
12 | Pagination / virtualization (load-more, scroll)
```

### Detail view / right rail

```
# | Dimension
1 | Section headers (font-size, weight, color)
2 | Field label (font-size, weight, color)
3 | Field value (font-size, weight, color)
4 | Status pill (size, color, typography, edit affordance)
5 | Assignee field (avatar, name, "Assign to me" link)
6 | Parent field (breadcrumb vs picker)
7 | Priority field (icon, label, edit affordance)
8 | Labels field (pill border, remove X, add affordance)
9 | Fix versions (pill border, spacing, gate per type)
```

### Toolbar

```
# | Dimension
1 | Left-side controls (filters, group, view toggle)
2 | Right-side controls (columns, search, etc.)
3 | Filter chip appearance (label, count badge, clear X)
4 | Active filter accent (colour, border, background)
5 | Keyboard shortcut wiring (Shift+F, etc.)
6 | Tooltip content and delay
7 | Height / spacing (px)
```

---

## 3. ADS Compliance Scan Table (Step 4.5 output)

Output immediately after running `node design-governance/cli/index.js audit src/[file-or-dir]`:

```
ADS Compliance Scan — [Surface / File]
Scanned: [file path or directory]
CLI tool: node design-governance/cli/index.js audit [path]
```

```
# | Element / File           | Violation Type        | Current value                  | ADS fix                          | Sev
--|--------------------------|----------------------|--------------------------------|----------------------------------|----
1 | [component:line]         | HARDCODED_HEX        | #FF0000                        | var(--ds-text-danger)            | P0
2 | [component:line]         | TAILWIND_UTILITY     | text-slate-500                 | var(--ds-text-subtle)            | P1
3 | [component:line]         | OFF_GRID_SPACING     | padding: 12px                  | padding: 8px or 16px             | P2
4 | [component:line]         | NON_ATLASKIT_COMP    | <select> (hand-rolled)         | @atlaskit/select                 | P0
5 | [component:line]         | UPPERCASE_LABEL      | text-transform: uppercase      | sentence-case label              | P1
```

**Violation types:**
- `HARDCODED_HEX` — any `#RRGGBB` or `rgb()` not inside a `var(--ds-*)` fallback
- `TAILWIND_UTILITY` — any Tailwind class used for final visual value (text-*, bg-*, p-*, m-*, etc.)
- `OFF_GRID_SPACING` — padding/margin/gap not in {0, 4, 8, 12, 16, 24, 32, 40, 48}px
- `NON_ATLASKIT_COMP` — interactive element not from `@atlaskit/*` (menus, selects, modals, buttons)
- `UPPERCASE_LABEL` — `text-transform: uppercase` or `textTransform: 'uppercase'` on any label

**Routing after scan:**
- `HARDCODED_HEX` or `TAILWIND_UTILITY` (color/theme) → `design-ui-designer` agent
- `NON_ATLASKIT_COMP` → `engineering-frontend-developer` agent
- `OFF_GRID_SPACING` or `UPPERCASE_LABEL` → `design-ui-designer` agent
- All fixes offered as value-added items in the current session (confirm with Vikram before executing)

---

## 4. Completion Evidence Block (Step 8 output — MANDATORY after every implementation action)

```
+------------------------------------------------------------------+
|  📸 EVIDENCE — Component N ([Component Name])                    |
|  URL:          http://localhost:8080/[path]                       |
|  Screenshot:   [Computer Use mcp__computer-use__screenshot]      |
|  Timestamp:    [ISO time]                                         |
|                                                                    |
|  Gap items resolved:   N of [total in table]                      |
|  ✅ Fixed:             [list gap row # and label]                 |
|  🔴 Remaining open:    [list gap row # and label]                 |
|                                                                    |
|  ADS violations fixed: N / total scan findings: N                 |
|  Remaining ADS open:   N (requires Vikram approval)               |
+------------------------------------------------------------------+
```

**Rules:**
- Screenshot is taken IMMEDIATELY after the change is live in the browser (hard-reload if needed)
- If Computer Use MCP is unavailable, state "Computer Use unavailable — manual verification required" and do NOT declare done
- The block appears once per component/fix action — not once per session
- "Done" is BLOCKED until this block is produced

---

## 5. Multi-Component Session Format

When a session covers multiple components (e.g. toolbar + filter panel + column picker):

```
SESSION SUMMARY
Branch: [branch-name]
Surfaces probed: N
Components compared: N
Total gap rows: N
Total gap rows fixed: N (N%)
Total ADS violations found: N
Total ADS violations fixed: N

Component inventory:
  Component 1 — [Name]: N gaps, N fixed, N ADS
  Component 2 — [Name]: N gaps, N fixed, N ADS
  Component 3 — [Name]: N gaps, N fixed, N ADS

Open items requiring Vikram approval:
  1. [item]
  2. [item]

Context guard status: [GREEN | YELLOW at 70% | RED at 90%]
```

---

## 6. Gap Row Status Conventions

Use these inline in the Gap column:

| Symbol | Meaning |
|--------|---------|
| `Match` | Jira and Catalyst are identical |
| `Fixed ✅` | Was a gap; now resolved in this session |
| `[value delta]` | Open gap (e.g. "11px → 14px missing") |
| `Deferred (Vikram)` | Approved deferral by Vikram in chat |
| `[unprobed]` | Probe timed out or lane was unavailable |
| `Banned` | Item is banned per CLAUDE.md — do not implement |

---

## See Also

- `SKILL.md` — the 11-step pipeline that references this file
- `CONTEXT_GUARD.md` — context window depletion protocol
- `CORE_DIRECTIVES.md` — Directive 3 (tool override), 4 (context guard), 5 (screenshot evidence)
- `ROUTER.md` — which probe agents own which dimensions
