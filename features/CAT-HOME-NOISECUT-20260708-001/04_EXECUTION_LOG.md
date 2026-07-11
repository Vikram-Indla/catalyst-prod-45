# Execution log — slice 1

1. `AssignedPanel.tsx` — grouped by `status_category` (3 real buckets: To do / In progress /
   Done-behind-toggle) instead of literal status value.
2. `ForYouRow.tsx` — jira-assigned trailing-slot lozenge removed; new `bucketLabel` prop; literal
   status rendered as plain subtlest meta text only when it differs from the bucket label.
3. `ReleaseChangeAnnouncementBanner.tsx` — `LiveCountdown` `dot`/`pill` variants (used exclusively by
   `ReleaseTimerNavChip`) now render a neutral `T.subtlest` dot instead of `timer.tone`. `full`/`card`/
   `row` variants (on-page CHG card, queue pills) untouched — urgency's one home.
4. `PresenceRing.tsx` — **skipped**, no change. No `offline` state exists in the live presence model
   (`src/lib/presence.ts`: on_set/remote/away/on_leave); the component's own doc comment describing
   an offline+amber state is stale. See Drift 2.
5. `HomeSidebar.tsx` — `HUB_BORDER_COLORS` map deleted (including both scanner-ignored hexes). Ring
   color now derives from the same active-route signal SidebarBase already passes to the glyph
   (`style.color === 'var(--ds-icon-brand)'`) — neutral `var(--ds-border)` at rest, `var(--ds-border-selected)`
   on the active hub only.
6. Mid-slice bug found on live data (not in original file list, fixed in file 1 above): real
   `ph_issues.status_category` uses `in_progress` (underscore); `statusCategoryOrder` only matched
   `'in progress'` (space) / `'indeterminate'`, silently bucketing every genuinely in-progress item
   (115 rows across 6 literal statuses) into "To do". Fixed the string match; kept old forms as
   defensive aliases. Verified via staging (cyij) read-only SQL — see 06_VALIDATION_EVIDENCE.md.
7. Baselines ratcheted DOWN: `color-baseline.json` unchanged (0→0), `audit-baseline.json` tokens
   22481→22480 (net reduction from deleting the two hexes, after fixing an unrelated +1 from a
   copy-pasted noisy token-fallback pattern in the new meta span — simplified to a bare `var()`).

Full rationale for drift/scope resolutions: see 08_DRIFT_LOG.md (3 entries).
