# Plan Lock — Phase B: /testhub-lab UI Validation Prototype

**Feature Work ID**: CAT-TESTHUB-REBUILD-20260704-001
**Approved**: Gate A blueprint approval by Vikram 2026-07-05 ("Approved at a blueprint level") with standing directive: **UI/UX must be best-in-industry — non-removable acceptance criterion.**
**Timebox**: 2 slices × ≤2h (build slice, verify+screenshot slice).

## Objective
Prove the new TestHub mental model + visual language behind an isolated route before any production replacement. 7 screens, labeled mock data, zero writes, zero production-route changes.

## Scope (7 prototype screens under /testhub-lab)
1. Command Center — readiness strip (plan gate verdicts), active cycles w/ real progress bodies, my pending runs, coverage KPI, defects by severity.
2. Repository — virtualized-pattern folder tree v2 (counts + coverage chips, system views), case table, TestRail-style inline title-add row, preview right rail.
3. Case Detail + Step Editor v2 — drawer-style detail w/ steps (reorder affordance, insert/duplicate/delete, bulk-paste affordance), links, versions.
4. Cycle Scope Builder — folder/set/filter add flows, duplicate guard, bulk assign, workload strip.
5. Execution Runner — polished evolution of existing runner: case rail, step verdicts (1/2/3/4 keys), evidence, fail→defect prompt (mock), progress, final summary.
6. Traceability — matrix (OK/NOK/NOT RUN/UNCOVERED chips, scope selector: latest|release|plan|cycle) + coverage graph tab (@xyflow, token-styled, key-titled nodes).
7. Report Center + Risk & Readiness — report nav pattern + readiness dashboard (gates/signoffs/waivers) using ReportChart wrapper.

## Non-scope (banned this phase)
Production /testhub/* route or component changes · any Supabase write · any migration · nav/sidebar changes · new packages · CreateStoryModal/JiraTable/canonical component edits · Incident/Project/Release Hub changes · SidebarBase.tsx (concurrent session owns it).

## Files to create (ONLY these paths)
```
src/pages/testhub-lab/
  LabShell.tsx            (layout, lab nav, PROTOTYPE banner, screen switcher)
  labMockData.ts          (single typed mock dataset, clearly labeled)
  labTokens.ts            (shared style constants — token strings only)
  screens/CommandCenter.tsx
  screens/Repository.tsx
  screens/CaseDetail.tsx
  screens/ScopeBuilder.tsx
  screens/Runner.tsx
  screens/Traceability.tsx
  screens/ReportCenter.tsx
  index.tsx               (route component, lazy-loaded)
```
## Files to modify (exactly one)
- `src/routes/FullAppRoutes.tsx` — add ONE lazy route `/testhub-lab/*` (additive; no other lines touched).

## Canonical component rules (best-in-industry bar)
- Import via `@/components/ads` barrel: Lozenge, Button, Avatar, Spinner, SectionMessage, EmptyState, Heading, Breadcrumbs, ProgressBar, Checkbox, Textfield, Select, DropdownMenu, Modal, Tooltip.
- Charts: `ReportChart` wrappers + `adsChartTheme` ONLY. Graph: `@xyflow/react` styled with var(--ds-*).
- Tables: JiraTable is the production target; in the prototype, tables must reproduce JiraTable's visual grammar (row height, Mono keys, Lozenge statuses, hover states) — if direct JiraTable use is low-friction, prefer it; where mock-wiring friction is high, an ADS-token table styled to measured JiraTable specs is acceptable **in the lab only** and each such instance is listed in the handover as "to be replaced by JiraTable in Phase D/E".
- Colors: var(--ds-*) tokens only, NO hex/rgb/Tailwind colors, no fallbacks. Fonts: inherit (Atlassian Sans); keys in Atlassian Mono via existing convention.
- Icons: @atlaskit icons / existing shared icons; NO lucide, NO emoji.
- Every screen: honest loading/empty/error states, hover/focus states, keyboard affordances where core to the pattern (tree, runner).
- Persistent "PROTOTYPE — mock data" Lozenge in LabShell header; every screen labels real-vs-mock.

## Data rules
100% static mock from labMockData.ts (personas: Senaei BAU-flavored realistic data — realistic keys TC-0142 style, no lorem ipsum, no fabricated claims presented as live). Zero supabase imports anywhere under src/pages/testhub-lab/.

## UI/UX acceptance criteria (NON-REMOVABLE, per Vikram directive)
1. Side-by-side credibility vs Xray/TestRail/Zephyr screenshots: repository tree + inline add ≥ TestRail authoring speed feel; runner ≥ Xray/Zephyr execution ergonomics; matrix ≥ qTest coverage clarity. Judged in design critique.
2. Light AND dark screenshots for all 7 screens, persisted to features/CAT-TESTHUB-REBUILD-20260704-001/screenshots/ — zero white-glare, zero token violations.
3. `npm run lint:colors` gate zero increase; grep audit clean on new files; tsc zero errors.
4. Design-critique pass (10-heuristic) on all 7 screens with no P0s outstanding.
5. Visual hierarchy: every screen answers its persona question in <5s (readiness? my work? coverage?) — stated per-screen in critique.
6. Zero console errors on all lab routes.

## Validation commands
`npx tsc --noEmit` · color grep on src/pages/testhub-lab · dev-server route visit + console check · screenshot capture light+dark.

## Stop conditions
Any need to touch canonical components → stop. Any need for supabase reads → stop (mock only this phase). Slice overrun >2h → split. Screenshot gate fails → fix before handover, no "ship anyway".

## Drift/rebaseline
Deviations recorded in 08_DRIFT_LOG.md; screen-level design changes vs blueprint §12 noted per screen in 05_UI_UX_REVIEW.md.
