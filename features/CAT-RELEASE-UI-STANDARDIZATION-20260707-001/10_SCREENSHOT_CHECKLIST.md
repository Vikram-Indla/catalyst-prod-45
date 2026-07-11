# DEMO HYGIENE — 2026-07-08 (Lane A slice A7)

## Fixed tonight (verified live, dark mode)
- Global nav timer chip: neutral border/text, tone dot only (was 11px red/magenta scream) — every page
- 10px ant text killed module-wide (timeline axis/legend, badges, calendar chips, replay labels) → 12px floor
- Risk lozenges: red=critical only, yellow=high, grey below (lime LOW gone)
- Releases list empty state: canonical header + value prop + CTA (contradiction removed)

## Demo route guidance
**Lead with (strongest):** /release-hub/changes (populated table, calm lozenges now), /release-hub/overview (KPIs + timeline readable now), /release-hub/changes/:id cockpit, /for-you.
**Seed before demo:** releases (list is empty → create 2-3 via the new CTA), execution slots (SOP steps with planned times so /execution isn't bare), a release with work items for /releases-management/:slug.
**Avoid or pass quickly:** /release-hub/release-kanban (bare dark panels when empty), /release-hub/freeze-windows (thin), /release-hub/execution if unseeded.
**Theme:** demo in dark (all tonight's verification was dark). Don't toggle themes live.
**Known cosmetics not fixed tonight (don't zoom on them):** "This space has 0 releases" footer duplication, toolbar geometry drift between sibling pages, radius variety, 11px ⌘K/meta labels (at floor, not below).

## Deferred decisions (charter B0)
- Pulse FAB: sanctioned AI-brand mark under current color law — neutering it is a charter call, not a night-before edit.
- Global Create vs page CTA single-bold convention.
- sr-only font-size:0 flags = Atlaskit internals → fix the probe, not the app.
