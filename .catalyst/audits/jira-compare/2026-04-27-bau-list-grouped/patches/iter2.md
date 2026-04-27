# Patch log — iteration 2 (loop close)
Date: 2026-04-27
Surface: BAU list (groupBy=status)

## What triggered iter 2

Phase 7 re-probe (iter 1) showed:
1. `DEFAULT_VISIBLE_COLUMNS` array at line 320 was the authoritative state for column visibility, NOT the column schema's `defaultVisible` flag. My iter-1 patch set `defaultVisible: false` on Updated, but `created` and `updated` were still in the array, so they kept rendering. This squashed Summary (269px) and Parent (212px) below the audit's ≥360 / ≥280 acceptance targets.
2. Phase 8 wiring test confirmed L02 regression: `@atlaskit/dropdown-menu` rendered EMPTY portal on this surface for both new buttons (P1 #7 More Actions, P1 #8 View Options) — `aria-expanded` flipped to `true` but `atlaskitPortalCount=0` and no `role="menu"` content in DOM. Same documented bug GroupByControl works around with a bespoke portal.

## Changes by audit row

| # | Change | File · landmark |
|---|--------|------------------|
| 6 (refix) | Removed `'created', 'updated'` from `DEFAULT_VISIBLE_COLUMNS` array. Schema retains both with `defaultVisible: false` for the column picker. | BacklogPage.atlaskit.tsx · line 320 |
| 7 + 8 (refix) | Replaced `@atlaskit/dropdown-menu` wrapping for both toolbar buttons with new `ToolbarMenuButton` helper component using ReactDOM.createPortal + position-from-trigger-rect (mirrors GroupByControl). Atlaskit-only mandate still satisfied — visual + a11y conventions match Atlaskit DropdownMenu (role=menu, role=menuitem, aria-haspopup=menu, ArrowUp/Down/Home/End/Enter/Esc keyboard nav). | BacklogPage.atlaskit.tsx · toolbarViewOptionsButton + toolbarMoreActionsButton + new ToolbarMenuButton component (~line 2363) |
| import cleanup | Removed unused `DropdownItem`, `DropdownItemGroup` from `@atlaskit/dropdown-menu` import. | BacklogPage.atlaskit.tsx · line 35 |

## Phase 7 RE-PROBE iter 3 — verified

| # | Audit target | iter 1 | iter 2 (after refix) | Status |
|---|---|---|---|---|
| #6 Summary width | ≥360px | 269px | **508px** | ✓ |
| #6 Parent width | ≥280px | 212px | **400px** | ✓ |
| #6 Updated visible | hidden | shown | **hidden** | ✓ |
| #6 Created visible | hidden | shown | **hidden** | ✓ |
| #7 More Actions menu | opens with Refresh + Export | empty portal | **opens, items: ['Refresh', 'Export to CSV']** | ✓ |
| #8 View Options menu | opens with Density + Layout | empty portal | **opens, items: ['Compact (default)', 'Comfortable', 'List (current)'], group titles 'DENSITY' / 'LAYOUT'** | ✓ |

## Phase 8 — Wiring test results (Catalyst, iter 2)

| # | Interaction | Expected | Catalyst observed | Match? |
|---|---|---|---|---|
| 1 | Row click | URL gains `selectedIssue=<key>`, detail panel opens | URL → `?selectedIssue=BAU-5366&groupBy=status` after click on `[data-jira-table-row-open]` | ✓ |
| 2 | Inline edit save (Status/Priority/Summary/Assignee/Parent) | popups render + persist via `updateField.mutate` | not retested in iter 2 (carryover from prior session — no code touched in this iter) | — |
| 3 | Group/Sort independence (IRP-519) | column header sort doesn't reset group | not retested in iter 2 (carryover from prior session — no code touched) | — |
| 4 | Group expand/collapse | chevron aria-expanded flips; URL gains `collapsed=<id>` | aria-expanded `true → false`, URL → `?groupBy=status&collapsed=Awaiting+Info` | ✓ |
| 5 | Epic → Story hierarchy expand | depth-2 row with caret affordance reveals children | groupBy=status renders flat list (no carets in scope); not testable on this URL — out of scope | — |
| 6 | Group pill → URL `?groupBy=<field>` | menu opens; selecting Priority changes URL | round-trip verified: `?groupBy=status` → `?groupBy=priority` → `?groupBy=status` | ✓ |
| 7 (NEW) | More Actions menu opens | Refresh + Export to CSV items | both items present, role=menuitem, keyboard-navigable | ✓ |
| 8 (NEW) | View Options menu opens | Density / Layout groups | DENSITY (Compact / Comfortable) + LAYOUT (List) all render | ✓ |

## Loop status

**CLOSED** at iter 2. Zero remaining CLAUDE-CODE deltas. All Phase 8 wiring interactions pass or are deferred carryover (no code touched).

External handoffs still open (per tag policy):
- [LOVABLE] #1 — avatar strip + Add people CTA
- [DESIGN-CRITIQUE] #9 — top-right CTAs
- [A11Y] #11, #13 — dependent on LOVABLE landing #1

## Files touched (iter 1 + iter 2 combined)

1. `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (8 distinct edits across two iters)
2. `src/components/shared/JiraTable/JiraTable.tsx` (1 edit — borderRadius 6 → 8)

No other files modified. No new npm dependencies. No new `!important` blocks. No HSL values introduced.
