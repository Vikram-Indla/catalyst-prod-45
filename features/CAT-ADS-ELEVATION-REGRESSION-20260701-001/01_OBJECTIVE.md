# Objective

## Problem
Post ADS token migration, light mode has three confirmed visual regressions:
1. **Panel-over-panel**: back panel border disappears, overlay shadow collapses
2. **Resource 360 cards**: card borders nearly invisible
3. **Work item keys**: text pale/dull, low contrast

## Root Cause (Council-verified)
- `shadow-lg` Tailwind survived ADS migration in 4 radix-ui wrappers — 10% opacity shadow on near-white = invisible
- `--ds-shadow-raised` in Atlaskit light mode = `rgba(9,30,66,0.08)` vs pre-migration hand-rolled `rgba(9,30,66,0.25)` — 3× lighter
- `--ds-border` = 14% opacity on white cards — invisible without shadow backup
- `--ds-text-subtlest` on work item keys = 3.8:1 contrast (below WCAG AA)
- Custom tokens `--fg-3`, `--aw-blue`, `--aw-text-subtle` unmigrated in Resource360/workhub

## Done = 
- Overlay surfaces use `var(--ds-shadow-overlay)` — panel-over-panel visible
- R360 card/canvas borders use `var(--ds-border-bold)` — edges clear
- Work item keys use `var(--ds-text-subtle)` — 5.3:1 contrast
- All custom tokens migrated to ADS equivalents
- ADS gates pass, zero new violations

## Non-scope
- Divider/separator borders (intentionally subtle `--ds-border`)
- Dark mode shadows (different token path, separate audit)
- Atlaskit component-internal shadow values (not owned by Catalyst)
