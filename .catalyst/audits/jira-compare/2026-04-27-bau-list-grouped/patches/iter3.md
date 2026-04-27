# Patch log — iteration 3 (post-ship regression fix)
Date: 2026-04-27
Surface: BAU list (groupBy=status)

## What triggered iter 3

Vikram review of iter-2 ship surfaced a regression the audit missed: Jira renders the page chrome on a soft blue tint (`#E9F2FE`) with a white card sitting on top, while Catalyst was painting everything flat white (`#FFFFFF`). The audit's "body bg = white" finding was true at the body level but missed the chrome layer that wraps the white card.

## Changes

| File | Change |
|---|---|
| `src/components/ads/AtlaskitPageShell.tsx` | Added 3 opt-in props: `chromeBg?`, `cardPadding?: number \| {x,y}`, `cardBorder?`. Default behavior unchanged — when callers omit these, the shell still paints flat white per V3. |
| `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | Opted in: `chromeBg="#E9F2FE"`, `cardPadding={{ x: 48, y: 16 }}`, `cardBorder="1px solid #DFE1E6"`. |

## Scope discipline

The change is opt-in at the call site. No other AtlaskitPageShell consumer is affected:

- `src/pages/ProjectHubDashboard.tsx` — keeps V3 flat white
- `src/pages/ReleaseHub.tsx` — keeps V3 flat white
- All other migrated hubs — keep V3 flat white

Verified by grep: no other file in the codebase passes `chromeBg`, `cardPadding`, or `cardBorder` to AtlaskitPageShell.

## RE-PROBE results

| Metric | Jira | Catalyst (iter 2) | Catalyst (iter 3) | Verdict |
|---|---|---|---|---|
| Page chrome bg | `rgb(233, 242, 254)` | `rgb(255, 255, 255)` | `rgb(233, 242, 254)` | ✓ match |
| White card bg | `rgb(255, 255, 255)` | flat white everywhere | `rgb(255, 255, 255)` | ✓ |
| Card border-radius | 8px | 8px | 8px | ✓ |
| Card border | 0.555px solid #DFE1E6 | none | 0.555px solid #DFE1E6 | ✓ |
| Card x (left offset) | 48 | 8 (flush) | 56 (48 + 8 from outer shell) | ≈ |
| Card y (top offset) | 280 | 56 | 72 | ✗ (project header band missing — see F-NEW-4) |

## Wiring tests after iter 3 — all carry over

- ✓ Group pill still anchored right (groupBtnX=825 — narrower viewport this run, same right-cluster anchor)
- ✓ Type column still labeled "Type"
- ✓ Toolbar split intact
- ✓ View Options + More Actions menus still open with correct content
- ✓ Group expand/collapse still works
- ✓ Row click → side panel still works

## Still open

The card y-offset gap (72 vs 280) is the F-NEW-4 finding from the Phase 9 Context Handoff. It requires restructuring the H1 + adding a project-header band (Spaces breadcrumb, project icon, tabs row) ABOVE the white card. That's structural and properly scoped to a fresh `/jira-compare` or `/regression` run, not iter 3.

## Files touched (iter 1 + 2 + 3 cumulative)

1. `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`
2. `src/components/shared/JiraTable/JiraTable.tsx`
3. `src/components/ads/AtlaskitPageShell.tsx` (NEW in iter 3 — additive, opt-in props only)

No new npm dependencies. No new `!important`. No HSL. No global behavior change.
