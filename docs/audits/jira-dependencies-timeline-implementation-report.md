# Jira Dependencies + Timeline — Implementation Report

Date: 2026-06-24
Decisions (Vikram): store = `ph_issue_dependencies` · saved-views = view-mode selector · scope = all hubs · cadence = build-all-then-review.

## Summary

The dependencies **canvas** (`/project-hub/:key/dependencies`) was already built and data-backed (React Flow, cards, `blocks` connectors, zoom bar, add modal, hover-delete). This change adds the missing **timeline dependency mode** to the canonical shared `TimelineView`, single-sourced from `ph_issue_dependencies`, and wires the canvas `?focus=` flow. All new behavior is gated behind `depMode` (default OFF) → zero change to any hub until activated.

## Files changed / added

### Added — `src/components/shared/Timeline/dependencies/`
| File | Purpose |
|---|---|
| `normalize.ts` | Canonical edge model ("blocker blocks dependent"), index builder, cycle + duplicate + reverse-duplicate + self validation. Pure. |
| `aggregate.ts` | Subtree roll-up (external-only deps for parent rows) + `relatedKeys` for the timeline filter. Pure. |
| `useTimelineDependencies.ts` | React Query read of `ph_issue_dependencies` by project keys; `addDependency` (validate → insert canonical `blocks`) + `removeDependency` (soft-delete). |
| `DependencyUI.tsx` | Column headers + scroll-synced columns body (Blocked by / Blocks), aggregate popover, row dependency card with inline add picker + remove + footer flows. |
| `__tests__/normalize.test.ts` | 18 unit tests. |
| `__tests__/aggregate.test.ts` | 6 unit tests. |

### Edited
| File | Change |
|---|---|
| `TimelineView.tsx` | `depMode`/`depFilterKey`/`depCard`/`depPopover` state; dep data derivations; dep filter in `rows`; `depCounts` roll-up; scroll-sync of dep panel; wired dead `Show dependencies`/`Show hierarchy`; view-mode (saved-views) selector; dep-columns panel; popover + card portals. New prop `buildDependenciesRoute`. |
| `Timeline/types.ts` | Added `buildDependenciesRoute?` to `TimelineViewProps`. |
| `ProjectHubTimelinePage.tsx` | Passes `buildDependenciesRoute` → `/project-hub/:key/dependencies?focus=<key>`. |
| `DependenciesDiagram.tsx` | `focusKey` prop → center + highlight node on `?focus=`. |
| `DependenciesPage.tsx` | Reads `?focus=` → passes `focusKey` to the diagram. |

## DB / data

- Single source of truth: **`public.ph_issue_dependencies`** (migration `20260624120000`, live on staging `cyij` = the dev-app DB). No new schema. No seeded data. Existing live row: `BAU-4466 blocks BAU-4419`.
- Direction semantics centralized in `normalize.ts`: source blocks target; for item X, incoming edges = "Is blocked by", outgoing = "Blocks".
- "Dependency added" column = `ph_issue_dependencies.created_at` (NOT lead time).
- Remove = soft-delete (`deleted_at`), matching the canvas.

## Validation behavior

`validateNewDependency` (pre-insert) + DB constraints both enforce: no self-dependency, no duplicate (live partial unique index), no reverse-duplicate, no cycle (transitive DFS). Errors surface inline in the row card.

## Scenario coverage (§7)

| # | Scenario | Status |
|---|---|---|
| 1–6 | Canvas page / filters / add / cards+arrows / `blocks` label / zoom | Pre-built (verify live) |
| 7–8 | Timeline Dependencies view + selector shows it selected | ✅ wired |
| 9–10 | Blocked by / Blocks columns + roll-up counts from real data | ✅ |
| 11–12 | Aggregate popovers ("blocked by" / "blocks") | ✅ |
| 13–15 | Row card Is-blocked-by / Blocks + "Dependency added" date | ✅ |
| 16 | Remove dependency refreshes columns | ✅ (soft-delete + invalidate) |
| 17–19 | Inline add: type select + picker, save disabled until valid, persists | ✅ |
| 20–21 | Duplicate + self blocked with message | ✅ (validate + DB) |
| 22 | "Show dependencies for <key>" → canvas focus | ✅ (`?focus=` + center/highlight) |
| 23–24 | Filter by dependencies of <key> / clear | ✅ |
| 25 | Kebab "Show dependencies" not dead | ✅ |
| 26 | "Show hierarchy" still works | ✅ (toggles dep mode off) |
| 27 | Light mode no regression | depMode OFF by default → no change |
| 28 | No seeded data | ✅ |
| 29 | Real tables + project context | ✅ |
| 30 | Evidence screenshots | ⏳ pending live verification (review step) |

## Quality gates

- `tsc --noEmit`: **0 errors**.
- Unit tests: **24/24** (`vitest run src/components/shared/Timeline/dependencies/__tests__/`).
- ADS audit: dependency module **PASSED**; `TimelineView.tsx` 14 violations = unchanged from HEAD baseline (**0 net-new**); `DependenciesDiagram.tsx` PASSED.
- ESLint: `(supabase as any)` + react-select `as any` + direct `@atlaskit/*` import warnings match the established sibling-file convention (AddDependencyModal/DependenciesPage carry identical); not the blocking gate.

## Limitations (honest)

1. **Timeline dependency columns = Blocked by + Blocks only.** Spec §4.3 also lists Priority / Start / Due / Team. Start+Due already render as the Gantt bars on the right; Priority/Team were NOT added as left columns (width + scope). Deferred, not silently dropped.
2. **Saved views = functional mode selector**, not a persistence/CRUD framework. Dependencies/Basic/Capacity/Top-level change the timeline; "Manage saved views" / "Create a new view" are shown disabled ("coming soon") — none persist yet.
3. **`Show dependencies for <key>` on non-project hubs** (product/release/incident) falls back to opening the item detail, because only project-hub has the dependency canvas + `?focus=`. No dead link.
4. **Live verification + evidence screenshots** under `docs/evidence/jira-dependencies-timeline/implementation/` are pending — this is the review step (CLAUDE.md: preview is user-initiated).
5. **Jira MCP** source site (`ministryofinvesment`) not probed; screenshots were the authoritative evidence (spec §2.8).
