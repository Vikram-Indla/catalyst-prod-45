# 00 — Anchor Design Authority (Phase 0 + Phase 1)

> Source: claude.ai design project `e8a6bad6-1868-4b84-96bf-d6d49474b58a`, read via DesignSync
> by the PARENT session (DesignSync is NOT available to subagents — parent-only). Hex in anchor
> helmets = stand-ins for `--ds-*` tokens; map intent to tokens, never implement literal hex.

## §18 — Component APIs / new-vs-reuse (verbatim intent)

| Concern | Canonical decision (§18) |
|---|---|
| Page shell / breadcrumbs / title | **StrataPageShell → ProjectPageHeader(hubType="strata") + HubSurface. No change.** (This sanctions the existing shell — resolves the Grid E "deviation": it is by design.) |
| Context spine (cycle/period/scope/state) | **Extends StrataContextToolbar + StrataChipMenu**; state chip = Lozenge. **One new slot (freshness)**, no new primitives. |
| Judgment band | Composition: StrataScoreRing + StrataBandLozenge + composed copy. Token-pure; **just a layout wrapper**, no new component API. |
| Chain strip | **New reusable — StrataChainStrip** — composed of existing Lozenge/CatalystTag + links. Canonical proof done: no relationship-strip exists in shared/, ui/, atlaskit. |
| Attention inbox / lists | JiraTable (compact) + cell factories + StatusLozenge. Mandatory-first honored. |
| Detail shells (Project Card, element, benefit, KPI) | CatalystViewBase full-page + CatalystSidebarDetails; **drawers follow CatalystViewBase panel mode**. (NB: CatalystViewBase has no STRATA table-union today — see D-2.) |
| Value waterfall | StrataValueBar (hero scale variant) — proven non-duplicate (sessions/011). |
| Lifecycle stepper (data runs, reviews) | **New reusable — StrataLifecycleStepper** — no @atlaskit process stepper exists. (Verify Catalyst-local `CatalystProgressTracker` before building — §18 didn't.) NOT consumed by any Phase-1 page → defer to first consumer (Phase 4). |
| Forms / Charts / Empty-loading-error-restricted | @atlaskit controls; recharts + band-toned dots; EmptyState + layout-matched skeletons + per-panel SectionMessage + transient-success flags. |

## §13/§14/§17 (contract essentials)
- **§14 a11y/interaction:** every chart has a text summary + data-table alternative behind a reveal; trend dots are focusable links with accessible names ("Q1 2026, 73.5, Needs attention — view evidence"); all lozenges carry WORDS, bands add ▲▼ deltas (color never alone); prefers-reduced-motion → opacity only, no spinner >1s without progress text; 32px min interactive (operational) / 44px (editorial); errors name the next action + preserve user input.
- **§17 roles:** UI gating mirrors the role engine (`useStrataRoles` + RLS/RPC guards); hiding a button is presentation, never the security model; **every write surfaces server rejection text**.
- **§13 layout:** context spine mandatory on EVERY strata route.

## Anchor 11 — My Work (`/strata/my-work`, NEW)
- **Verb groups (MECE):** Validate · Submit · Resolve · Act (+ Approve for `strata_admin`). Role-sensitive home on server primary role.
- **Row grid:** [verb-type lozenge] · [title] · [consequence "so what"] · [due] · [action button]. Verb-type lozenges seen: ATTESTATION (warning), BENEFIT (warning), ACTUAL DUE (information), ACTION (danger). Due "Today" = danger, tabular-nums.
- **Canonical:** JiraTable compact + group-header rows; Mine/Team toggle (existing CC filter pattern); rank by verb → severity → due.
- **Consequence column** states downstream effect, not task description ("CEO scorecard + Q2 snapshot wait on this").
- **Completion** returns here with row resolved + success flag naming chain effect.
- **States:** loading = group-header skeletons; empty group = collapsed "nothing waiting"; zero-items = calm SCHEDULED strip (next duty), never void; no-results (team) = summary + clear; multi-role = union, role-attributed rows; <1024 = consequence folds under title, groups → accordion.
- **CRE:** no create/link of governed types → NO chokepoint. (Confirmed against anchor.)

## Sidebar IA map (from anchor 11 navSections — authoritative)
```
(untitled) : Command Center · My Work [badge=count]
DIRECTION  : Strategy Room
MEASUREMENT: Scorecards · KPIs & OKRs
DELIVERY   : Project Cards
VALUE      : Portfolio & Benefits
GOVERNANCE : Reviews & Decisions · Data & Lineage
footer     : Configuration
```
Data-only change to `strataSidebarConfig` (EnterpriseSidebar.tsx). Visual-frozen honored (labels/grouping/additive item only, no restyle).

## Anchors 01 / 12 / 13 — deltas (from UI/UX critique vs §3–§6; confirm panel order at slice start)
- **01 Command Center:** P0 — evidence drills lose origin (no `?from=`); no drawer-first drill + no Esc focus-return; no StrataChainStrip in shell; live/locked is a toolbar lozenge, not a chrome band + no StrataSnapshotBand/"as of". P1 — overdue as red date not "n days overdue"; trend dots color-only at rest; no restricted/403; "Mine" no-results lacks one-click Clear. P2 — attention inbox is Row 3 (below fold). Credits: layout-matched skeleton, role-aware empties, per-panel errors, fmtSarCompact, tabular-nums, ADS-token-pure.
- **12 Scorecards Index:** P1 — Spinner not layout-matched skeleton; page-top error not per-panel; empties not role-aware; no restricted; row drill full-page. P2 — no docTitle. Ranked-variance panel = client-derivable, no RPC.
- **13 Scorecard Detail:** P0 — Evidence button + line ⓘ omit `?from=`. P1 — Recalculate (write) not role-gated for read-only viewers; Spinner not skeleton; no drawer-first drill; no restricted. P2 — no explicit stale/partial label.
