# Session 001 — gap analysis + Slice 1 (palette unification)

## Gap analysis
Verified ADS Lozenge spec from installed `@atlaskit/lozenge` v11.14.0:
11px / 700 / UPPERCASE / radius 3px; subtle = transparent bg + colored text + 1px
colored border; appearances default·inprogress·moved·new·removed·success.

Three status families found:
- A: `ads/Lozenge.tsx` wrappers (canonical) — ~400 sites.
- B: `CatalystStatusPill` + `WorkItemStatusLozenge` + `JiraStatusLozenge` on
  `statusPalette.ts` — locked sentence-case/500/subtle (CAT-R360-ADS-TYPO-...).
- C: ~8 bespoke status dropdowns.

## Decisions (Vikram, 2026-06-29)
1. Keep the typography lock — no Family B change.
2. Drop the ~52-file direct-import "cleanup" (visual no-op + wrapper injects a
   layout span = 52-file layout-regression risk for zero gain).
3. Approve Slice 1 (palette unification).

## Slice 1 — DONE (not committed)
File: `src/components/hierarchy/StatusBadge.tsx`
- Removed drifted `STATUS_STYLES_LIGHT` / `STATUS_STYLES_DARK` (incl. two raw-rgb
  fallbacks) + `useTheme()` dependency.
- `getStatusStyle` now resolves via canonical `statusBg`/`statusFg`
  (grey→default, blue→inprogress, green→success). Matches CatalystStatusPill.
- Blast radius: `hierarchy/StatusDropdown` (×3 callers) + `KanbanSwimlane`.

Validation:
- tsc (`-p tsconfig.app.json`) — no errors in touched files.
- `npm run lint:colors:gate` — 76 = baseline 76 (no increase).
- Live DOM probe (localhost:8080): all 6 canonical tokens resolve non-transparent.

## Skipped / out of scope (with reason)
- `tasks/.../colors.ts` STATUS_COLORS — explicit `// DO NOT MODIFY` + dot-color
  model (not lozenge bg/fg). Not touched.
- incidents / test-cycles / producthub / epics(brand) / theme(brand) dropdowns —
  distinct domains/workflows; `StatusTransitionDropdown` already canonical.

## Follow-ups (need approval)
- Slice 2 candidate: `StatusBadge` typography (700/uppercase) still diverges from
  the locked sentence-case/500 — align for full consistency.
