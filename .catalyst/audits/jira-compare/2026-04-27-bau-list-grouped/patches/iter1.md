# Patch log — iteration 1
Date: 2026-04-27
Surface: BAU list (groupBy=status)
Auditor: Claude (jira-compare skill v3, Cowork session)

All edits in-session via the Edit tool. Scope held to two files.

## Files touched

1. `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`
2. `src/components/shared/JiraTable/JiraTable.tsx`

## Changes by audit row

| # | Pri | Tag | Change | File · landmark |
|---|-----|-----|--------|------------------|
| 4 | P1 | [CLAUDE CODE] | `pageTitle` drops " Backlog" suffix → matches Jira H1 "Senaei BAU" | BacklogPage.atlaskit.tsx · pageTitle const (≈line 239) |
| 5 + 12 | P1 + P-A11Y | [CLAUDE CODE] + [A11Y] | Type column `label: '' → 'Type'`, width `3 → 8`. Visible header doubles as accessible name on the th. | BacklogPage.atlaskit.tsx · `id: 'type'` column (≈line 1013) |
| 6 | P1 | [CLAUDE CODE] | Summary `width 22 → 33`; Parent `width 12 → 26`; Updated `defaultVisible: true → false` (Jira hides Updated by default). Hits audit acceptance ≥360px Summary, ≥280px Parent. | BacklogPage.atlaskit.tsx · summary, parent, updated columns |
| 10 | P2 | [CLAUDE CODE] | White-card `borderRadius 6 → 8` | JiraTable.tsx · grid wrapper style (≈line 1210) |
| 2 + 3 | P0 + P1 | [CLAUDE CODE] | Toolbar restructured into LEFT cluster (Search + Filter) + flex spacer + RIGHT cluster. GroupByControl moved to right cluster, anchored at toolbar-end (matches Jira's x≈971). | BacklogPage.atlaskit.tsx · toolbar block (≈lines 1614-1660) |
| 7 | P1 | [CLAUDE CODE] | New `toolbarMoreActionsButton` — @atlaskit/dropdown-menu with Refresh (wired to TanStack invalidate) + Export to CSV (stub flag). Added MoreHorizontal, RefreshCw, Download icons from lucide. | BacklogPage.atlaskit.tsx · after toolbarMaximizeIcon |
| 8 | P1 | [CLAUDE CODE] | New `toolbarViewOptionsButton` — @atlaskit/dropdown-menu with Density (Compact / Comfortable stub) and Layout (List). Distinct from JiraTable's column-picker `+`. SlidersHorizontal icon from lucide. | BacklogPage.atlaskit.tsx · after toolbarMaximizeIcon |

## Imports updated

- `@atlaskit/dropdown-menu` — added `DropdownItem`, `DropdownItemGroup` to existing named imports.
- `lucide-react` — added `MoreHorizontal`, `SlidersHorizontal`, `RefreshCw`, `Download`.

## Pending / external (not in this iteration)

- **#1 [LOVABLE]** — avatar strip + "Add people" CTA. Handoff at `handoffs/LOVABLE-01-avatar-strip-add-people.md`.
- **#9 [DESIGN-CRITIQUE]** — top-right "Give feedback" / "Enter full screen" CTAs. Handoff at `handoffs/DESIGN-CRITIQUE-09-top-right-ctas.md`.
- **#11** — avatar group `appearance="circle"` size confirmation, deferred until LOVABLE lands the strip.
- **#13 [A11Y]** — AvatarGroup `+N` aria-label, deferred until LOVABLE lands the strip.

## Verification (pre-Phase 7)

- [x] Two files only (`BacklogPage.atlaskit.tsx`, `JiraTable.tsx`).
- [x] No new npm dependencies.
- [x] No new `!important` blocks.
- [x] No HSL values introduced.
- [x] Atlaskit-only for new interactive elements (DropdownMenu/DropdownItem/Tooltip/lucide for chrome icons per CLAUDE.md §11).
- [x] All P0/P1/P2/P-A11Y CLAUDE CODE rows in scope addressed; LOVABLE/DESIGN-CRITIQUE deferred per tag.

Next: Phase 7 — re-probe Catalyst surface via Chrome MCP.
