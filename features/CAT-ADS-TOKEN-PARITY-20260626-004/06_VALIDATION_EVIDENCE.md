# 06_VALIDATION_EVIDENCE — ADS-13 Slice 1 (Finding 1)

Branch: `fix/dark-chrome-ads13` (off main `83bde822e`)
File: `src/index.css` — dark rule `html.dark, html[data-color-mode="dark"]`

## Change
- Replaced now-false top comment block (claimed "uniform white / no tonal step").
- Deleted Group A: 28 self-referential `var(--ds-surface, #ffffff) !important` declarations
  (+ 3 group sub-comments) that Group B (the 2026-06-24 dark ramp) already overrode by source order.
- Group B ramp untouched.
- Diff: `+8 / −45`, one file.

## Safety gate (render-identity proof)
`comm -23` of var-names set in Group A (6092–6119) vs Group B (6125–6159) = EMPTY.
→ every removed property is re-declared later by Group B at equal specificity → Group B always
won → computed values cannot change. Deletion is byte-identical at render.

## Build
`npm run build` → exit 0, `✓ built in 2m 4s`.

## Live DOM probe (dev server :8080, dark scope forced)
`getComputedStyle(documentElement)` with `.dark` + `data-color-mode="dark"`:
- `--ds-surface-overlay` === `#282e33` AND `--ds-surface` === `#22272b`
- `overlayLiftedAboveBase: true` → overlay one tone above base, hub-switcher elevation intact.

## Conclusion
Footgun removed, dark ramp resolves correctly, no regression. Awaiting commit approval.
