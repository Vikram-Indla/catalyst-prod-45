# Plan Lock — CAT-ADS-BTN-ALLRELEASES-20260629-001

**Objective:** Migrate the 10 shadcn `ui/button` usages in `src/features/all-releases/` to the canonical `@atlaskit/button/new`, removing banned Tailwind colors on those buttons as a side effect.

**Approved scope (pilot):** 4 files, 10 buttons.

| File | Button | ADS appearance |
|---|---|---|
| Toolbar.tsx | filter trigger (FilterButton) | default + isSelected + Badge |
| Toolbar.tsx | sort trigger | default, iconBefore |
| Toolbar.tsx | clear filters | subtle compact, iconBefore |
| FilterBar.tsx | status / health / quarter | default + isSelected (+ Badge ×2) |
| FilterBar.tsx | clear filters | subtle compact, iconBefore |
| AIInsightsBar.tsx | show all/less | subtle compact, iconAfter |
| AIInsightsBar.tsx | insight action | link, iconAfter |
| AIInsightsDrawer.tsx | close (icon-only) | IconButton subtle, label="Close" |

**Execution refinement:** dropdown triggers use `spacing="default"` (32px) — closest ADS grid height to the 34px input row; `compact` reserved for inline subtle actions.

**Out of scope (next slice):** hand-rolled `<button>` view toggle (Toolbar), hand-rolled insight-item link (AIInsightsDrawer), all non-button banned colors in these files, the other 9 directories.

**Verify:** dark-mode screenshots (toolbar, filter bar, AI insights) · DOM probe dropdown `aria-expanded` · `npm run lint:colors:gate` · `npx tsc -p tsconfig.app.json`.

**Stop conditions:** any dropdown trigger stops opening (asChild ref break) → halt and raise.

Approved by Vikram (JK) 2026-06-29.
