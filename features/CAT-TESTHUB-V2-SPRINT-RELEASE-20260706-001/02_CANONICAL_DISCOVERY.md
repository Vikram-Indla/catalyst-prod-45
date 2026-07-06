# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Canonical Discovery

> Synthesized from Canonical Component + Canonical Screen Discovery agents (2026-07-06). Full raw findings in 12_AGENT_OUTPUTS.md.

## Canonical components identified

| Component | Import path | Fit verdict | Notes |
|---|---|---|---|
| JiraTable v1.4 | `@/components/shared/JiraTable` | KEEP — mandatory | Repository/plans/executions/scope lists; sort/group/bulk/inline-edit/col-reorder/sticky footer/density |
| Breadcrumbs | `@/components/ads` | KEEP | data-driven items[], via ProjectPageHeader |
| Lozenge / StatusLozenge / HealthBadge / CatalystStatusPill | `@/components/ads`, catalyst-detail-views/shared | KEEP | status pills + health gates; 3-colour guard |
| CatalystAvatar / UserAvatar | `@/components/shared/UserAvatar` | KEEP | CDN-banned avatars |
| ActivityPanel + TmActivitySection / TmCommentsSection | `@/components/catalyst-ds`, catalyst-detail-views/test-case | KEEP | already wired to tm_comments + tm_activity_log |
| AttachmentsSection / TestCaseAttachments | `@/components/shared/AttachmentsSection` | KEEP | evidence uploads; standardize bucket testhub-attachments |
| LinkedWorkItems + normalizeLinkedWork | project-work-hub/components/linked-work-items | KEEP | traceability links UI |
| @atlaskit/pragmatic-drag-and-drop | direct | KEEP | folder drag/drop; NO @atlaskit/tree in repo — hierarchy = parent_id + chevron expand |
| PageHeader + AtlaskitPageShell + RightDetailsPanel | `@/components/ads`, `@/components/shared` | KEEP | full-page scaffold; right rail ≠ drawer |
| Modal (+Header/Body/Footer) | `@/components/ads` | KEEP | compact actions only; replace module's shadcn Dialogs |
| EmptyState / SectionMessage | `@/components/ads` | KEEP | empty + error+retry states |
| JiraIssueTypeIcon / ProjectIcon | `@/lib/jira-issue-type-icons` | KEEP | parent column icon contract |
| CatyIconCTA | `@/components/ui/CatyIconCTA` | KEEP — ONLY AI rainbow | AIIntelligenceButton/CatyRainbowCTA deprecated; inline AI buttons on detail views banned |
| AdfDescriptionField | shared/rich-text/atlaskit | KEEP | rich text; TipTap banned |
| react-intl-next IntlProvider | App.tsx | KEEP | RTL/i18n base; dir="auto" pattern |

## Canonical screens identified

| Route/Page | File | Fit verdict | Notes |
|---|---|---|---|
| CatalystDetailRouter fullPageMode | catalyst-detail-views | KEEP — the V2 full-page pattern | DefectDetailPage proves it; test-case must switch panelMode→fullPageMode route |
| SprintDetailPage = ReleaseDetailPage + SPRINT_CONFIG | pages/project-hub/SprintDetailPage.tsx | KEEP | Sprint Test Health section mounts parallel to QualityGatesSection |
| ReleaseDetailPage / ChangeDetailPage tabs | pages/release-hub, pages/releasehub | KEEP | readiness section model; ChangeCockpitSections pattern |
| BacklogPage.atlaskit.tsx | modules/project-work-hub | KEEP — density gold standard | model for repository table |
| ProjectDashboardPage + DashboardWidgetGrid | components/project-hub/dashboard | KEEP | mode-filtered WIDGET_REGISTRY |
| ReportsHubPage + REPORT_REGISTRY | pages/testhub/reports | KEEP | new reports = registry entries |
| CatalystViewStory leftContent pattern + TestCasesSection + TestCoveragePanel | catalyst-detail-views/story | KEEP | precedent for pushing latest-run status into work items; extend to Feature/Epic/BR |
| RepositoryPage (tree + JiraTable) | pages/testhub/repository | UPLIFT | right bones; 7/13 columns; panel authoring → full page |
| TestSetsPage | pages/testhub/sets | REBUILD | hand-rolled table |
| TestPlansPage | pages/testhub/plans | REBUILD/EXTEND | no detail surface exists |
| CycleDetailPage RightPanel | pages/testhub/cycles | REBUILD (drawer ban) | 480px fixed drawer ×3 — flows move to run surface |

## JiraTable evaluation
- Applies: YES — every list surface (repository, plans, executions, cycles, scope, defects, traceability, reports canvas).
- Verdict: MANDATORY.
- Evidence: already the module norm (only TestSetsPage violates); BacklogPage proves 13-col density with inline editors.

## Storybook components reviewed
catalyst-storybook MCP unauthenticated this session — component discovery done via source tree + registry scan instead (full API/props evidence in 12_AGENT_OUTPUTS.md Agent 1).
