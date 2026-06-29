# Session 002 — r360 vs assigned typography RCA + live-verified fix

## Trigger
User: typography/font on `/for-you/r360` wrong (incl. status pills); `/for-you/assigned` correct. RCA + fix.

## RCA (DOM-probed, both routes)
- Both routes render `ForYouPage.atlaskit`; `:tab` selects panel.
  - `assigned` → `AssignedPanel` → ADS lozenge (weight 500, sentence case).
  - `r360` → `R360Panel` → `R360MemberDetail` → `CatalystStatusPill` (`.csp-v7-pill`).
- font-family was NOT the issue — both compute `"Atlassian Sans"` (bridge token index.css:3878 wins).
- Real defect = pill typography hard-coded in `CatalystStatusPill`:
  - trigger `.csp-v7-pill`: weight 700, letter-spacing 0.04em, text-transform uppercase.
  - dropdown item span: weight 700, letter-spacing 0.04em, uppercase.
- Live before: `IN REQUIREMENTS` fw700 / uppercase / ls 0.44px.

## Fix
`src/components/catalyst-detail-views/shared/sections/CatalystStatusPill.tsx`
- weight 700 → 500; removed letter-spacing + text-transform:uppercase (both occurrences).
- Group-heading letterSpacing retained. No color change.

## Validation
- Live re-probe (r360): `In Requirements` → fw500 / tt none / ls normal / Atlassian Sans. Matches assigned.
- Residual scan: only group-heading letterSpacing remains; zero 700/uppercase.
- `npm run lint:colors:gate`: 76 = baseline 76, no new colors.

## Out of scope (confirmed)
Pill colors (full saturation kept), per-env status names (Refinement/Blocked).
