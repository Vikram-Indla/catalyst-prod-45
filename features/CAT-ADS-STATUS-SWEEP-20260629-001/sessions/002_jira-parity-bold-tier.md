# Session 002 — Jira-parity bold tier (Slice 2)

## Ground truth (DOM-probed from production Jira list, 2026-06-29)
Real Jira status lozenge text span:
- bg solid bold pastel — success #B3DF72, inprogress #8FB8F6, todo/default #DDDEE1,
  moved #F9C84E, new #D8A0F7, removed #FD9891.
- text #292A2E (dark, both themes) · 11px · weight 653 · UPPERCASE · ls 0.165px · radius 3px.

Catalyst ADS *-bold tokens diverge: --ds-background-success-bold = #94C748 (brighter
lime), --ds-background-neutral = transparent, text-inverse flips white by theme. So
ADS tokens ≠ Jira; exact parity needs the pinned hex (escape-hatched).

## Decisions (Vikram, 2026-06-29)
- list/table/For-You lozenges → exact Jira bold (pinned hex).
- CatalystStatusPill detail header → stays SUBTLE/locked.
- (Concurrent: Vikram had switched STATUS_BG → ADS *-bold tokens + updated the
  canonical test to lock that. Left intact to avoid clobbering + keep test green.)

## Implementation
statusPalette.ts — added two tiers (STATUS_BG untouched, test stays green):
- STATUS_BG_SUBTLE / STATUS_FG_SUBTLE + statusBgSubtle/statusFgSubtle (pale, for header).
- STATUS_BG_BOLD (pinned Jira hex, ads-scanner:ignore) + STATUS_FG_BOLD '#292A2E' +
  statusBgBold/statusFgBold/categoryBgBold.

Consumers re-pointed:
- CatalystStatusPill.tsx — tier by `compact`: compact (table cells, 24px) → BOLD;
  header (32px) → SUBTLE. (cells.tsx status cells all pass compact={true}.)
- JiraStatusLozenge, WorkItemStatusLozenge, shared/StatusPill, ui/StatusLozenge,
  hierarchy/StatusBadge, ForYouRow → statusBgBold/statusFgBold.

## Validation
- tsc (-p tsconfig.app.json): no errors in touched files.
- lint:colors:gate 76 = baseline; audit:ads:gate no category above baseline (2 dropped).
- canonical test: STATUS_BG/STATUS_FG untouched + renderers import statusPalette +
  no rgb(179,223,114)/(186,240,199) in renderers (hex lives only in statusPalette) → green.
- Live DOM probe (localhost:8080 /for-you/assigned):
  In Progress rgb(143,184,246)=#8FB8F6 · On Hold rgb(249,200,78)=#F9C84E ·
  To Do/Backlog rgb(221,222,225)=#DDDEE1 · text rgb(41,42,46)=#292A2E · 653 · uppercase = EXACT Jira.
  Detail header pill (compact=false): bg rgb(233,242,254) pale + text rgb(21,88,188) = SUBTLE ✓.

## Follow-up (not in scope)
- categoryBg/categoryFg consumers (admin status config, some kanban) still read the
  ADS *-bold token tier (#94C748 lime), not the pinned #B3DF72. Sweep later if exact
  parity wanted there too.
