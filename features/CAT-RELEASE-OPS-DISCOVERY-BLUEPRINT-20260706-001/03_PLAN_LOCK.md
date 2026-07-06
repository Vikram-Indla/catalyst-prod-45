# CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001 — Plan Lock

> Status: DRAFT — awaiting Vikram review. No code until approved.
> Blueprint: docs/audits/release-ops-discovery-blueprint.md

## Feature Work ID
CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001

## Feature name
release-ops-discovery-blueprint

## Timebox
Discovery: complete (this session, plan-only). Implementation: 12 phases (P0–P11), each ≤ 2h slice.

## Objective
Deliver a discovery + remediation blueprint for Catalyst Release Operations covering all 12 locked business decisions, then execute it phase-by-phase against ADS/CRE.

## Business outcome
Release Ops surfaces enforce the locked operating model (no drawers, full-page detail, live execution timer, commit discipline, incident/override/replay wiring) with zero hand-rolled UI and zero bare colors.

## Exact slice
THIS Plan Lock covers **discovery only** (blueprint doc). Implementation phases P0–P11 each get their own approved slice; none start until this Plan Lock is promoted from DRAFT.

## Non-scope
- No code this session. No migrations applied. No prod writes (staging cyij only when implementation starts).
- No retroactive drawer ban outside release-hub scope.

## Canonical components (selected)
- JiraTable `src/components/shared/JiraTable/JiraTable.tsx`
- StatusLozenge `src/components/shared/StatusLozenge/StatusLozenge.tsx`
- ProjectPageHeader `src/components/layout/ProjectPageHeader.tsx`
- ads/Modal `src/components/ads/Modal.tsx`; ads/SectionMessage; ads/Flag
- CatalystAvatar `src/components/shared/CatalystAvatar.tsx`
- CatalystDueDateField `src/components/shared/CatalystDueDateField/CatalystDueDateField.tsx`
- DependencyWheelMap `src/components/dependencies/DependencyWheelMap.tsx` (sign-off visual)
- @atlaskit/pragmatic-drag-and-drop (SOP reorder); @atlaskit/tabs; @atlaskit/progress-bar; @atlaskit/user-picker (render CatalystAvatar per option)

## Canonical screens/routes
Existing: /release-hub/changes/:changeId, /release-hub/releases-management/:slug, /release-hub/sign-off-queue, /release-hub/calendar, /release-hub/production-events, /for-you.
New: /release-hub/production-events/:eventKey (full-page Replay), For-You SOP surface.

## Files to modify (per phase — NOT this session)
See blueprint §15. Highlights: ChgDrawer/ReleaseDrawer/ReleasePeekPanel (remove), SopExecutionTab, useReleaseHub.ts, useForYouData.ts, ReleaseCalendarPage, ProductionEventsPage, lifecycle.ts.

## Files forbidden
- CatalystRules.ts / RULE_TABLE.md — rh_* domain is not CRE-type-governed; do not add release types.
- Global drawer components outside release-hub — ban is release-scoped only.

## UI/UX rules
- No side drawers in release-hub. Full-page detail + focused ads/Modal preview.
- JiraTable for all tabular data. StatusLozenge for all status/health/risk. No custom pills/steppers.
- DateTimePicker (not date-only) for execution windows. ProjectPageHeader trail (not raw breadcrumbs — Grid E5).
- ADS tokens only; map --cp-* leakage to --ds-*. Zero bare hex/rgb.

## Data/backend rules
- Staging cyij first. Slug contract on any new URL-navigated table. 1 migration file : 1 version.
- rh_change_release_links = forward source of truth; legacy rh_changes.release_id read-fallback only.
- Zero-assumption rendering: unknown → dash/empty, never a wrong default.

## Integration/wiring rules
- For You reads assigned rh_sop_steps (owner_id). Do NOT mirror SOP steps to ph_issues.
- Timer: primary Change Detail, secondary For You, tertiary Release Detail.
- Commit mandatory only for step_type ∈ {frontend, backend, integration, database, configuration}.
- Emergency override: RM/CM request → PO/Admin approve → audit + badge.
- Incidents link release + change + SOP step where context exists.

## Parallel discovery agents
Ran 5 (routes/pages, data model+CRE, ForYou+canonical, integration architect, UI/UX critic). Outputs captured in 12_AGENT_OUTPUTS.md and blueprint. QA/Screenshot Validator deferred to implementation (needs running app).

## Karpathy loop hypotheses
- [LOOP-001] rh_change_release_links already satisfies decision #2 → CONFIRMED (schema + dual-read union present).
- [LOOP-002] Existing src/lib/replay reusable for Production Event Replay → DISCARDED (replay lib reads ph_issues history, not rh_production_events snapshots; new adapter required).
- [LOOP-003] Drawers are safe per repo convention → DISCARDED for release-hub (locked decision #11 wins in scope).

## Screenshot checklist
See blueprint §14 (8 proof routes, localhost:8080).

## Validation commands
```bash
npx tsc --noEmit
npm run lint:colors:gate
npm run audit:ads:gate
```

## Regression risks
- Removing drawers may break calendar chip / list row-click handlers → route to full page, verify no dead clicks.
- Commit-required validation could block existing in-flight steps → gate on new transitions only.
- Change→event auto-gen could double-insert with release rollup → dedupe by event_key.

## Stop conditions
- Any banned color / hand-rolled UI introduced → stop.
- TypeScript error → stop.
- Any CRE conflict (drawer scope, :changeId slug) unresolved by Vikram → stop.

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert.

## Commit rules
Stage explicit files only. Commit message references CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001.

## Locked decisions (Vikram, 2026-07-06)
1. No drawers anywhere in this functionality — remove all release-hub drawers, replace with full pages + focused ads/Modal.
2. Breadcrumbs = mirror Project module exactly: ProjectPageHeader hubType="release" wrapping ads/Breadcrumbs (never raw @atlaskit/breadcrumbs). L1 no trail; L2 single-level trail back to Releases/Changes list; global hub → no projectKey.
3. Use Atlaskit components (user-picker rendering CatalystAvatar, datetime-picker, tabs, modal-dialog, section-message, lozenge, pragmatic-dnd).
4. Approve :changeSlug migration (rh_changes slug + generate_slug + useChangeBySlug + UuidToSlugRedirect) per recommendation.

## Plan Lock status
READY — discovery complete, blueprint delivered, all open decisions closed by Vikram. Awaiting explicit "start P0" before any code (session was PLAN MODE). P0 = drawer removal + full-page detail migration.
