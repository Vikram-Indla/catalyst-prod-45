# PLAN LOCK — Premium Test Operations Cockpit Foundation

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Status:** DRAFT — exact slice awaiting Vikram approval  
**Design direction approved by:** Vikram (`go`, 2026-07-11)  
**Timebox:** 2 hours from implementation start  
**Slice:** 1 of the premium Test Hub remediation

---

## OBJECTIVE

Replace `/testhub/dashboard`'s generic editable-widget gallery with the first
premium Catalyst-native Test Operations Cockpit. The completed slice has a
clear Test Space context, one dominant active-executions surface, a compact
truthful repository/lifecycle summary, and a contextual attention rail derived
only from existing Test Hub queries. It must not display a fabricated readiness
score or alter any workflow, schema, policy, or sibling dashboard.

## BUSINESS OUTCOME

A test lead can enter Test Hub and immediately see which Test Space is active,
open current execution work, and identify failed/blocked work without scanning
isolated cards or reconstructing state across routes.

## EXACT SLICE

- Detach only the Test Hub dashboard route from `ProjectDashboardPage`.
- Mount a dedicated cockpit composition at `/testhub/dashboard`.
- Reuse `useTestHubProject`, `useTestCases`, `useTestExecutions`, and
  `useTestCycles` without changing their contracts.
- Show existing executions in the canonical `JiraTable`; row activation uses
  `Routes.testHub.execution(execution_key)`.
- Show Test Space case-state and cycle exception facts as compact supporting
  context, not a row of KPI cards.
- Provide explicit loading, empty, and query-error states.

## NON-SCOPE

- No Plan Builder, Focus Runner, Repository Studio, Coverage Intelligence, or
  reports-navigation implementation.
- No readiness percentage, release gate, evidence-gap, approval-waiting, or
  ownership metric until a verified fact contract exists.
- No creation/edit/delete mutations and no new dashboard preferences.
- No database, RLS, storage, migration, edge-function, or generated-type work.
- No modification of Project, Product, Incident, or Release Hub dashboards.
- No Mobbin, external product, or generic SaaS visual influence.
- No permanent lifecycle tracker until its state and navigation semantics are
  backed by a verified lifecycle contract.

## CANONICAL COMPONENTS SELECTED

| Component | File | Why selected |
|---|---|---|
| `AtlaskitPageShell` | `src/components/ads/AtlaskitPageShell.tsx` | Canonical Catalyst outer surface and chrome boundary |
| `ProjectPageHeader` | `src/components/layout/ProjectPageHeader.tsx` | Canonical global-hub breadcrumb and page title with `hubType="test"` |
| `JiraTable` | `src/components/shared/JiraTable/` | Mandatory canonical enterprise list for active executions |
| ADS wrappers (`Button`, `Lozenge`, `Spinner`, `SectionMessage`, `EmptyState`, `ProgressBar`, `Select`) | `src/components/ads/index.ts` | Installed Catalyst wrapper contract for controls and states |
| Atlaskit primitives (`Box`, `Inline`, `Stack`, `Grid`, `xcss`) | `@atlaskit/primitives` | Token-bound page composition without bespoke layout CSS |

Query evidence: `DashboardPage.tsx` currently mounts
`ProjectDashboardPage mode="test"`; `ExecutionsPage.tsx` proves the accepted
`JiraTable<TmTestExecution>` schema and display-key route; `package.json`
contains the installed Atlaskit packages required by the wrapper layer.

## CANONICAL SCREENS SELECTED

| Screen | Route | Adapter needed |
|---|---|---|
| Test executions list | `/testhub/executions` | Reuse its execution columns/read contract in a read-only cockpit table |
| Test Hub global header | `/testhub/reports` and `/testhub/executions` | Reuse `ProjectPageHeader hubType="test"` |

The current Test Hub dashboard and Release Hub overview are explicitly not
visual references; both were rejected as flat/card-heavy during live review.

## FILES TO MODIFY

| File | Change type | Change summary |
|---|---|---|
| `src/pages/testhub/DashboardPage.tsx` | edit | Replace the generic dashboard mount with the dedicated cockpit mount |
| `src/pages/testhub/dashboard/TestOperationsCockpit.tsx` | add | Compose the premium cockpit from canonical components and existing read hooks |
| `src/pages/testhub/dashboard/__tests__/TestOperationsCockpit.test.tsx` | add | Prove truthful aggregation, state handling, display-key navigation, and absence of fabricated readiness |

Feature governance/evidence files may be updated to record execution and
validation results; they are not production surface changes.

## FILES FORBIDDEN

- `src/pages/project-hub/ProjectDashboardPage.tsx`
- `src/components/project-hub/dashboard/**`
- `src/pages/incidenthub/**`
- `src/pages/releasehub/**`
- `src/hooks/test-management/**`
- `src/integrations/supabase/**`
- `src/lib/routes.ts`
- `supabase/**`
- Any file outside the exact production/test list above unless this lock is
  stopped and rebaselined.

## UI/UX RULES

- Catalyst canonicals, installed Atlaskit components, and ADS tokens only.
- No Mobbin or external product influence.
- One focal surface: the active/recent executions table. Supporting facts stay
  on default or sunken surfaces; no row of independent KPI cards.
- Use Atlaskit primitives and ADS spacing tokens. No arbitrary color, font,
  elevation, or animation values.
- Sentence-case labels and visible keyboard focus.
- Status color is owned by canonical `Lozenge`; caller passes semantic
  appearance only.
- Responsive behavior must preserve the execution table as the dominant
  surface and move supporting context below it at narrow widths.
- Dark mode must use the same token roles with no per-theme constants.

## DATA/BACKEND RULES

- Existing verified read contracts only:
  - `tm_projects` via `useTestHubProject`
  - `tm_test_cases` via `useTestCases(projectId)`
  - `tm_test_executions` via `useTestExecutions(projectId)`
  - `tm_test_cycles` via `useTestCycles(projectId)`
- No direct Supabase query in the new cockpit.
- No assumption defaults for unknown domain facts. Unknown values render as a
  dash or are omitted.
- Case counts come from returned case statuses; cycle exceptions come only from
  returned `failed_count` and `blocked_count` values.
- Do not call project-wide cycle counts “release readiness” or associate them
  with an execution because `useTestCycles` does not expose `execution_id`.
- RLS impact: none. Migration required: no.

## INTEGRATION/WIRING RULES

- Test Space resolution must use `useTestHubProject`; never `useProjects()[0]`.
- Navigation must use `Routes.testHub.*`; never concatenate a URL.
- `JiraTable` row IDs use execution UUIDs internally, while URLs use
  `execution_key` display keys.
- Query errors remain distinct by source and expose a retry action.
- Loading must not transiently render zero counts.
- Empty executions render one canonical empty state with one route action; no
  duplicate CTA.

## PARALLEL EXECUTION PLAN

The mandatory seven discovery roles have already completed and are recorded in
`12_AGENT_OUTPUTS.md`.

1. Implementation: build only the three-file cockpit slice in an isolated
   worktree from the current base.
2. Validation: run static gates and targeted unit tests.
3. QA/Screenshot Validator: capture and inspect desktop, narrow, dark, loading,
   empty, error, and adjacent-route evidence.
4. Review: compare every visible fact with hook output and reject any inferred
   readiness language.

## KARPATHY LOOP HYPOTHESES

- **LOOP-012:** Detaching Test Hub from the generic gadget gallery produces a
  stronger operational hierarchy without modifying sibling dashboards.
- **LOOP-013:** Existing Test Space, case, execution, and cycle hooks provide
  enough truthful data for a useful cockpit foundation without schema work.
- **LOOP-014:** One dominant JiraTable plus compact supporting context removes
  the current card-grid blandness while remaining fully Catalyst/ADS-native.

## SCREENSHOT CHECKLIST

- [ ] Current `/testhub/dashboard` reference at the same viewport
- [ ] New desktop cockpit with populated data
- [ ] Narrow viewport with supporting context moved below the table
- [ ] Dark-theme cockpit after reload into dark theme
- [ ] Loading state
- [ ] No-executions empty state with one action
- [ ] Query-error state with retry
- [ ] `/testhub/executions` adjacent-route regression check
- [ ] `/project-hub/:key/dashboard` sibling regression check
- [ ] `/incident-hub/dashboard` sibling regression check

Screenshots prove layout only. DOM assertions and tests prove data, state, and
navigation behavior.

## VALIDATION COMMANDS

```bash
npm run lint:colors:testhub
npm run lint:colors:gate
npm run audit:ads:gate
npx eslint src/pages/testhub/DashboardPage.tsx src/pages/testhub/dashboard/TestOperationsCockpit.tsx src/pages/testhub/dashboard/__tests__/TestOperationsCockpit.test.tsx
npx vitest run src/pages/testhub/dashboard/__tests__/TestOperationsCockpit.test.tsx
npx tsc --noEmit
```

## REGRESSION RISKS

- Removing the generic mount can accidentally remove dashboard persistence or
  edit-gallery affordances. This is intentional for Test Hub only; sibling
  modes must remain unchanged.
- Existing Test Hub hooks may disagree or fail independently. The cockpit must
  expose source-specific failure/empty states instead of merging uncertainty
  into a score.
- `JiraTable` can lose usable height inside nested flex containers; verify its
  viewport at desktop and narrow widths.
- Shared checkout contains extensive unrelated changes; implementation must
  occur in an isolated worktree and stage explicit files only.

## STOP CONDITIONS

Stop and raise a RED FLAG if:

- Vikram has not approved this exact three-file slice.
- An isolated worktree cannot be created without sweeping unrelated changes.
- Any production file outside the list must change.
- Any new fact requires a direct query, hook change, schema inference, or
  assumption default.
- `JiraTable` or a Catalyst wrapper cannot express the design.
- Any hard-coded color, Tailwind color utility, custom table/control, or
  non-ADS design system is introduced.
- TypeScript, targeted tests, ADS gates, or screenshot acceptance fail.
- The slice exceeds two hours.

## DRIFT/REBASELINE RULES

After one correction loop: accept, split, rebuild, or stop and revert. If the
scope changes, stop, record the change in `08_DRIFT_LOG.md`, mark this lock
superseded, and obtain approval for a replacement lock before continuing.

## COMMIT RULES

Stage explicit files only. Do not stage unrelated work. Commit only after raw
validation and screenshot evidence are recorded. The commit message must
reference `CAT-TESTHUB-REMEDIATION-20260711-001` and be approved by Vikram.

## PLAN LOCK STATUS

**DRAFT — design direction is approved; exact implementation slice requires
Vikram's explicit approval before production code begins.**
