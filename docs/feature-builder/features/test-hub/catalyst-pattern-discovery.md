# Catalyst Pattern Discovery: test-hub

**Date:** 2026-06-26
**Experiments:** exp-001 + test-01
**Type:** research (no code changes)

---

## Objective

Map canonical Catalyst patterns Test Hub must reuse. 18 patterns identified (10 added in test-01 vs exp-001's 8).

---

## 1. Layout Shell

**Pattern:** Each hub has its own `*Sidebar.tsx` using `SidebarBase`.

**Test Hub implementation:** `src/components/layout/TestHubSidebar.tsx`
- Uses `SidebarBase` + `SidebarConfig` + `SidebarSection`
- 10 nav items: Dashboard, Board, My Work, Filters, Repository, Test Sets, Cycles, Defects, Traceability, Reports
- Badge: `'TH'` / `badgeHubIconUrl: HUB_ICON_REGISTRY['test']`

**Canonical reference:**
- `src/components/layout/SidebarBase.tsx` — shell contract
- `src/components/layout/TestHubSidebar.tsx` — test hub instance

**Build rule:** Do not add nav items without Plan Lock approval. Sidebar order reflects canonical workflow.

---

## 2. Dashboard / KPI Widgets

**Pattern:** `ProjectDashboardPage` is canonical — 12-column edit-mode grid, widget gallery, persistence. All hubs mount with `mode` prop.

**Test Hub implementation:** `src/pages/testhub/DashboardPage.tsx`
- Correctly mounts `ProjectDashboardPage` with `mode='test'`
- Status: shell mounted; test-specific widgets absent (`isTest` branch empty)

**Build rule:** New Test Hub widgets must follow `WidgetDefinition` schema and set `hideOnTest: false`. Never build parallel widget grid.

---

## 3. Table / List (JiraTable)

**Pattern:** `JiraTable` + cell factories. Only approved component for work-item lists.

**Key files:**
- `src/components/shared/JiraTable/JiraTable.tsx` — main component
- `src/components/shared/JiraTable/cells.tsx` — `makeKeyCell`, `makeStatusCell`, `makeAssigneeCell`, `makeParentCell`, `makeCommentsCell`, `makePriorityCell`, `makeDateCell`, `makeRowMenuCell`
- `src/components/shared/JiraTable/editors.tsx` — inline edit factories

**API:** `Column<TRow>` schema: `{ id, header, cell, width?, sortable?, hideable?, accessor? }`

**Sizing:** compact = 40px rows; comfortable = 48px. Pagination default 25.

**Test Hub status:** NOT used in Repository, Cycles, Sets, Defects pages. All 4 pages must migrate to JiraTable in build-01.

**Build rule:** All test case/cycle/set/defect lists MUST use `JiraTable`. Never `<table>`, CSS grid table, or flex table. Forbidden pattern: custom `<tr>` rows.

---

## 4. Drawer / Detail Panel (CatalystViewBase)

**Pattern:** `CatalystViewBase` (modal/panel/fullPage) + `CatalystDetailRouter`.

**Key files:**
- `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx`
- `src/components/catalyst-detail-views/shared/sections/CatalystKeyDetails.tsx`
- `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx`

**Sizing:** Right panel 400px default; min 220px; max 480px. Container query at 440px hides sidebar. 150ms transitions.

**Reference implementation:** `src/components/catalyst-detail-views/CatalystViewBusinessRequest.v3.tsx` — left/right split layout.

**Test Hub status:** `src/pages/testhub/repository/CaseDrawer.tsx` (426 lines) uses `createPortal(panel, document.body)` — CONFIRMED custom portal, NOT CatalystViewBase. HIGH RISK. Missing: ActivityPanel, keyboard handling, breadcrumb. Same failure mode as BrSidebarDetails (18+ parity defects reported 2026-06-01).

**Build rule:** CaseDrawer MUST migrate to CatalystViewBase in build-02. CycleDetail, SetDetail, DefectDetail also must use CatalystViewBase when built as detail panels.

---

## 5. Filter / Search

**Pattern:** Canonical `FiltersListPage` with `hubType` prop. Each hub wraps it.

**Test Hub implementation:** `src/pages/testhub/FiltersListPage.tsx`
- Correctly mounts `FiltersListPage` with `hubType='test'`
- Status: correct pattern followed

**Build rule:** Never build parallel filter UI. Extend canonical `FiltersListPage` via `hubType`.

---

## 6. Admin / Config

**Pattern:** `AdminLayout` + admin page per config entity. TestHub admin already in place.

**5 Test Hub admin pages (FullAppRoutes.tsx lines 139–144):**
- `src/pages/admin/test/TestPrioritiesPage.tsx`
- `src/pages/admin/test/TestCaseTypesPage.tsx`
- `src/pages/admin/test/TestCaseStatusesPage.tsx`
- `src/pages/admin/test/TestRunStatusesPage.tsx`
- `src/pages/admin/test/TestPermissionsPage.tsx`

**Build rule:** All UI config driven from `tm_case_priorities`, `tm_case_types`, `tm_environments`. Never hardcode priority/status values in components.

---

## 7. AI / Assistant

**Pattern:** `AIIntelligenceButton` for inline AI CTA (static rainbow border). `CatyAIChat` for panel. Test-specific `useAIGeneration` hook exists.

**Key files:**
- `src/components/ui/AIIntelligenceButton.tsx` — canonical AI CTA (rainbow border, requires Gate 7)
- `src/components/caty-ai-chat/CatyAIChat.tsx` — chat panel
- `src/hooks/test-management/useAIGeneration.ts` — calls `ai-generate-test-cases` Edge Fn; returns testCases[], metadata
- `src/hooks/useAIIntelligence.ts` — shared AI hook

**Test Hub status:** `useAIGeneration.ts` CONFIRMED dead code in UI. No AIIntelligenceButton in any Test Hub page. `test-plans/AIGeneratorModal.tsx` built but orphaned. Highest-value unwired capability.

**Build rule:** Wire AI CTA only with Gate 7 approval. Use `AIIntelligenceButton` — never hand-roll rainbow button. Auto-accept only if confidence > 85%.

---

## 8. Activity / Attachments (ActivityPanel)

**Pattern:** `ActivityPanel` for comments/audit. `LinkedWorkItemsSection` for linked items.

**Key files:**
- `src/components/catalyst-ds/activity/ActivityPanel.tsx` — canonical (use this)
- `src/components/IssueDetailPane/ActivityPanel.tsx` — legacy (do not use)
- `src/components/IssueDetailPane/LinkedWorkItemsSection.tsx`

**API:** Props: `comments[], historyItems[], onAddComment, onAddReply, onEditComment, onDeleteComment, onToggleReaction`. Tabs: All / Comments / History / Worklog (hideable). ADF rich text; @mentions; emoji reactions.

**Test Hub status:** NOT wired in CaseDrawer. CaseDrawer has no comments section. Must add ActivityPanel when CaseDrawer migrates to CatalystViewBase (build-02).

**Build rule:** All test case detail views must include ActivityPanel. Never build custom comment UI.

---

## 9. Status Lozenges / Badges

**Pattern:** ADS `<Lozenge>` for status display. Catalyst wraps with `StatusLozenge` or `CaseStatusBadge`.

**Key files:**
- `@atlaskit/lozenge` — ADS primitive
- `src/components/shared/StatusLozenge.tsx` — canonical wrapper
- `src/components/testhub/CaseStatusBadge.tsx` — test-specific (if exists, use it)

**Build rule:** Never build custom status pill with `var(--ds-background-*)` manually. Use `<Lozenge appearance='success'>` or the Catalyst wrapper. No Tailwind color classes on status indicators.

---

## 10. Modal Dialogs

**Pattern:** `@atlaskit/modal-dialog` for confirmation dialogs, create modals, destructive actions.

**Key files:**
- `@atlaskit/modal-dialog` — ADS primitive
- `src/components/shared/ConfirmModal.tsx` — canonical confirmation pattern

**Test Hub usage:** CreateTestCaseModal, CreateCycleModal, BulkEditModal — must use ADS modal, not hand-rolled overlay.

**Build rule:** No custom modal backdrop, no `createPortal` modal wrappers. Use ADS `ModalDialog` + `ModalHeader` + `ModalFooter`.

---

## 11. Tabs

**Pattern:** `@atlaskit/tabs` for page-level and drawer-level tab navigation.

**Key files:**
- `@atlaskit/tabs` — ADS primitive
- Used in: CatalystViewBase detail panels (Details/Activity/History tabs)

**Test Hub usage:** CaseDrawer tabs (Details / Steps / Activity / History / Linked Issues), CycleDetail tabs (Overview / Test Cases / Planning / Settings).

**Build rule:** Use ADS `<Tabs>` + `<Tab>` + `<TabList>` + `<TabPanel>`. Never roll custom tab navigation with CSS classes.

---

## 12. Forms / Inline Edit

**Pattern:** `@atlaskit/inline-edit` for in-place field editing. `@atlaskit/form` for modal/page forms.

**Key files:**
- `@atlaskit/inline-edit` — ADS primitive
- `@atlaskit/form` — ADS form primitive
- `src/components/shared/JiraTable/editors.tsx` — inline edit factories for JiraTable

**Test Hub usage:** Inline edit for case title, priority, status, assignee in Repository table and CaseDrawer.

**Build rule:** All field-level editing uses `@atlaskit/inline-edit`. No custom input-on-hover patterns.

---

## 13. Context Menu / Action Menu

**Pattern:** `@atlaskit/dropdown-menu` for row action menus. Catalyst wraps with `makeRowMenuCell` factory.

**Key files:**
- `@atlaskit/dropdown-menu` — ADS primitive
- `src/components/shared/JiraTable/cells.tsx` — `makeRowMenuCell` factory

**Test Hub usage:** Row-level actions in Repository (Edit, Clone, Delete, Move to Cycle), Cycles (Edit, Archive, Delete), Sets (Edit, Delete).

**Build rule:** Row menus use `makeRowMenuCell` in JiraTable. Never render a custom `<ul>` dropdown.

---

## 14. Dashboard Widgets / KPI Cards

**Pattern:** `WidgetDefinition` schema for `ProjectDashboardPage` grid. Each widget = `{ id, label, component, hideOnTest?, hideOnBacklog? }`.

**Key files:**
- `src/components/project-dashboard/widgets/` — existing widget implementations
- `src/components/project-dashboard/WidgetGallery.tsx` — widget registry
- `src/components/project-dashboard/ProjectDashboardPage.tsx` — host grid

**Test Hub usage:** Need test-specific widgets: ExecutionProgressWidget, PassRateWidget, CoverageWidget, CycleHealthWidget.

**Build rule:** New test widgets must register in WidgetDefinition with `hideOnTest: false`. Gate 3 approval before adding widgets.

---

## 15. Charts / Reports

**Pattern:** Recharts-based chart components (already in codebase). Catalyst has ExecutionTrendChart, ResultsPieChart (confirm location).

**Key files:**
- `src/components/testhub/reports/ExecutionTrendChart.tsx` (confirm exists)
- `src/components/testhub/reports/ResultsPieChart.tsx` (confirm exists)
- `recharts` library — already in package.json

**Test Hub usage:** ReportsPage must implement 5 core report types using existing chart components + Recharts.

**Build rule:** Use existing chart components first. If new chart type needed, use Recharts directly — no new chart library.

---

## 16. Search / Global Search

**Pattern:** `useSearch` hook + `SearchModal` for global search. Hub-scoped search via `scope='test'` prop.

**Key files:**
- `src/hooks/useSearch.ts` — global search hook
- `src/components/shared/SearchModal.tsx` — search overlay

**Test Hub usage:** Repository page search bar. "Jump to test case" from global search.

**Build rule:** Repository search must use `useSearch` with `scope='test'`. Never build custom search input that bypasses the canonical search hook.

---

## 17. Empty States

**Pattern:** `@atlaskit/empty-state` for zero-data views. Catalyst wraps with context-specific messaging.

**Key files:**
- `@atlaskit/empty-state` — ADS primitive
- `src/components/shared/HubEmptyState.tsx` — canonical wrapper (confirm)

**Test Hub usage:** Empty Repository (no test cases), Empty Cycles (no cycles yet), Empty Reports (no data).

**Build rule:** All empty states use ADS `<EmptyState>` with canonical illustration + primary action CTA. Never hand-roll empty state with raw flexbox.

---

## 18. Kanban Board

**Pattern:** `KanbanPage` canonical — all hubs mount with `mode` prop.

**Test Hub implementation:** `src/pages/testhub/BoardPage.tsx`
- Mounts `KanbanPage` with `mode='test'` (confirm in audit)
- Status: confirmed thin wrapper pattern in Lane 1

**Build rule:** Board is already wired via KanbanPage. Never build parallel drag-drop board. Extend via mode/hubType system only.

---

## Forbidden Duplicate Patterns (BANNED)

These must NEVER appear in Test Hub code:

| Banned pattern | Canonical replacement |
|---|---|
| Custom `<table>` for test case list | `JiraTable` |
| `createPortal` custom drawer | `CatalystViewBase` |
| Hand-rolled comment/discussion section | `ActivityPanel` |
| Custom tab navigation | `@atlaskit/tabs` |
| Custom status pill with `background-color: #...` | `<Lozenge>` or `StatusLozenge` |
| Custom modal overlay/backdrop | `@atlaskit/modal-dialog` |
| Custom inline edit on hover | `@atlaskit/inline-edit` |
| Custom dropdown menu | `@atlaskit/dropdown-menu` + `makeRowMenuCell` |
| Rainbow button (non-AI) | Not allowed; AI CTA only via `AIIntelligenceButton` |
| Hex colors, raw rgb/rgba | `var(--ds-*)` tokens only |
| Tailwind color utilities | `var(--ds-*)` tokens only |
| Hand-rolled empty state | `@atlaskit/empty-state` |
| Parallel drag-drop board | `KanbanPage mode='test'` |
| Custom chart library | Recharts (already in codebase) |

---

## Reference Screens to Clone/Adapt

| Screen to build | Clone/adapt from |
|---|---|
| RepositoryPage (list) | `BacklogPage.atlaskit.tsx` — JiraTable pattern |
| CaseDrawer (detail) | `CatalystViewBusinessRequest.v3.tsx` — left/right split |
| CasesBoard | `KanbanPage` — already mounted |
| DashboardPage | `ProjectDashboardPage` — already mounted; add widgets |
| ReportsPage tiles | `src/pages/admin/` tiles pattern |
| MyWorkPage KPI row | `src/components/project-dashboard/widgets/` chip bar |
| CycleDetailPage execution grid | `ExecutionPage` (already exists) |
| TestSetsPage | Mirror `CyclesPage` pattern |

---

## Pattern Reuse Summary

| Pattern | Canonical component | Test Hub status |
|---|---|---|
| Layout shell | `SidebarBase` | ✅ TestHubSidebar correct |
| Dashboard grid | `ProjectDashboardPage` | ✅ mounted; test widgets absent |
| Table/list | `JiraTable` | ❌ NOT used in Repository/Cycles/Sets/Defects — build-01 |
| Drawer/detail | `CatalystViewBase` | ❌ CaseDrawer custom portal — build-02 |
| Filter/search | `FiltersListPage` | ✅ correct |
| Admin/config | `AdminLayout` + 5 admin pages | ✅ correct |
| AI CTA | `AIIntelligenceButton` | ❌ useAIGeneration dead code, no UI wiring — build-05 |
| Activity/comments | `ActivityPanel` | ❌ not in CaseDrawer — build-02 |
| Status lozenges | `<Lozenge>` / `StatusLozenge` | ⚠️ verify in Repository table cells |
| Modal dialogs | `@atlaskit/modal-dialog` | ⚠️ verify in Create flows |
| Tabs | `@atlaskit/tabs` | ⚠️ verify in CaseDrawer/CycleDetail |
| Inline edit | `@atlaskit/inline-edit` | ⚠️ verify in Repository table |
| Context menu | `makeRowMenuCell` | ⚠️ verify in all list pages |
| Dashboard widgets | `WidgetDefinition` | ❌ test widgets absent — build-06 |
| Charts | Recharts + existing charts | ❌ reports all stubs — build-04 |
| Search | `useSearch` | ⚠️ verify in Repository |
| Empty states | `@atlaskit/empty-state` | ⚠️ verify in all list pages |
| Kanban board | `KanbanPage` | ✅ thin wrapper confirmed |
