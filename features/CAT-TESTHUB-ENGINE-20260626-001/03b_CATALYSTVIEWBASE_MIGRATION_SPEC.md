# 03b — CatalystViewBase Test-Case Detail Migration SPEC (D4) — turnkey

Probe agent a604bfddbe55b9755 (2026-06-26). Code-grounded. Execute in a fresh session.

## Verdict
**Template = `TaskCatalystView`** (`src/components/catalyst-detail-views/task-catalyst/TaskCatalystView.tsx`). Tasks live in a non-`ph_issues` table (`tasks`) exactly like `tm_test_cases`; it adapts its row into a `pseudoIssue` + `dataSource` and mounts the real `CatalystViewBase`. **Do NOT copy `CatalystViewIdea`** (it hand-rolls a modal, bypasses the shell).

**Strategy: COEXIST.** Create flow keeps `CaseDrawer`. Row-click opens the case in `CatalystViewTestCase` via `CatalystDetailRouter` with `entityKind="test_case"`.

## CatalystViewBase API (shared/CatalystViewBase.tsx:92-151)
Pure layout shell — owns NO data, NO mutations, NO footer. Key props: `isOpen,onClose,panelMode,fullPageMode`, breadcrumb (`itemType,itemKey,projectKey,projectName`), `moreMenuItems[]`, panel-nav (`navigationItems,currentItemId,onNavigate`), **`leftContent`** (body), **`rightContent`** (sidebar), `isLoading,isNotFound,hideSidebar,fullPageHrefBuilder`.
- No tabs prop → put `@atlaskit/tabs` inside `leftContent`.
- ⚠️ Auto-mounts `<WorkItemTraceabilityPanel workItemKey={itemKey}/>` at line ~700 (keyed on ph_issues; renders empty for tm_ key — can't disable via props).
- Copy-link/full-page default to `/browse/` & `/project-hub/.../backlog/` → MUST pass `fullPageHrefBuilder` → `/testhub/...`.

## Files to CREATE
1. `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx` — clone TaskCatalystView; swap: data hook `useTestCase(itemId)` (useTestCases.ts:183, returns key/objective/type_id/steps/folder/labels/last_execution); adapter `testCaseToPseudoIssue` (below); `dataSource` writes → `useUpdateTestCase`/`useUpdateTestStep`; `leftContent` = `@atlaskit/tabs` Details/Steps/Versions/Traceability (Steps reuses `src/pages/testhub/repository/StepEditor.tsx`; Versions uses `useTestCaseVersions(itemId)`); `fullPageHrefBuilder` → testhub route.
2. `src/components/catalyst-detail-views/test-case/index.ts` — re-export.

## Files to EDIT
3. `shared/types.ts:66` — `entityKind?: 'ph_issue' | 'task' | 'test_case'`.
4. `CatalystDetailRouter.tsx` — lazy import + `if (entityKind === 'test_case') return <CatalystViewTestCase .../>` short-circuit (mirror task branch lines 65-85).
5. `src/pages/testhub/repository/RepositoryPage.tsx:904-908` — row-click sets `selectedCaseId` + renders `<CatalystDetailRouter entityKind="test_case" itemId={selectedCaseId} isOpen panelMode onClose=.../>` instead of CaseDrawer-for-edit. Keep CaseDrawer for the create button (line ~880).

## testCaseToPseudoIssue adapter (load-bearing)
status enum draft/ready/approved/deprecated → status_category: approved→'done', ready→'inprogress', draft→'todo', deprecated→**null** (zero-assumption, never default). Map: id, issue_key=case_key, summary=title, description_text=description, status, status_category, issue_type='Test Case', assignee from assigned_user, jira_created/updated_at, deleted_at = archived?now:null, priority=null (handle via dataSource).

## Sidebar/KeyDetails (no field-descriptor API — single `issue: PhIssue` + node slots + dataSource callbacks)
`CatalystSidebarDetails`: issue,itemId,onStatusChange,onClose,onDelete,`statusPill=<CatalystStatusPill>`,typeLabel,projectKey,`children` (type-specific rows),`dataSource{onAssigneeChange,onPriorityChange,onDueDateChange,...}`. `CatalystKeyDetails`: `extraRows` (use `KeyDetailsFieldRow` atom), `afterBody` (description).

## 6 MISMATCH FLAGS (must handle)
1. Status: tm enum is lifecycle not workflow; map best-effort, deprecated→null category; onStatusChange writes the ENUM not a Jira status id.
2. Priority is FK (priority_id→tm_case_priorities), not a label. Use `dataSource.priorityOptions` (names) + onPriorityChange writes the id (label↔id map). Query in CaseDrawer.tsx:48-59.
3. case_type_id: no canonical field → custom KeyDetailsFieldRow in `extraRows` (tm_case_types query CaseDrawer.tsx:61-72).
4. Auto WorkItemTraceabilityPanel duplicates a Traceability tab → suppress own tab OR accept empty auto panel.
5. No reporter/labels/sprint/fixversions/components on tm_test_cases → those dataSource callbacks = no-ops.
6. version vs current_version naming — Versions tab uses useTestCaseVersions (authoritative).

## Acceptance (live proof on cyij)
Click TC-001 → opens in CatalystViewBase shell (breadcrumb, sidebar status pill + priority, Details/Steps/Versions tabs); edit status/priority persists to tm_test_cases; steps show; CATY no longer collides (footer gone). Create still via CaseDrawer.
