# R2 — Canonical Component Map Inputs
**Feature:** CAT-TESTHUB-PROD-20260703-001 (TestHub production-grade revamp)
**Agent:** Canonical Component Discovery · **Date:** 2026-07-03
**Evidence basis:** directory listings, grep over `src/`, `package.json` reads. Repo root `/Users/vikramindla/Documents/GitHub/catalyst-prod-45`.

Tier legend (per CLAUDE.md canonical hierarchy):
- **Tier-1** existing Catalyst canonical component
- **Tier-2** existing Catalyst wrapper
- **Tier-3** Storybook-documented component (audit-grade stories)
- **Tier-4** ADS primitive (`@atlaskit/*`, installed)
- **Tier-5** hand-rolled — needs explicit approval

---

## 1. Component tier inventory

### 1.1 `src/components/catalyst-ds/**` — Catalyst Design System (comments/activity focused)
Barrel: `src/components/catalyst-ds/index.ts`. Notable exports (all from index.ts):
- Layout primitives: `Box`, `Stack`, `Inline` (`layout/Box.tsx`, `layout/Stack.tsx`, `layout/Inline.tsx`)
- Status: `Lozenge` + `lozengeVariants` (`status/Lozenge.tsx`)
- Comments: `Comment`, `CommentAction`, `CommentEditor` (with `CommentImproveContext`), `CommentThread` (`comments/*`)
- Activity: `ActivityItem`, `ActivityFeed`, `ActivityPanel` (`activity/*`)
- Utils: `renderJiraContent`, `normalizeJiraText`, `prettyUrl` (`utils/jiraContent.ts`)
- Shared types in `types.ts` (`CdsUser`, `CdsComment`, `CdsActivityItem`, `CdsAppearance`, …)

Scope note: this dir is comments/activity/layout only — it is NOT a general widget kit.

### 1.2 `src/components/ads/**` — thin ADS wrappers (Tier-2)
36 files + `internal/` + `index.ts` (4.5K barrel). Notable:
`AtlaskitPageShell.tsx` (13.3K), `Avatar.tsx`, `Breadcrumbs.tsx` (9.9K), `Button.tsx`, `CatalystBanner.tsx`, `CatalystCodeBlock.tsx`, `CatalystDrawer.tsx` (wraps `@atlaskit/drawer`), `CatalystInlineEdit.tsx`, `CatalystLink.tsx`, `CatalystProfileCard.tsx`, `CatalystProgressTracker.tsx`, `CatalystTag.tsx`, `Checkbox.tsx`, `DropdownMenu.tsx`, `DynamicTable.tsx` (2.8K wrapper over `@atlaskit/dynamic-table`), `EmptyState.tsx` (4.6K), `Flag.tsx`, `Heading.tsx`, `InlineEdit.tsx`, `Lozenge.tsx` (8.4K), `Modal.tsx` (3.2K, `@atlaskit/modal-dialog`), `PageHeader.tsx`, `Popup.tsx`, `ProfilePicker.tsx` (19.4K), `ProgressBar.tsx`, `SectionMessage.tsx`, `Select.tsx`, `Spinner.tsx`, `Textfield.tsx`, `ThemeToggle.tsx`, `Tooltip.tsx`, `TruncateCell.tsx`, `UnassignedAvatar.tsx`, plus `README.md` documenting the tier.

### 1.3 `src/components/shared/**` — canonical Catalyst surfaces (Tier-1)
Key subdirs: `JiraTable/`, `BacklogTable/`, `CanonicalDescriptionField/`, `CatalystDueDateField/`, `CatalystListPage/`, `HubItemDetailPage/`, `StatusLozenge/`, `Timeline/`, `dynamic-table/`, `jira-description-editor/` (tiptap — see §2 RTE), `rich-text/` (editor-core).
Notable files: `AtlaskitEditor.tsx` (6.1K, editor-core), `AtlaskitRenderer.tsx`, `AddParentPicker.tsx`, `AttachmentsSection.tsx`, `BulkSelectionBar.tsx`, `CatalystAvatar.tsx`, `CatalystDetailPanel.tsx` (35.1K), `CatalystPageHeader.tsx`, `CommentsSection.tsx`, `DangerConfirmModal.tsx` (15K), `DrawerPanel.tsx`, `GroupByPopover.tsx`, `IssueHoverCard.tsx` (36.4K), `JiraBulkActionBar.tsx`, `JiraFilterAtlaskit.tsx` (30.6K), `JiraIssueTypeIcon.tsx`, `MentionInput.tsx`, `PriorityIcon.tsx`, `ProjectIcon.tsx`, `QuickAddRow.tsx`, `ResizableTableHeader.tsx`, `RightDetailsPanel.tsx`, `UnifiedAuditHistoryTab.tsx`, `UnifiedLinksTab.tsx` (42.6K), `UserAvatar.tsx`, `WorkItemIcon.tsx`, `WorkItemsProgressBar.tsx`.

**JiraTable** (`src/components/shared/JiraTable/`): `JiraTable.tsx` (146.4K), `cells.tsx` (33.1K), `editors.tsx` (76.2K), `flags.tsx` (8.5K), `BulkFooterBar.tsx`, `ColumnHeaderMenu.tsx`, `ToolbarMenuButton.tsx`, `types.ts`, `__tests__/`. Barrel `index.ts` exports: `JiraTable`, cell factories (`makeCheckboxCell`, `makeKeyCell`, `makeSummaryCell`, `makeStatusCell`, `makeAssigneeCell`, `makePriorityCell`, `makeDateCell`, `makeTypeIconCell`, `makeLabelsCell`, `makeSprintReleaseCell`, `makeDragHandleCell`, `makeRowMenuCell`, …), inline editors (`makeStatusEditCellAkPopup`, `makeSummaryInlineEditCell`, `makeAssigneeEditCell`, `makePriorityEditCell`, `makeParentEditCell`, `makeDateEditCell`, `makeLabelsEditCell`, `makeRowActionsCell`), flag toasts (`FlagsHost`, `showFlag`, `flag`), and `BulkFooterBar`.

**CatalystListPage** (`src/components/shared/CatalystListPage/`): `CatalystListPageLayout.tsx`, `CatalystListToolbar.tsx`, `CatalystQuickTabBar.tsx`, `CatalystBulkActionBar.tsx`, `PermissionList.tsx` — canonical list-page chrome.

**shared/dynamic-table/**: `DynamicTable.tsx` (24.7K), `ColumnVisibilityMenu.tsx`, `useTablePersistence.ts` — richer wrapper than `ads/DynamicTable.tsx`; secondary table option for non-work-item lists.

### 1.4 `src/components/ui/**` — shadcn/Radix legacy tier (avoid for new files)
~50 files: `accordion.tsx`, `alert-dialog.tsx`, `breadcrumb.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `catalyst-date-picker.tsx` (wraps `@atlaskit/datetime-picker`), `catalyst-table.tsx` (13.6K), `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `resizable.tsx` (wraps `react-resizable-panels`), `segmented-tabs.tsx`, `select.tsx`, `sheet.tsx`, `sonner.tsx`, `table.tsx`, `tabs.tsx`, `toast.tsx`, `unified-toolbar.tsx`, `user-picker.tsx`, plus `AIIntelligenceButton.tsx` (the only sanctioned rainbow CTA besides CatyRainbowCTA per CLAUDE.md). This tier is the shadcn legacy layer — new TestHub surfaces should not add new imports from it except where noted below (resizable, date-picker are the pragmatic exceptions pending decision).

### 1.5 `@atlaskit/*` in `package.json` (all installed, Tier-4)
`adf-schema` 52.11.4, `atlassian-navigation`, `avatar`, `avatar-group`, `badge`, `breadcrumbs`, `button`, `calendar`, `checkbox`, `css-reset`, `datetime-picker`, `drawer`, `dropdown-menu`, `dynamic-table`, `editor-common`, **`editor-core` ^217.12.4**, `editor-plugins` 13.0.120, `editor-plugin-paste`, `editor-plugin-table` 19.0.0, `editor-toolbar`, `empty-state`, `flag`, `form`, `heading`, `icon`, `inline-edit`, `layering`, `link`, `lozenge`, `menu`, `modal-dialog`, `navigation-system`, `page-layout`, `popup`, `pragmatic-drag-and-drop` (+`-auto-scroll`, `-hitbox`, `-react-drop-indicator`), `primitives`, `profilecard`, `progress-bar`, `radio`, `renderer` ^128.9.5, `section-message`, `select`, `side-navigation`, `spinner`, `tabs`, `textarea`, `textfield`, `toggle`, `tokens`, `tooltip`, `user-picker`, `visually-hidden`.
**Not installed:** `@atlaskit/tree` (deprecated upstream), any `@atlaskit` charting package.
**`@tiptap/*`:** 18 packages installed and in use (see §2 RTE) — **banned in new files** per feature rule.
Charts: `recharts` ^3.5.1 (package.json:187), `react-resizable-panels` ^2.1.9 (package.json:184). No d3 (dropped in commit cda5ca3af per git log).

---

## 2. Test-tool UI element → tier match & verdict

| # | Element | Best match (evidence) | Tier | Verdict |
|---|---|---|---|---|
| 1 | **Table** | `JiraTable` — `src/components/shared/JiraTable/JiraTable.tsx` + cells/editors/flags barrel (`index.ts`); story `src/stories/audit-grade/01-JiraTable.stories.tsx`. Secondary: `shared/dynamic-table/DynamicTable.tsx` | Tier-1 | **USE EXISTING** — JiraTable is mandatory for work-item surfaces (CLAUDE.md JiraTable rule) |
| 2 | **Tree / folder view** | `src/components/test-cycles/AddTestCasesToCycleDialog/FolderTree.tsx` (163+ lines, hand-rolled chevron/Folder/FolderOpen, uses ads Lozenge + ui/button). Similar one-offs: `src/components/goals/GoalsTreeView.tsx`, `src/components/capacity/resource360/HierarchyTreeView.tsx`, `src/pages/work-tree/WorkTreePage.tsx`. No canonical shared tree; `@atlaskit/tree` NOT installed (deprecated upstream) | Tier-5 (existing hand-rolled one-offs) | **EXTEND** — promote/rebuild `FolderTree` as a shared canonical TestHub folder tree; needs approval since no ADS tree primitive exists. This is the single biggest component gap for a test-case repository UI |
| 3 | **Drawer** | `src/components/ads/CatalystDrawer.tsx` (wraps `@atlaskit/drawer`); pattern usage in `src/components/req-assist/ImportJiraDrawer.tsx`, `universal-work-view/UWVContext.tsx`; also `shared/DrawerPanel.tsx` | Tier-2 | **USE EXISTING** |
| 4 | **Modal** | `src/components/ads/Modal.tsx` (`@atlaskit/modal-dialog`); `shared/DangerConfirmModal.tsx` for destructive confirm; story `18-ConfirmDialogs.stories.tsx` | Tier-2 | **USE EXISTING** |
| 5 | **Tabs** | `@atlaskit/tabs` ^19.1.0, unbanned (memory: feedback_atlaskit_tabs_unbanned); already used in the test-case detail view `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx` (grep hit) | Tier-4 (direct, established pattern) | **USE EXISTING** — do not use `ui/tabs.tsx` (shadcn) in new files |
| 6 | **Lozenge** | `src/components/ads/Lozenge.tsx` (8.4K) + canonical status pill `src/components/shared/StatusLozenge/StatusLozenge.tsx` and `StatusLozengeDropdown.tsx` (17.7K, editable status) | Tier-1/2 | **USE EXISTING** — StatusLozenge for statuses, ads Lozenge otherwise |
| 7 | **Badge** | `@atlaskit/badge` ^18.6.0 installed; in use in `src/features/chat-v2/components/Sidebar/ChannelRow.tsx` etc. No ads wrapper | Tier-4 | **USE EXISTING** (direct import) |
| 8 | **Breadcrumbs** | `src/components/ads/Breadcrumbs.tsx` (9.9K); story `src/stories/components/Breadcrumbs.stories.tsx`; used by `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | Tier-2 | **USE EXISTING** |
| 9 | **Inline edit** | `src/components/ads/InlineEdit.tsx` + `ads/CatalystInlineEdit.tsx`; table-cell inline editors in `shared/JiraTable/editors.tsx` (76.2K); title editing `catalyst-detail-views/shared/sections/CatalystTitleEditor.tsx`; story `06-EditableFields.stories.tsx` | Tier-1/2 | **USE EXISTING** |
| 10 | **Rich text editor** | editor-core stack EXISTS: `shared/AtlaskitEditor.tsx`, `shared/rich-text/CatalystRichTextEditor.tsx`, `catalyst-detail-views/shared/sections/CatalystDescriptionSection.tsx` (all import `@atlaskit/editor-core`), renderer `shared/AtlaskitRenderer.tsx` + `@atlaskit/renderer`. ⚠️ tiptap stack ALSO exists and is banned for new files: `shared/jira-description-editor/JiraDescriptionEditor.tsx:3` (`import { useEditor, EditorContent } from '@tiptap/react'`) and `catalyst-detail-views/shared/sections/Description/extensions/*` (15+ tiptap extension files). `shared/CanonicalDescriptionField/` is plain-Textfield, NOT rich text (`DescriptionEditMode.tsx:3` imports `@atlaskit/textfield`) | Tier-1 (editor-core path) | **USE EXISTING** editor-core path (`AtlaskitEditor`/`CatalystRichTextEditor` + `AtlaskitRenderer`). HARD RULE: no new imports from `jira-description-editor` or tiptap extensions |
| 11 | **Date picker** | `@atlaskit/datetime-picker` ^17.7.0 via `src/components/ui/catalyst-date-picker.tsx` and canonical field `shared/CatalystDueDateField/`; JiraTable `makeDateEditCell` for in-table dates | Tier-1/2 | **USE EXISTING** |
| 12 | **Select** | `src/components/ads/Select.tsx` (`@atlaskit/select` ^18.2.0); people: `ads/ProfilePicker.tsx` (19.4K), `@atlaskit/user-picker` installed | Tier-2 | **USE EXISTING** |
| 13 | **Avatar** | `ads/Avatar.tsx`, `ads/UnassignedAvatar.tsx`, `shared/CatalystAvatar.tsx`, `shared/UserAvatar.tsx`; `@atlaskit/avatar`+`avatar-group`; story `17-Avatars.stories.tsx` | Tier-1/2 | **USE EXISTING** (icon contract: faces for people — memory `icon-contract-three-classes`) |
| 14 | **Progress bar** | `ads/ProgressBar.tsx` (`@atlaskit/progress-bar`), `ads/CatalystProgressTracker.tsx`, segmented `shared/WorkItemsProgressBar.tsx` (6.5K); story `10-ProgressTracker.stories.tsx` | Tier-1/2 | **USE EXISTING** |
| 15 | **Charts** | `recharts` ^3.5.1 (package.json:187), 34 files use it; TestHub-specific: `src/components/testhub/reports/charts/ReportChart.tsx` (6.9K) + 10 wired report bodies in `testhub/reports/bodies/` (DefectSummaryBody, PointsBurndownBody, TeamPerformanceBody, …) + legacy `src/components/reports/*Chart.tsx`. No @atlaskit chart package exists | Tier-1 (project convention) | **USE EXISTING** — extend `ReportChart` / reports-hub registry pattern (`testhub/reports/report-registry.ts`) |
| 16 | **Flags / toasts** | Canonical: `shared/JiraTable/flags.tsx` (`FlagsHost`, `showFlag`) over `@atlaskit/flag`; wrapper `ads/Flag.tsx`. Legacy sonner (`ui/sonner.tsx`) explicitly replaced on JiraTable surfaces per `flags.tsx` barrel comment | Tier-1 | **USE EXISTING** (`showFlag`; no sonner in new files) |
| 17 | **Empty state** | `ads/EmptyState.tsx` (4.6K, `@atlaskit/empty-state`); domain examples `src/components/empty-states/EmptyBoardState.tsx`, `EmptyTimelineState.tsx` | Tier-2 | **USE EXISTING** |
| 18 | **Split view** | Only `src/components/ui/resizable.tsx` (1.7K shadcn wrapper over `react-resizable-panels` ^2.1.9). Established master-detail alternatives: `shared/RightDetailsPanel.tsx`, `components/IssueDetailPane/`, `shared/DrawerPanel.tsx`. No ADS split-view primitive exists | Tier-4/5 | **EXTEND / needs decision** — for tree+list+detail TestHub layout either reuse `ui/resizable.tsx` (shadcn exception, needs approval) or compose drawer/detail-panel pattern |
| 19 | **Kanban board** | `src/components/kanban/PragmaticBoard.tsx` (59.3K) + `KanbanBoardShell.tsx`, `KanbanColumn.tsx`, `KanbanSwimlane.tsx`, `KanbanToolbar.tsx`, `adapters/`, `sources/` — built on `@atlaskit/pragmatic-drag-and-drop` | Tier-1 | **USE EXISTING** — add a TestHub source/adapter if an execution board is in scope; do not fork |
| 20 | **Timeline / gantt** | `src/components/shared/Timeline/TimelineView.tsx` (129.2K) — canonical, mounted by 6+ pages (`src/pages/project/TimelineView.tsx`, `src/pages/releasehub/ReleasesTimelineCanonical.tsx`, `src/pages/incidenthub/IncidentTimelinePage.tsx`, …). Also `releases/GanttBar.tsx`, `capacity-planner/CapacityPlannerGantt.tsx` | Tier-1 | **USE EXISTING** (TimelineView) if test-cycle timeline in scope |

---

## 3. Storybook audit-grade coverage (`src/stories/audit-grade/`)
22 story files present. Covered & relevant to TestHub: `00-ComponentRegistry` (60.4K), `01-JiraTable`, `02-CatalystViewBase`, `03-SidebarDetails`, `04-StatusTransition`, `05-BulkSelectionBar`, `06-EditableFields`, `10-ProgressTracker`, `11-FilterBar`, `12-AttachmentsSection`, `13-CommentsSection`, `15-Description`, `16-IssueTypeIcons`, `17-Avatars`, `18-ConfirmDialogs`, `19-MentionInput`, `20-AdsShowcase`.
**NOT covered in audit-grade:** tree/folder view, drawer, tabs, kanban board, timeline, charts, split view, breadcrumbs (breadcrumbs has a non-audit story at `src/stories/components/Breadcrumbs.stories.tsx`). New canonical FolderTree should ship with an audit-grade story.

## 4. Existing TestHub-adjacent components (reuse candidates)
- `src/components/testhub/`: `reports/` (registry + 10 bodies + ReportChart + export), `versioning/`, `AIGenerateTestCasesDialog.tsx` (25K)
- `src/components/test-cycles/`: `AddTestCasesToCycleDialog/` (FolderTree, TestCaseRow, selection hooks), `assignment-table/`, `calendar/`, `notifications/`
- `src/components/test-plans/dialogs/`
- `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx` and `test-cycle/` — canonical detail views already exist for test entities
- Legacy `src/components/reports/` (ReportBuilder, KPICard, pie/trend charts) — superseded by `testhub/reports` registry pattern

## 5. Gaps & decisions needed (for Plan Lock)
1. **Folder tree** — only Tier-5 one-offs exist; `@atlaskit/tree` not installed and deprecated upstream → build one shared canonical tree (approval required per hand-rolled ban).
2. **Split view** — `ui/resizable.tsx` is shadcn-tier; explicit approval needed to use it for the repository 3-pane layout, or compose RightDetailsPanel/Drawer pattern instead.
3. **RTE dual-stack drift** — tiptap (`jira-description-editor`, detail-views Description extensions) coexists with editor-core; new TestHub files must import editor-core stack only; ban check needed in review.
4. **Duplicate table wrappers** — `ads/DynamicTable.tsx` (2.8K) vs `shared/dynamic-table/DynamicTable.tsx` (24.7K); pick `shared/dynamic-table` if a non-JiraTable list is ever justified (default is JiraTable).
5. **Duplicate reports stacks** — `src/components/reports/` (legacy) vs `src/components/testhub/reports/` (registry, current); new reports go through the registry.

UNKNOWNs: none material; `catalyst-storybook` MCP unavailable this session (auth required) — coverage verified from `src/stories/` on disk instead.
