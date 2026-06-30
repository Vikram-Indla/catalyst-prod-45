# Plan Lock — CAT-SHELL-COMPACT-HEADER-20260629-002

**Status: AWAITING APPROVAL**

---

## Objective

Bring all active product-hub list pages to ≤200px first-data-row.

## Baseline (before Phase 2)

| Page | firstData | bc.top | Status |
|---|---|---|---|
| Backlog | 194px | 70px | ✅ (Phase 1) |
| Milestones | 198px | 90px | ✅ (lightweight, no toolbar) |
| Timeline | 221px | 90px | ❌ |
| Boards | ~261px | 90px | ❌ |
| Filters | ~259px | 90px | ❌ |

## Root Cause (confirmed)

`CatalystShell.tsx:582` — `isSelfFramedRoute` bypasses `HubSurface` for backlog.
All other pages go through `HubSurface(framePadding:24)` → `padding:24px` above AtlaskitPageShell → 24px penalty.

Backlog has `padY:4` (cardPadding) → bc:70.
Others have HubSurface 24px → bc:90. Difference = 20px.

## Architecture chain

```
Backlog (✅):
  isSelfFramedRoute=true → no HubSurface
  → BacklogPage.atlaskit → AtlaskitPageShell(cardPadding:{x:24,y:4})
  → chromeBand at 56+4=60 → bc at 64 → firstData ~194px

Timeline/Boards/Filters (❌):
  isSelfFramedRoute=false → HubSurface(framePadding:24)
  → padding:24px → inner at 80
  → CatalystListPageLayout → AtlaskitPageShell(flush)
  → chromeBand at 80 → bc at 90 → 24px penalty vs backlog
```

## Projection after Phase 2

Remove HubSurface top penalty for these routes:

| Page | Current | After HubSurface fix | After toolbar fix | Target |
|---|---|---|---|---|
| Timeline | 221px | ~197px (-24) | N/A | ✅ 197 |
| Boards | ~261px | ~237px (-24) | ~197px (-40) | ✅ 197 |
| Filters | ~259px | ~235px (-24) | ~197px (-38) | ✅ 197 |

## Approach

**Step 1: Add routes to `isSelfFramedRoute`** (1 file, 1 change)

File: `src/components/layout/CatalystShell.tsx:582`

Add product-hub list routes to `isSelfFramedRoute` regex so HubSurface is bypassed:
```tsx
const isSelfFramedRoute =
  /^\/(project|product)-hub\/[^/]+\/backlog/.test(location.pathname) ||
  /^\/(project|product)-hub\/[^/]+\/(boards|filters|timeline|milestones)/.test(location.pathname) || // NEW
  /^\/project-hub\/[^/]+\/allwork\/[^/]+/.test(location.pathname) ||
  ...
```

This makes `shouldWrapHubSurface=false` for these routes → `<Outlet />` directly, no HubSurface.

These pages already own AtlaskitPageShell via CatalystListPageLayout (flush mode). No padding prop needed — `flush=true` means padY=0, chromeBand sits at viewport:56+0=56. Saves 24px.

**Step 2: Add cardPadding to CatalystListPageLayout** (1 file, targeted)

After removing HubSurface, AtlaskitPageShell outer starts at 56. Currently uses `flush` (padY=0). Need `padY=4` like Backlog to get chromeBand at 60, not 56.

File: `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx`

Change: pass `cardPadding={{ x: 0, y: 4 }}` instead of `flush` on AtlaskitPageShell.

OR: add a `cardPaddingY?: number` prop to CatalystListPageLayout, default 4 for new self-framed behavior.

Wait — this might not be needed for Boards/Filters since they use their own toolbar. For Timeline: the chromeBand sits at 56+0=56 after HubSurface removal. bc will be at 60 (chromeBand top:4 padding). firstData = 56 + 36 (header) + 49 (timeline internal) + 56 (colH) = 197. ✅

Keep `flush` (padY=0) for these pages — adding 4px back would push to 201 for Timeline. Leave as-is.

**Step 3: Reduce Boards/Filters internal toolbar padding**

After Step 1, Boards/Filters still ~237-235px. Need ~40px savings from toolbar area.

Boards: tab bar (40px min-height) + toolbar row + internal top padding → probe after Step 1 to measure.
Filters: same pattern (tab bar + search toolbar).

Approach: reduce container `paddingTop` or `padding` inside CatalystListPageLayout's content wrapper.

File: `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx:84`
Current: `<div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 32px' }}>`
Change: keep as-is — this is BELOW the tab bar, not above.

The tab bar and toolbar are passed via `toolbar` and `tabs` props. Check padding on those slots.

Probe after Step 1 to measure remaining gap before committing Step 3.

## Files to modify

| File | Change | Risk |
|---|---|---|
| `src/components/layout/CatalystShell.tsx` | Add regex for boards/filters/timeline/milestones to `isSelfFramedRoute` | Low |
| `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx` | Potential `paddingTop` reduction on toolbar slot | Medium |

## Files FORBIDDEN

- `src/components/ads/AtlaskitPageShell.tsx` — do NOT touch
- `src/pages/product-hub/MilestonesPage.tsx` — already passing, do NOT touch
- `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` — Phase 1 complete
- `design-governance/*` baselines — update ONLY if new violations added (should be zero)

## Non-scope

- Dashboard (/product-hub/INV/dashboard) — widget page, different metric, skip
- AllWork — uses different shell (ProjectAllWorkView), separate work
- Dependencies — no data, skip
- Project-hub equivalents — out of scope for this slice

## Timebox

≤ 2 hours

## Validation commands

```bash
npm run lint:colors:gate
npm run audit:ads:gate
npm run tsc --noEmit
```

DOM validation (after each step):
```js
const fd = document.querySelector('tbody tr:first-child') || document.querySelector('[role="row"]:not([role="columnheader"])');
fd?.getBoundingClientRect().top
```

## Stop conditions

- Any TypeScript error → stop and fix before continuing
- firstData > 200px after Step 1 + Step 3 → accept or raise RED FLAG
- HubSurface change breaks any other page layout → revert, raise RED FLAG

## Screenshot checklist

After all steps:
- [ ] Timeline: annotated screenshot, bc.top and fd.top visible
- [ ] Boards: annotated screenshot
- [ ] Filters: annotated screenshot
- [ ] Milestones: confirm still passing
- [ ] Backlog: regression check still 194px

---

**Recommended conversation title:** CAT-SHELL-COMPACT-HEADER-20260629-002 — Phase 2 viewport compaction (Timeline/Boards/Filters)
