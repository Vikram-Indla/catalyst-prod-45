# Session 010 — REQ-019 initiative→project-card seams (2026-07-09)

## Audit result
- **No UI writes to `strata_initiatives` existed anywhere** (only 2 SELECTs in the domain layer) — that half of the AC was already true; now pinned by test.
- Execution page already renders Project Cards only (Initiative intentionally unresolved in dependency labels — code comment at StrataExecutionPage:614).
- Real seams found: (1) `InitiativeDetailModal.tsx` (22K) had ZERO consumers — dead UI; (2) VMO "Add portfolio member" modal DEFAULTED to Initiative with Initiative listed first.

## Delivered
1. Deleted `InitiativeDetailModal.tsx` + its 3 orphaned drill-down hooks (useInitiativeProjects/Elements/Kpis). `useInitiatives` stays — read-only member-name resolution for legacy portfolio rows.
2. `vmoAuthoring.tsx` AddMemberModal: defaults to `project_card` (initial state + open-reset), options reordered Project card first, Initiative relabeled "Initiative (legacy)".
3. New guard `initiative.seam.guard.test.ts` (4 tests): no write path to strata_initiatives in the module; Execution page has no Initiative UI; member authoring defaults/orders project_card; the modal never returns.
4. Regenerated usage-map + ads-violations.

## Validation
tsc clean · 22/22 tests (strata guards now 20 + sidebar 3 + registry-drift 2 — suite composition: terminology 2, linkage 5, cyclecontext 6, initiative-seam 4, sidebar 3, drift 2) · color gate 0=0 · audit gate at baseline (22464/1409).

## REQ-019 status: DONE (AC met: Execution UI Project Cards only; no UI writes to strata_initiatives; memberships favor project_card).
