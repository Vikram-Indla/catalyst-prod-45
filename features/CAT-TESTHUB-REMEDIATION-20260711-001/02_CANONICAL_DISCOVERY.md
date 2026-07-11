# CAT-TESTHUB-REMEDIATION-20260711-001 — Canonical Discovery

**Status:** Complete for current Catalyst repository patterns. This document,
the Catalyst-native screen plan, and ADS are the only design inputs.

## Canonical strategy

The current Test Hub shell should be repaired, not replaced. Its strongest
surfaces already use Catalyst canonicals. Functional correction belongs in
adapters, hooks, transactional services, and shared component extensions.

## Canonical components identified

| UI need | Canonical | Evidence | Verdict |
|---|---|---|---|
| Enterprise lists, selection, sorting, pagination, hierarchy | `JiraTable` | `src/components/shared/JiraTable/types.ts:96-238` | MANDATORY |
| Full-page/panel detail | `CatalystDetailRouter` + `CatalystViewBase` | `TestCaseDetailPage.tsx:52-65`; `CatalystViewBase.tsx:99-180` | KEEP |
| Hub header | `ProjectPageHeader` | Already used across Test Hub | KEEP |
| Board | `KanbanPage` | `BoardPage.tsx:14-17` | KEEP; fix adapter |
| My Work/Defects | `BacklogPage` | `MyWorkPage.tsx:58-67`; `DefectsPage.tsx:37-45` | KEEP; fix adapter |
| Timeline | `TimelineView` | `TestHubTimelinePage.tsx:70-99` | KEEP |
| Dependencies | `DependenciesView` | `TestHubDependenciesPage.tsx:81-92` | KEEP |
| Nested folder navigation | Parameterize `PageTree` | `src/components/wiki-hub/PageTree.tsx:30-137` | EXTEND; do not copy |
| Comments | `TmCommentsSection` → `CommentThread` | `src/components/testhub/TmCommentsSection.tsx:15-64` | REUSE |
| Attachments/evidence | Extract a generic `TmAttachmentsSection` from `TestCaseAttachments` | `TestCaseAttachments.tsx:78-292` | EXTEND shared pattern |
| Status | ADS `Lozenge` / canonical status wrapper | Existing Test Hub usage | KEEP |
| Forms/modals | Catalyst ADS wrapper layer | `src/components/ads/` | MANDATORY |
| Reports charts | `ReportChart` | `src/components/testhub/reports/charts/ReportChart.tsx:1-67` | KEEP |
| AI launchers | `CatyIconCTA` / `AIIntelligenceButton` | Existing approved AI controls | KEEP; no new rainbow control |

## Canonical screens identified

| Test Hub surface | Existing canonical screen/pattern | Decision |
|---|---|---|
| Dashboard | `ProjectDashboardPage` | Keep shell; add real Test Hub widget contracts and active-space data |
| Board | `KanbanPage mode="test"` | Keep; repair create/archive/delete/project semantics |
| My Work | `BacklogPage` + Test adapter | Keep; repair active space, pagination, action model |
| Defects | `BacklogPage` + Defect adapter | Keep; expose lineage and active-space scope |
| Repository | `ProjectPageHeader` + `JiraTable` + detail router | Keep; standardize surrounding controls and pagination |
| Plans/Executions/Cycles | `ProjectPageHeader` + `JiraTable` + ADS modals | Keep; add lifecycle wiring rather than a new UI family |
| Case/Defect detail | `CatalystDetailRouter` / `CatalystViewBase` | Keep |
| Timeline/Dependencies | Shared canonical views | Keep |
| Traceability grid | `JiraTable` | Accessible baseline; specialized matrix/canvas require explicit approval |
| Governed lifecycle detail | Release Hub `ReleaseDetailPage` tabbed pattern | In-repo reference for Scope, Sign-offs, Readiness, Audit, and evidence hierarchy |
| Approval queue | Release Hub `SignOffQueuePage` | Candidate for governed case/plan approvals; owner review required |

## JiraTable evaluation

- Applies: **YES**
- Verdict: **MANDATORY** for repository, plan, execution, cycle, run, defect,
  traceability-grid, and enterprise admin list surfaces.
- Raw admin tables at `TestCaseTypesPage.tsx:208-290`,
  `TestPrioritiesPage.tsx:179-248`, and `TestPermissionsPage.tsx:130-190`
  must not remain as the production pattern.

## Non-canonical gaps

The inspected scope contains heavy canonical usage—22 JiraTables, 13
ProjectPageHeaders, 22 ADS modals, 85 ADS buttons, and 85 lozenges—but also 72
raw buttons, 20 raw inputs, 4 raw textareas, 2 raw selects, and 3 raw tables.

Highest-priority replacement areas:

1. Shadcn AI-generation dialog (`AIGenerateTestCasesDialog.tsx:22-35`).
2. Three raw admin tables.
3. Repository folder tree and form controls.
4. Test-step authoring controls.
5. Runner navigation, verdict, timer, save, and evidence controls.
6. Cycle comments/evidence/defect side panels.
7. Report navigation and filters.
8. Traceability switcher and hierarchy interactions.

## Storybook evidence

The Catalyst Storybook MCP was not connected, so no MCP claim is made. Local
audit-grade and enterprise stories were inspected:

- `src/stories/audit-grade/01-JiraTable.stories.tsx`
- `src/stories/audit-grade/02-CatalystViewBase.stories.tsx`
- `src/stories/audit-grade/04-StatusTransition.stories.tsx`
- `src/stories/audit-grade/12-AttachmentsSection.stories.tsx`
- `src/stories/audit-grade/13-CommentsSection.stories.tsx`
- `src/stories/enterprise/JiraTable.stories.tsx`
- `src/stories/enterprise/CatalystViewBase.stories.tsx`

## Hard stop

No future screen layout or interaction selection is final until Vikram reviews
the Catalyst-native screen plan. External product research is non-governing.
