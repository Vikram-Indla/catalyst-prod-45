# Evidence — Project Hub Canonical Probe (VERIFIED 2026-07-04/05)

## Canonical components (import via @/components/ads barrel; deep imports ESLint-blocked)
- **JiraTable** src/components/shared/JiraTable/ (146KB) — types.ts header names TestHub as intended consumer; 67 importers. Cell factories (makeKeyCell/SummaryCell/StatusCell/AssigneeCell/PriorityCell/DateCell/TypeIconCell/LabelsCell/RowMenuCell) + inline editors. Props cover grouping, hierarchy (getRowDepth, 16px×depth), inline-create (renderGroupInlineRow, bottomSlot), bulk select, column picker, controlled sort, virtualization (enableVirtualization → react-virtual). Memory: gate expand slot on anyRowHasChildren.
- **FlagsHost/showFlag** (JiraTable/flags.tsx) — toasts; **BulkFooterBar**; **ToolbarMenuButton** (portal, works around atlaskit dropdown empty-portal bug).
- **CatalystViewBase** (46KB) + **CatalystDetailRouter** — detail shell (modal/panel/fullPage, resizable 2-col). Already wired: entityKind 'test_case'|'test_cycle'|'tm_defect' → CatalystViewTestCase/TestCycle/TmDefect exist.
- **CatalystSidebarDetails** (47KB) — canonical right rail w/ children slot; Story Points banned. **CatalystKeyDetails** — parent+priority block.
- **StatusLozengeDropdown** src/components/shared/StatusLozenge/ — THE status pill (CatalystStatusPill deleted). createPortal+rect anchor (NOT @atlaskit/popup — documented Popper failure). Colors via statusPalette.ts; workflow-aware (ReasonCaptureModal).
- **CreateStoryModal** src/components/workhub/create-story/ (1600+ lines) — defaultWorkType prop; isDefect='QA Bug' branch → tm_defects (line 837 resolveTmProjectId). Create-Test-Case flow should extend this pattern. AVOID duplicate legacy src/components/stories/CreateStoryModal.tsx.
- **ProfilePicker** (25KB) — sole people picker; renderTrigger escape hatch for cells.
- **CatalystDueDateField** — inline-edit date on @atlaskit/datetime-picker, overdue icon.
- Headers: **ProjectPageHeader** (breadcrumb, already used by RepositoryPage/TraceabilityPage), **HubPageHeader** (h1 no breadcrumb, 20/600, padding 16 16 4), **CatalystPageHeader** (52px fixed). **ProjectTabBar** (32px Jira-parity strip); @atlaskit/tabs v19 unbanned (CatalystViewTestCase already uses).
- **CatalystDrawer** (@atlaskit/drawer wrapper) + DrawerPanel/DrawerSection. **SectionMessage** (error+Retry pattern), **EmptyState** (+compact variant; errors → SectionMessage not EmptyState).
- Detail organs free via ViewBase: WatchersChip, CatalystActivitySection, CatalystDescriptionSection (ADF), CatalystParentLinker, CatalystQuickActions, CatalystConfigureDrawer (pinned fields). IssueHoverCard for traceability previews.

## Page patterns
1. **BacklogPage.atlaskit**: chrome band → H1 project name only → toolbar (search/CATY/filters) → JiraTable w/ groups + inline create. Query pattern: raw useQuery, `if (error) throw error` in queryFn (never {data}-only), staleTime 5min, enabled guards. resolveAvatarUrl chokepoint.
2. **ProjectAllWorkView**: ProjectPageHeader → ProjectTabBar → AllWorkToolbar (filters→JQL) → split WorkListPanel + lazy CatalystDetailRouter; responsive PanelLayout wide/medium/narrow (narrow hides sidebar). **useItemSelection hook** (src/hooks/useItemSelection.ts) for list→detail URL sync — "any new list-to-detail surface should reach for the hook". Serves project+product via adapter = reuse-not-fork exemplar.
3. **DashboardWidgetGrid** + widget-registry.ts: 12-col grid, spans from dashboard_widget_config; TestCasesOverviewWidget + TestCyclesProgressWidget ALREADY in registry.

## Tree situation (BIGGEST GAP)
- No canonical tree. No @atlaskit/tree, no react-arborist. 6+ bespoke trees.
- RepositoryPage FolderTreeView = hand-rolled recursive, NOT virtualized/DnD/keyboard — technically violates hand-rolled-UI ban.
- Best existing: src/components/hierarchy/WorkItemTree.tsx (keyboard nav, drag state, progress bars).
- Most compliant option: flattened-tree-in-JiraTable (hierarchy mode). Alternatives: promote WorkItemTree to shared/, or new build (needs Vikram approval).

## Other gaps
2. Virtualized tree — none. 3. Traceability matrix grid — none (current TraceabilityPage uses @atlaskit/dynamic-table = marked legacy). 4. Coverage graph — adapt DependenciesDiagram/@xyflow. 5. Execution runner surface — no canonical; nearest = ViewBase panel + JiraTable. 6. Tree DnD — no precedent (pragmatic dropTargetForElements per node = new ground). 7. Command bar — only IncidentCommandBar (single-hub); compose AllWorkToolbar-style instead. 8. Cycle Gantt — shared/Timeline/TimelineView.tsx exists but dnd-kit-era, check before reuse.

## Charting/DnD/Icons/Routing
- recharts 3.5.1 via ReportChart wrapper + adsChartTheme (ADS tokens only). Graphs: @xyflow 12.10.2 via DependenciesDiagram.
- DnD canonical: pragmatic-drag-and-drop (PragmaticBoard header: "Replaces @dnd-kit"). @dnd-kit residual, deprecated.
- Icons: JiraIssueTypeIcon (work items), ProjectIcon, CatalystAvatar/resolveAvatarUrl; TestHub uses WorkItemTypeIcon (also CreateStoryModal). Lucide only via @/lib/atlaskit-icons shim.
- routes.ts: testHubRoutes already slug-compliant (cycle/set/report/filter/defect builders). Folders have NO route (tree state component-local) — deep-linking folders needs folder slug + builder + useXBySlug.
- Token discipline: token() or var(--ds-*) only; density "comfortable = one notch up from Jira"; measured-and-locked headers. Some canonical files @ts-nocheck.
