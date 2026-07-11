# PLAN LOCK — Slice 1 (changes 1–4)

**Status:** DRAFT — awaiting Vikram approval. No code until approved.
**Timebox:** 2 hours.
**Branch:** main (per standing branch policy).

## Objective
Subtraction-only noise cut on Home/For You: kill duplicate status pills, category grouping,
neutral nav chip at rest, monochrome collapsed rail. Zero layout/data/behavior change.

## Non-scope
Changes 5–6 (wordmark/type/badges/fake-link; Themify dedup/weather/timestamps) → slice 2.
No StatusLozenge shared-component deletion. No theme-tokens.css edits. No other surfaces.

## Files to modify (exact, exhaustive)
1. `src/components/for-you/atlaskit/ForYouRow.tsx` — jira-assigned variant: stop rendering
   `<StatusLozenge>` trailing slot; when item's literal status ≠ its category bucket label
   (e.g. "In Requirements" inside In progress), append literal status as plain text meta
   (` · In Requirements`, text.subtlest) so information is never lost.
2. `src/components/for-you/atlaskit/AssignedPanel.tsx` — group by status CATEGORY
   (todo → "To do", in-progress → "In progress", moved/on-hold → "On hold", done stays behind
   "Show completed"); headers sentence case; counts preserved.
3. `src/components/releasehub/foryou/ReleaseChangeAnnouncementBanner.tsx` — `ReleaseTimerNavChip`
   only: resting render = gray dot (no pulse animation), `--ds-text-subtle` text, no red duration;
   label "CHG-1042 · live". On-page card/banner variants UNTOUCHED (urgency's one home).
4. `src/components/shared/PresenceRing.tsx` — offline branch: amber → `var(--ds-border-bold)` gray.
   available/away branches untouched.
5. `src/components/layout/HomeSidebar.tsx` — `HUB_BORDER_COLORS`: all hubs →
   `var(--ds-border)` neutral ring + `var(--ds-icon-subtle)` glyph fill; ACTIVE hub →
   `var(--ds-border-selected)` ring + `var(--ds-icon-brand)` (or `--ds-text-selected`) fill.
   Delete `#4A7FE0` / `#38BDF8` + their ads-scanner:ignore lines.
6. `design-governance/color-baseline.json` (and audit baseline if scanner count drops) — ratchet DOWN
   via `node scripts/ads-color-gate.cjs --update` after hex removal.

## Files forbidden
`src/components/shared/StatusLozenge/**` (render-site change only, component untouched),
`src/styles/theme-tokens.css`, `src/components/releasehub/detail/ChangeCockpitSections.tsx`
(foreign in-flight edit — never stage), everything not listed above.

## UI/UX rules
ADS tokens only, no hex, no fallback hex. No new components. Subtle-tier default; bold reserved
for critical. One red per viewport: bell pip (nav) + CHG card (content) keep theirs; nothing else red.

## Data / backend rules
None. Zero DB/API/hook changes. Grouping change is pure client-side presentation over existing fields
(`statusCategory` already drives ordering — verify field present; if rows lack category, map via
existing statusCategoryOrder util; NO invented defaults — unknown category → own "Other" bucket, never a lie).

## Wiring rules
No route, prop-contract, or export changes visible outside the 5 source files.

## Execution order (single session, sequential — small surface, parallel agents add no value here;
discovery already ran as 3 parallel probes per contract)
Step 1 → files 1+2 (one logical change) → tsc → live check.
Step 2 → file 3 → live check. Step 3 → file 4. Step 4 → file 5 + baselines → gates.

## Validation commands (raw output logged to 06)
- `npx tsc --noEmit` (baseline 183 errors pinned — no new)
- `npm run lint:colors:gate`
- `npm run audit:ads:gate`
- `npx vitest run src/pages/__tests__/ForYouPage.defaultTab.test.ts src/components/for-you` (or nearest existing suites)

## Screenshot checklist (localhost:8080, live data, reload-into-theme for dark)
1. Home/For You full page — light. 2. Same — dark. 3. Top nav right cluster close-up (chip at rest,
gray offline ring) light+dark. 4. Collapsed rail light+dark (active hub tinted, rest neutral).
5. Grouped list showing 3 buckets, zero row lozenges, literal-status meta visible on an
"In Requirements" row.

## Stop conditions
- Any consumer of PresenceRing/ForYouRow outside probed list surfaces changed appearance → RED FLAG, stop.
- Grouping produces empty/wrong buckets on live 69-item dataset → stop, show evidence, decide.
- Gate counts rise anywhere → stop.
- Timebox breach → stop, log, split.

## Drift / rebaseline
Any deviation from file list or rules → 08_DRIFT_LOG entry + re-approval before continuing.

## Approval
- [ ] Vikram approves Plan Lock (reply "lock approved" or edits)
