# Plan Lock — CAT-ADS-STATUS-SWEEP-20260629-001

## Objective
Canonical-sweep status pills + status dropdowns against the verified Atlassian
Lozenge spec — WITHOUT regressing the locked work-item pill typography
(sentence-case / weight 500 / subtle-filled, set by CAT-R360-ADS-TYPO-20260629-001).

## Verified ADS spec (ground truth: @atlaskit/lozenge v11.14.0)
- 11px / weight 700 / UPPERCASE / radius 3px / line-height 16px.
- `isBold` default false → subtle = transparent bg + colored text + 1px colored border.
- appearances: default · inprogress · moved · new · removed · success · maxWidth 200.
- Dropdown-trigger: Beta ADS pattern, no separate package installed.

## Decision (Vikram, 2026-06-29)
1. KEEP the lock — do NOT touch CatalystStatusPill typography (sentence-case/500/subtle).
2. Scope = consolidate work-item status sprawl + (pending) direct-import cleanup.

## In scope — palette unification (safe, no layout/typography change)
Kill duplicate LOCAL color maps in renderers that paint *work-item* status
(todo/in-progress/done) and source from the canonical statusPalette.ts:
- `src/components/hierarchy/StatusBadge.tsx` — STATUS_STYLES_LIGHT/DARK 3-tier map
  (feeds hierarchy/StatusDropdown, 3 call sites) → use categoryBg/categoryFg.
- tasks status color map (feeds modules/tasks/.../StatusDropdown) → statusPalette.

## Out of scope — domain-specific, keep separate (proof attached)
- `incidents/IncidentStatusDropdown` — incident workflow, `--sem-*` tokens.
- `test-cycles/assignment-table/StatusSelect` — test status (pass/fail/blocked) ≠ work-item.
- `producthub/shared/StatusSelect` — intake→closure workflow, needs DB workflow config.
- `items/epics/drawer/EpicStatusDropdown` — admin-driven brand colors (DB), documented ignore-lines.
- `backlog/ThemeStatusDropdown` — theme lifecycle brand colors.
- `workflow/StatusTransitionDropdown` — already canonical (lozenge + useCanonicalIssueWorkflow).

## RED FLAG — direct-import "cleanup" (decision needed)
Routing the ~52 production files that import `@atlaskit/lozenge` directly through
the `ads/Lozenge` wrapper is:
- a VISUAL no-op (wrapper renders identical native AkLozenge), AND
- a LAYOUT-regression risk in 52 files — the wrapper injects
  `<span style="display:inline-block;width:fit-content;justify-self:start;align-self:center">`
  which changes flow/grid behaviour vs a bare AkLozenge.
Recommendation: SKIP the blanket swap. Optionally do a tiny verified subset only.
Awaiting Vikram confirm before any of these 52 files are touched.

## Files modified (slice 1 only, pending approval)
- `src/components/hierarchy/StatusBadge.tsx`
- tasks status color source (exact file confirmed at execution start)

## Validation
- ADS color gate (`npm run audit:ads:gate`) — must not increase.
- DOM probe: hierarchy + tasks status pills render statusPalette tokens, dark + light.
- No change to CatalystStatusPill output (typography lock intact).

## Stop conditions
- One cluster per commit. Screenshot/live acceptance before each commit.
- Halt on any layout shift in consuming tables.
