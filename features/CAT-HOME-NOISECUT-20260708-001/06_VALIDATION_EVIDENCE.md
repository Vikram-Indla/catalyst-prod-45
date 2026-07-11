# Validation evidence — slice 1

## Static checks
- `npx tsc --noEmit` → **0 errors** (baseline was 183; strictly better, no new errors).
- `npm run lint:colors:gate` → ✅ 0 = baseline 0.
- `npm run audit:ads:gate` → ✅ tokens 22480/22480 (ratcheted down from 22481), typography
  1427/1427, spacing 0/0, fontImports 0/0. Baselines committed via `--update`.

## Tests
- `npx vitest run src/pages/__tests__/ForYouPage.defaultTab.test.ts src/components/for-you` →
  39 pass / 9 fail.
- Confirmed via `git stash` (scoped to only the 6 changed files) + re-run against clean main: the
  **same 9 tests fail identically on unmodified main** (AgeingPanel.navigate, CatyMorningBrief,
  CatyWorkloadRisk, ForYouRow.height [pre-existing 56-vs-62 spec drift, untouched by this slice],
  R360Panel.embedded ×2, R360Panel.sidebar ×4). Zero regressions introduced by this slice.

## Live data check (staging, cyij) — read-only
```sql
select status, status_category, count(*) from ph_issues
where assignee_account_id is not null group by 1,2 order by 3 desc limit 30;
```
Surfaced the real category vocabulary (`todo` / `in_progress` / `done`) and the underscore-vs-space
bug documented in 04_EXECUTION_LOG.md #6 / 08_DRIFT_LOG.md.

## Live screenshots — localhost:8080, real 69-item "Assigned to me" dataset
1. **Light, /for-you, after fix**: 2 real buckets ("To do 6", "In progress 6"), zero row lozenges,
   literal status as subtle meta ("· On Hold", "· Ready for development", "· Selected for
   Development", "· In Requirements"), project name neutral gray text. CHG-1042 card unchanged
   (badges, red-when-overrun rail logic untouched — currently in "window closes in" state, not
   overrun, so tone is success-green on-page, as designed).
2. **Dark, /for-you, reload-into-dark (not runtime toggle, per project memory on emotion/CSS-in-JS
   false-white-glare)**: same 2 buckets render correctly, no white-glare, no lozenges.
3. **Collapsed rail, light + dark**: only the active hub (Home) carries a blue ring + blue glyph;
   all 9 others render as neutral outlined tiles. Confirmed in both themes.
4. **Global nav timer chip** (navigated to /release-hub/overview to surface it, since it's
   suppressed on /for-you while the on-page banner shows): dot is neutral gray, duration text
   neutral — confirmed at rest in a non-overrun state matching the "one home for urgency" rule.

All screenshots taken via Chrome MCP against the live local dev server (localhost:8080, port
enforced by CLAUDE.md), not a static mock.
