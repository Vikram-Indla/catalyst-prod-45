# EXECUTION MANIFEST — Design-Critical Phase (2026-07-08, demo T-minus hours)

> Phase declared: DESIGN-CRITICAL. Catalyst replaces Jira; negative UI/UX feedback = launch-blocking defect class.
> Zero-drift mechanics baked into every slice: exact file list locked before edit · gates + tsc after every slice ·
> live screenshot verification before commit · one commit per slice · no slice touches files outside its list.

---

## LANE A — TONIGHT (demo armor). Rule: small blast radius, high visibility, verifiable in isolation.

**BANNED TONIGHT**: theme-tokens.css changes, archetype restructures, dark/light re-theming, new components, route changes, anything touching >6 files.

| # | Slice | Files | Verify | Risk |
|---|---|---|---|---|
| A1 | Countdown chip: 11px red glowing monospace pill → 12px neutral subtle chip (danger tokens only <4h remaining) | locate top-bar chip component (candidates: ExecutionTimer.tsx, shell nav) — lock list after locate | screenshot any 2 routes before/after | LOW |
| A2 | 12px visible floor: ReleaseTimeline axis+legend (10px×17), production-events avatar badge (10px), FacetFilterBar 11px chips | ReleaseTimeline.tsx, FacetFilterBar.tsx, avatar badge file | probe fontSizes histogram re-run: zero visible <12 | LOW |
| A3 | sr-only fix: font-size:0 → clip pattern (retires 3 mechanical HF1s, invisible change) | locate the a11y wrapper | probe: no 0px text-bearing keys | NIL |
| A4 | Status unification: glow pills / uppercase screamers / bold-fill UNKNOWN → ReleaseOpsLozenges subtle sentence-case on changes, sign-off-queue, production-events, overview | AllChangesPage.tsx, SignOffQueuePage.tsx, ProductionEventsPage.tsx, CommandCenterPage.tsx + ReleaseOpsLozenges.tsx | screenshot each route | MED — one route at a time |
| A5 | Empty-state repair on demo-visible routes: releases-management dual contradictory message → single canonical EmptyState w/ CTA; execution calendar bare text → EmptyState | ReleasesPage empty branch, ExecutionCalendarPage.tsx, EmptyState.tsx | screenshot | LOW |
| A6 | Pulse FAB → neutral icon-subtle at rest (keeps function, kills permanent hue-330) | FAB component (locate) | screenshot | LOW |
| A7 | Demo hygiene doc: routes to lead with, routes to avoid, seed-data steps so no empty rubbish on screen | 10_SCREENSHOT_CHECKLIST.md | manual | NIL |

Order: A1 → A3 → A2 → A6 → A5 → A4 (safest-first; A4 last because widest).
Abort rule: any slice whose screenshot looks WORSE than before → revert that slice, move on. No debugging spirals tonight.

## LANE B — POST-DEMO transformation (starts after demo; sequence fixed)

| Phase | What | Gate to exit |
|---|---|---|
| B0 | CDL charter: ADS sovereignty + sanctioned extensions list + the 5 open decisions forced binary (global-CTA convention, 32px KPI, header tabs, FAB existence, density mode) | Vikram signs charter |
| B1 | **Probe-off vs real Jira**: same metrics JS on live Jira DOM (Atlassian/Chrome MCP) vs Catalyst — gap quantified per surface, both themes | numbers doc committed |
| B2 | **Token surgery**: replace hand-authored theme-tokens.css with genuine @atlaskit/tokens output; map counterfeit values → real ADS ramp; full-app screenshot sweep before/after both themes | ui-vitals score no route drops; visual sweep approved |
| B3 | ADS Figma kit → Catalyst team library (consume, never redraw) + Code Connect map for canonical components | library live; 10 components mapped |
| B4 | 8 golden archetype frames (List/Detail/Board/Calendar/Modal/Form/Dashboard/Empty), dark+light, approved AS PIXELS | Vikram approves 8 frames |
| B5 | Archetype shells in code; route migrations worst-traffic-first; modals converge to 1 golden modal | per-route: rubric ≥B, zero HF, both themes |
| B6 | Prevention stack: ESLint hard bans (inline fontSize/raw px/color maps) · ui-vitals CI score gate · golden screenshot diff · PR template image pair | CI red on violation proven with a test PR |
| B7 | Beat-Jira layer: density mode, ⌘K palette, AI-in-flow — charter-sanctioned extensions only | per-feature golden frame first |

## Zero-drift contract (applies to every slice, both lanes)
1. File list locked in this manifest (or appended by name) BEFORE first edit.
2. tsc + lint:colors:gate + audit:ads:gate after every slice.
3. Screenshot before/after saved to evidence/ — no commit without the pair.
4. One commit per slice, explicit staging, message names slice ID.
5. Any pre-existing failure discovered → RED FLAG report, not silent patching.
6. Approvals on pixels only; text approvals abolished.
