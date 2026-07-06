# LANE 14 — Zero-Assumption Data Rendering Audit

**Feature Work ID:** CAT-AUDIT-FULLSWEEP-20260703-001
**Date:** 2026-07-03 · **Auditor:** Claude (Lane 14 agent) · **Scope:** `src/` (excl. dormant/graveyard/stories/tests)
**Rule:** CLAUDE.md "ZERO-ASSUMPTION DATA RENDERING" — never render a domain-specific default for unknown data. Unknown → nothing/dash. `type={r.parent_issue_type || 'Story'}` and `status || 'todo'` are the canonical banned patterns.

**Methodology.** Grep sweeps for `|| / ??` string-literal fallbacks on `issue_type`/`status`/`priority`/assignee fields, `|| new Date()` / `|| Date.now()` date fabrications, `|| 0` on rendered metrics, and "Unknown User"-style invented identities; then manual read of each candidate render path to separate **TRUE violations** (fabricated domain value shown to the user) from **benign defaults** (form initial state, CSS palette keys, internal sort keys, image border sizes). Only TRUE violations are logged as findings; benign classes are documented in the appendix.

Shared field values unless overridden: **Mode** = light+dark (text/data bug, theme-independent) · **CRE** = violates zero-assumption rendering rule · **ADS** = n/a (not a token issue) · **Typography** = n/a · **Performance** = n/a · **Accessibility** = misleading content is announced to screen readers as fact (same lie, spoken) · **Validation Required** = render the surface with a row whose field is NULL in DB; assert dash/empty instead of the fabricated value · **Regression Risk** = low-medium; components must tolerate `null` prop (conditional render), snapshot/text assertions may change.

---

## Findings

### CAT-AUDIT-1250 — Priority field renders "Medium" when priority is NULL
- **Category:** Zero-Assumption / Fabricated priority · **Severity:** High
- **Surface:** Issue detail sidebar (all Catalyst detail views) · **Route:** any issue detail modal/panel
- **Component:** `CatalystPriorityField` · **File Path:** `src/components/catalyst-detail-views/shared/sections/CatalystPriorityField.tsx`
- **Evidence:** `CatalystPriorityField.tsx:18` `PRIORITY_STYLES[issue?.priority ?? 'Medium']`; `:25` `{issue?.priority ?? 'Medium'}` rendered as the visible priority label + colored symbol.
- **Why:** An issue with no priority shows "Medium" with the Medium glyph — a factual lie on the most-read field of the detail view.
- **Recommended Fix:** `issue?.priority ?? null`; render `—` (`EmptyFieldDash`) and no symbol when null.
- **Suggested PR:** PR-ZA-01 (detail-view priority/type fallbacks).

### CAT-AUDIT-1251 — Defect view derives priority styling from assumed "Medium"
- **Category:** Zero-Assumption / Fabricated priority · **Severity:** Medium
- **Surface:** Defect detail view · **Route:** defect detail modal · **Component:** `CatalystViewDefect`
- **File Path:** `src/components/catalyst-detail-views/defect/CatalystViewDefect.tsx`
- **Evidence:** `CatalystViewDefect.tsx:46` `PRIORITY_STYLES[issue?.priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium`; also `:147/:188` `issue.issue_type || 'Bug'` (contextually true for the defect view — see appendix B4, logged here only for the priority half).
- **Why:** Null priority renders Medium color/symbol treatment.
- **Recommended Fix:** `const priorityStyle = issue?.priority ? PRIORITY_STYLES[issue.priority] ?? null : null;` conditional render.
- **Suggested PR:** PR-ZA-01.

### CAT-AUDIT-1252 — ParentLozenge assumes parent is an "Epic" (the literal banned pattern)
- **Category:** Zero-Assumption / Fabricated parent type · **Severity:** High
- **Surface:** Issue detail — parent linker · **Route:** any issue detail · **Component:** `CatalystParentLinker`
- **File Path:** `src/components/catalyst-detail-views/shared/sections/CatalystParentLinker.tsx`
- **Evidence:** `CatalystParentLinker.tsx:919` `parentType={(issue as any)?.parent_issue_type || "Epic"}`.
- **Why:** This is byte-for-byte the CLAUDE.md banned example (`parent_issue_type || 'Story'` family). A Story parent renders with an Epic lozenge/icon.
- **Recommended Fix:** `parentType={(issue as any)?.parent_issue_type ?? null}`; ParentLozenge renders key without type icon when null.
- **Suggested PR:** PR-ZA-02 (parent-type fallbacks).

### CAT-AUDIT-1253 — Breadcrumb parent icon defaults to Epic
- **Category:** Zero-Assumption / Fabricated parent type · **Severity:** High
- **Surface:** Ticket breadcrumbs (project work hub) · **Route:** project work hub ticket view · **Component:** `TicketBreadcrumbs`
- **File Path:** `src/modules/project-work-hub/components/TicketBreadcrumbs.tsx`
- **Evidence:** `TicketBreadcrumbs.tsx:109` and `:116` `iconBefore: <IssueIcon type={parentType || 'Epic'} size={14} />`.
- **Why:** Unknown parent type renders the purple Epic glyph next to the parent key — wrong icon presented as fact.
- **Recommended Fix:** `iconBefore: parentType ? <IssueIcon type={parentType} size={14} /> : undefined`.
- **Suggested PR:** PR-ZA-02.

### CAT-AUDIT-1254 — Subtask view assumes its parent is a Story
- **Category:** Zero-Assumption / Fabricated parent type · **Severity:** High
- **Surface:** Sub-task detail view · **Route:** sub-task detail modal · **Component:** `CatalystViewSubtask`
- **File Path:** `src/components/catalyst-detail-views/subtask/CatalystViewSubtask.tsx`
- **Evidence:** `CatalystViewSubtask.tsx:134` `parentType={parentIssue?.issue_type || 'Story'}` (sub-task parents can be Task/Bug/Epic).
- **Why:** Parent Task/Bug renders as Story.
- **Recommended Fix:** `parentType={parentIssue?.issue_type ?? null}` + conditional icon.
- **Suggested PR:** PR-ZA-02.

### CAT-AUDIT-1255 — Generic detail panel invents "Story"/"Task" type
- **Category:** Zero-Assumption / Fabricated issue type · **Severity:** High
- **Surface:** Shared detail panel (used across hubs) · **Route:** multiple · **Component:** `CatalystDetailPanel`
- **File Path:** `src/components/shared/CatalystDetailPanel.tsx`
- **Evidence:** `:227` `const effectiveType = issue?.issue_type || itemType || typeIconLabel || 'Story';` `:455` `parentIssueType={issue.issue_type || effectiveType || 'Story'}` `:595` `type={typeIconLabel || itemType || 'Task'}`.
- **Why:** Unknown type renders a Story/Task icon + label in a generic panel where the real type genuinely varies.
- **Recommended Fix:** resolve to `null` and conditionally render icon/label; pass `null` down instead of a literal.
- **Suggested PR:** PR-ZA-01.

### CAT-AUDIT-1256 — Work Manager task list prints "Task" for missing type
- **Category:** Zero-Assumption / Fabricated issue type · **Severity:** Medium
- **Surface:** Work Manager → Tasks table · **Route:** work-manager tasks · **Component:** `WorkManagerTasks`
- **File Path:** `src/components/work-manager/WorkManagerTasks.tsx`
- **Evidence:** `WorkManagerTasks.tsx:363` `{task.type || 'Task'}` rendered in the Type column.
- **Why:** Type column shows "Task" as data when the value is absent.
- **Recommended Fix:** `{task.type ?? '—'}` (or empty cell).
- **Suggested PR:** PR-ZA-03 (list/table type-status fallbacks).

### CAT-AUDIT-1257 — For-You theme list lozenge prints "To Do" for unknown status
- **Category:** Zero-Assumption / Fabricated status · **Severity:** High
- **Surface:** For You → Theme issue list · **Route:** for-you · **Component:** `ThemeIssueList`
- **File Path:** `src/components/for-you/atlaskit/ThemeIssueList.tsx`
- **Evidence:** `ThemeIssueList.tsx:196` `<StatusLozenge …>{row.status || 'To Do'}</StatusLozenge>`.
- **Why:** An item whose status failed to sync renders a confident grey "TO DO" lozenge — the user believes work hasn't started.
- **Recommended Fix:** `row.status ? <StatusLozenge…>{row.status}</StatusLozenge> : null` (or `—`).
- **Suggested PR:** PR-ZA-03.

### CAT-AUDIT-1258 — Resource360 detail panel fabricates "To Do" status labels
- **Category:** Zero-Assumption / Fabricated status · **Severity:** Medium
- **Surface:** Resource360 detail panel (item + siblings) · **Route:** resource360 · **Component:** `R360DetailPanel`
- **File Path:** `src/components/resource360/R360DetailPanel.tsx`
- **Evidence:** `:83` `label: name || 'To Do'`; `:125` `const statusLabel = item.status_name || item.status || 'To Do';` `:272` sibling `sib.status_name || sib.status || 'To Do'`; also `:284` `getJiraIcon(sib.item_type || 'Task')`.
- **Why:** Unknown status/type rendered as To Do / Task icon on both the focal item and sibling rows.
- **Recommended Fix:** null-through with conditional lozenge/icon.
- **Suggested PR:** PR-ZA-03.

### CAT-AUDIT-1259 — R360 drawers: type→Task icon and status→"To Do" lozenge cluster
- **Category:** Zero-Assumption / Fabricated type+status · **Severity:** Medium
- **Surface:** R360 profile drawer tabs · **Route:** r360 · **Component:** `R360WorkItemsTab`, `R360DrawerShared`, `R360WeeklyStoryTab`, `R360ProfileDrawer`, `r360Service`
- **File Path:** `src/components/r360/*`, `src/services/r360Service.ts`
- **Evidence:** `R360WorkItemsTab.tsx:147` `type={item.work_item_type || 'Task'}` / `:155` `status={item.status || item.status_category || 'To Do'}`; `R360DrawerShared.tsx:144,151,220`; `R360WeeklyStoryTab.tsx:117,123`; `R360ProfileDrawer.tsx:149`; `r360Service.ts:279` `item_type: item.issue_type || 'Task'`.
- **Why:** Every work item with missing type/status in the R360 drawers renders as a "Task" in "To Do" — 9 occurrences of the same lie.
- **Recommended Fix:** map `?? null` in service/adapters; conditional icon + lozenge in the three tabs.
- **Suggested PR:** PR-ZA-04 (R360 cluster).

### CAT-AUDIT-1260 — Ageing panel invents "To Do" + "Medium"
- **Category:** Zero-Assumption / Fabricated status+priority · **Severity:** Medium
- **Surface:** For You → Ageing panel · **Route:** for-you · **Component:** `AgeingPanel`
- **File Path:** `src/components/for-you/atlaskit/AgeingPanel.tsx`
- **Evidence:** `AgeingPanel.tsx:116` `status: a.status || 'To Do'`; `:118` `priority: a.priority || 'Medium'` — mapped straight into rendered rows.
- **Why:** Ageing rows show fabricated status/priority for stale items — exactly the rows where data quality is worst.
- **Recommended Fix:** `?? null` + dash render in row component.
- **Suggested PR:** PR-ZA-03.

### CAT-AUDIT-1261 — useForYouData fabricates priority/status/type across the whole For-You feed
- **Category:** Zero-Assumption / Data-layer fabrication · **Severity:** High
- **Surface:** For You feed (all sections) · **Route:** for-you · **Component:** `useForYouData` hook
- **File Path:** `src/hooks/useForYouData.ts`
- **Evidence:** `:269,299,329` `priority: row.priority || 'Medium'`; `:389` `priority: row.priority || row.severity || 'Medium'`; `:415` `const issueType = row.issue_type || 'Task';` `:417` `const priority = row.priority || 'Medium';` `:463` `status: row.status || 'To Do'`; `:854,925` `commentCreatedAt: row.jira_created_at || new Date().toISOString()`.
- **Why:** The hook is the single data source for the For-You surface; every fallback becomes a rendered chip/lozenge/timestamp. The `commentCreatedAt → now` fallback makes an undated comment display as "just now".
- **Recommended Fix:** all fields `?? null`; downstream renderers already handle chips conditionally or need dash branches; timestamps: hide relative-time when null.
- **Suggested PR:** PR-ZA-05 (For-You/home data layer).

### CAT-AUDIT-1262 — Home attention/briefing hooks: priority "Medium", updatedAt "now"
- **Category:** Zero-Assumption / Data-layer fabrication · **Severity:** High
- **Surface:** Home → attention items + project briefing · **Route:** home · **Component:** `useAttentionItems`, `useProjectBriefing`
- **File Path:** `src/components/home/hooks/useAttentionItems.ts`, `src/components/home/hooks/useProjectBriefing.ts`
- **Evidence:** `useAttentionItems.ts:60,94,128,159` `priority: item.priority || 'Medium'`; `useProjectBriefing.ts:109` `updatedAt: … || new Date().toISOString()` and `:111` `priority: item.priority || 'Medium'`.
- **Why:** Attention ranking and briefing cards present fabricated Medium priority; missing update timestamps display as "updated just now" — the opposite of the truth for stale items.
- **Recommended Fix:** `?? null`, conditional priority chip, omit relative-time when null.
- **Suggested PR:** PR-ZA-05.

### CAT-AUDIT-1263 — PersonalizedQueryProcessor: "0 days without update" and "Created 0d ago" lies
- **Category:** Zero-Assumption / Fabricated date-derived metric · **Severity:** High
- **Surface:** Home personalized query answers · **Route:** home (query console) · **Component:** `PersonalizedQueryProcessor`
- **File Path:** `src/components/home/PersonalizedQueryProcessor.ts`
- **Evidence:** `:182` `new Date(item.jira_updated_at || item.jira_created_at || Date.now())`; `:287` `` `${Math.ceil((Date.now() - new Date(item.jira_updated_at || Date.now()).getTime()) / 86400000)} days without update` ``; `:320` `` `Created …d ago · ${item.priority || 'Medium'} priority` ``; `:352,445,623` `item.priority || 'Medium'` in rendered reason strings.
- **Why:** An item with no `jira_updated_at` reports "0 days without update" — a stale-item query returns text asserting the item was just touched. Compound lie: fabricated recency + fabricated priority in one sentence.
- **Recommended Fix:** skip/omit the reason fragment when the source date is null (`item.jira_updated_at ? \`${days} days without update\` : 'no update date'` → render nothing).
- **Suggested PR:** PR-ZA-05.

### CAT-AUDIT-1264 — Incident modal prints "Medium" priority when absent
- **Category:** Zero-Assumption / Fabricated priority · **Severity:** Medium
- **Surface:** Incident modal · **Route:** incidents · **Component:** `IncidentModalMain`
- **File Path:** `src/components/incidents/modal/IncidentModalMain.tsx`
- **Evidence:** `IncidentModalMain.tsx:96` `{incident.priority?.charAt(0).toUpperCase() + incident.priority?.slice(1) || 'Medium'}` (also note: when priority is undefined the left side is `NaN`-ish string concat of `undefined`, masked by `|| 'Medium'`). Related: `src/components/incidents/IncidentDetailsPanel.tsx:55` `matrix[impact]?.[urgency] || 'medium'` for derived priority.
- **Why:** Incident priority — an operationally critical field — is fabricated as Medium.
- **Recommended Fix:** `incident.priority ? capitalize(incident.priority) : '—'`.
- **Suggested PR:** PR-ZA-06 (incidents/test-management).

### CAT-AUDIT-1265 — Knowledge Assist detail prints "Medium" for missing priority label
- **Category:** Zero-Assumption / Fabricated priority · **Severity:** Medium
- **Surface:** Knowledge Assist item detail panel · **Route:** knowledge-assist · **Component:** `KAItemDetailPanel`
- **File Path:** `src/components/knowledge-assist/KAItemDetailPanel.tsx`
- **Evidence:** `KAItemDetailPanel.tsx:88` `{label || 'Medium'}` rendered as the priority value.
- **Why:** Same fabricated-Medium pattern.
- **Recommended Fix:** `{label ?? '—'}`.
- **Suggested PR:** PR-ZA-06.

### CAT-AUDIT-1266 — Test-case surfaces: priority "Medium", creator "Unknown"
- **Category:** Zero-Assumption / Fabricated priority + invented identity · **Severity:** Medium
- **Surface:** Test case detail (header + properties) · **Route:** releases → test cases · **Component:** `TestCaseHeader`, `TestCasePropertiesPanel`, cycle utilities
- **File Path:** `src/components/releases/test-case-detail/*`, `src/components/test-cycles/AddTestCasesToCycleDialog/*`
- **Evidence:** `TestCaseHeader.tsx:107` and `TestCasePropertiesPanel.tsx:158` `testCase.priority?.name || 'Medium'`; `TestCasePropertiesPanel.tsx:181` `created_by_profile?.full_name || 'Unknown'` rendered as creator name; `AddTestCasesToCycleDialog/utils.ts:92,109,155` and `hooks/useTestCaseSelection.ts:109` `|| 'medium'` feeding grouping counts shown in UI.
- **Why:** Priority chips and cycle priority-breakdown counts fabricate Medium; creator shows "Unknown" styled as a real name.
- **Recommended Fix:** `?? null` + dash; group null priorities under an explicit "No priority" bucket, not "medium".
- **Suggested PR:** PR-ZA-06.

### CAT-AUDIT-1267 — Workstream row shows today's date as "Created" when created_at is NULL
- **Category:** Zero-Assumption / Fabricated date · **Severity:** High
- **Surface:** Tasks → Workstreams row view · **Route:** tasks/workstreams · **Component:** `WorkstreamRowView`
- **File Path:** `src/modules/tasks/components/workstreams/WorkstreamRowView.tsx`
- **Evidence:** `WorkstreamRowView.tsx:173` `<span>Created {formatDate(workstream.created_at || new Date().toISOString())}</span>`.
- **Why:** A workstream with no creation date renders "Created <today>" — presenting "now" as a stored fact. Changes on every page load.
- **Recommended Fix:** `workstream.created_at ? <span>Created {formatDate(workstream.created_at)}</span> : null`.
- **Suggested PR:** PR-ZA-07 (date fabrications).

### CAT-AUDIT-1268 — Release compare fabricates target date = today
- **Category:** Zero-Assumption / Fabricated date · **Severity:** High
- **Surface:** Release compare view · **Route:** releases/compare · **Component:** `useCompareReleases`
- **File Path:** `src/features/release-compare/hooks/useCompareReleases.ts`
- **Evidence:** `useCompareReleases.ts:136` `targetDate: release.target_date || new Date().toISOString()` — feeds rendered target date and daysRemaining math.
- **Why:** A release with no target date displays today as its target and "0 days remaining" — reads as an at-risk release. Compound: `daysRemaining` computed from the fabricated date.
- **Recommended Fix:** `targetDate: release.target_date ?? null`; render `—` and skip daysRemaining when null.
- **Suggested PR:** PR-ZA-07.

### CAT-AUDIT-1269 — Contract Horizon invents vendor "Unknown" and contract start = today
- **Category:** Zero-Assumption / Fabricated date + label · **Severity:** High
- **Surface:** Contract Horizon view + resource drawer · **Route:** contract-horizon · **Component:** `ContractHorizonView`, `ResourceDrawer`
- **File Path:** `src/components/contract-horizon/ContractHorizonView.tsx`, `src/components/contract-horizon/ResourceDrawer.tsx`
- **Evidence:** `ContractHorizonView.tsx:44` `vendor: resource.vendor || 'Unknown'`; `:47` `contractStart: resource.contractStart || new Date().toISOString().split('T')[0]`; `ResourceDrawer.tsx:131,155` `resource.country || 'Unknown'` rendered as country value/flag label.
- **Why:** Contract timeline bars start at "today" for resources with unknown start dates — a fabricated contract term on a surface used for renewal decisions.
- **Recommended Fix:** `?? null`; exclude bars/render dash when start unknown; country/vendor `—`.
- **Suggested PR:** PR-ZA-07.

### CAT-AUDIT-1270 — Project list items stamp created/updated = now
- **Category:** Zero-Assumption / Fabricated date · **Severity:** Medium
- **Surface:** Project list rows (created/updated columns, sorting) · **Route:** project lists · **Component:** `useProjectListItems`
- **File Path:** `src/hooks/useProjectListItems.ts`
- **Evidence:** `useProjectListItems.ts:138` `createdAt: row.jira_created_at ?? new Date().toISOString()`; `:139` `updatedAt: row.jira_updated_at ?? new Date().toISOString()`. Same pattern: `src/hooks/useGlobalSearch.ts:20,36,52` (`viewed_at` → now), `src/lib/r360/fetchItemDetail.ts:82` (`assignedAt` → now), `src/hooks/useDirectFromSync.ts:140`, `src/modules/project-work-hub/hooks/useWorkItems.ts:90-91,107-108`, `src/services/workhub.ts:419`, `src/hooks/test-cycles/useAssignmentTable.ts:200`, `src/modules/incidents/api/incidentApi.ts:217`, `src/modules/incidents/analytics/hooks/useIncidentDetail.ts:69`, `src/modules/tasks/PlannerPage.tsx:276`, `src/spaces/services/SupabaseProjectService.ts:100`.
- **Why:** Items with missing sync timestamps render/sort as "updated just now", polluting recency-sorted lists and relative-time labels; value changes every render cycle.
- **Recommended Fix:** type fields `string | null`, sort nulls last, render `—`.
- **Suggested PR:** PR-ZA-07.

### CAT-AUDIT-1271 — fetchItemDetail fabricates statusCategory "To Do"
- **Category:** Zero-Assumption / Fabricated status · **Severity:** Medium
- **Surface:** R360 item detail fetch · **Route:** r360 · **Component:** `fetchItemDetail`
- **File Path:** `src/lib/r360/fetchItemDetail.ts`
- **Evidence:** `fetchItemDetail.ts:76` `statusCategory: data.status_category ?? 'To Do'` (drives lozenge appearance/label downstream).
- **Why:** Unknown workflow category renders as not-started.
- **Recommended Fix:** `?? null` + neutral/absent lozenge.
- **Suggested PR:** PR-ZA-04.

### CAT-AUDIT-1272 — Board card renders "0 SP" when story points are NULL
- **Category:** Zero-Assumption / Fabricated metric · **Severity:** Medium
- **Surface:** Board feature cards · **Route:** board · **Component:** `BoardCard`
- **File Path:** `src/components/board/BoardCard.tsx`
- **Evidence:** `BoardCard.tsx:130` `<span>{feature.total_story_points || 0} SP</span>`.
- **Why:** Unestimated features display "0 SP" — indistinguishable from a genuinely-zero estimate; misleads capacity conversations.
- **Recommended Fix:** `feature.total_story_points != null ? \`${feature.total_story_points} SP\` : '— SP'` (or hide).
- **Suggested PR:** PR-ZA-08 (numeric fabrications).

### CAT-AUDIT-1273 — Estimate points rendered as "0 pts" across legacy pages
- **Category:** Zero-Assumption / Fabricated metric · **Severity:** Medium
- **Surface:** Roadmaps / WorkSpend / Features pages · **Route:** /roadmaps, /work-spend, /features · **Component:** multiple
- **File Path:** `src/pages/Roadmaps.tsx`, `src/pages/WorkSpendGrid.tsx`, `src/pages/Features.tsx`
- **Evidence:** `Roadmaps.tsx:475` `{feature.estimate_points || 0}`; `WorkSpendGrid.tsx:301` `{feature.estimate_points || 0} pts` (and `:119` fed into spend math); `Features.tsx:95,208` `estimate_points || 0` → "0 pts".
- **Why:** Null estimate rendered as literal zero, and in WorkSpendGrid the fabricated 0 flows into cost/spend arithmetic.
- **Recommended Fix:** `?? null`, render `—`; exclude nulls from spend math or flag "unestimated".
- **Suggested PR:** PR-ZA-08.

### CAT-AUDIT-1274 — Progress bars render 0% when progress is unknown
- **Category:** Zero-Assumption / Fabricated metric · **Severity:** Medium
- **Surface:** Features list, Stories grid, Strategy alignment, Goals views · **Route:** features/stories/strategy/goals · **Component:** `FeaturesListView`, `StoriesGrid`, `ThemeAlignmentView`, `Goals*`
- **File Path:** `src/components/features/FeaturesListView.tsx`, `src/components/stories/StoriesGrid.tsx`, `src/components/strategy/themes/ThemeAlignmentView.tsx`, `src/components/goals/*`
- **Evidence:** `FeaturesListView.tsx:246-247` `<Progress value={feature.progress_pct || 0}…/>` + `{feature.progress_pct || 0}%`; `StoriesGrid.tsx:94-97`; `ThemeAlignmentView.tsx:907-1011` (7 occurrences `t.progress || 0` rendered as % + bar color from `getProgressColor(0)`); `GoalDetailDrawer.tsx:393`, `GoalsListView.tsx:118`, `GoalsTreeView.tsx:101,338` (also classifies unknown-progress goals as `off_track`), `GoalsHeatmapView.tsx:47,137`, `GoalsStatsStrip.tsx:48-50`.
- **Why:** "Progress unknown" and "progress = 0%" are rendered identically; GoalsTreeView goes further and derives an `off_track` health verdict from fabricated zeros.
- **Recommended Fix:** `progress ?? null`; render empty/dash bar state; exclude nulls from averages and health classification.
- **Suggested PR:** PR-ZA-08.

### CAT-AUDIT-1275 — Project metrics count unknown-status items as "todo"
- **Category:** Zero-Assumption / Fabricated metric input · **Severity:** Medium
- **Surface:** Project work hub metrics · **Route:** project-work-hub · **Component:** `useProjectMetrics`, `statusMapping`
- **File Path:** `src/modules/project-work-hub/hooks/useProjectMetrics.ts`, `src/modules/project-work-hub/utils/statusMapping.ts`
- **Evidence:** `useProjectMetrics.ts:106` `const status = item.status || 'todo';` (bucketed into displayed counts); `statusMapping.ts:80` `return mapped || 'todo'; // Default to todo if not found`.
- **Why:** Items with unmapped/missing status inflate the "To Do" count in rendered metrics — fabricated aggregate.
- **Recommended Fix:** bucket nulls into an explicit `unknown` bucket (rendered as "No status") or exclude with a footnote count.
- **Suggested PR:** PR-ZA-08.

### CAT-AUDIT-1276 — Dependency matrix labels unknown dependency type as "Epic"
- **Category:** Zero-Assumption / Fabricated type · **Severity:** Medium
- **Surface:** Dependency matrix · **Route:** dependencies · **Component:** `DependencyMatrix`
- **File Path:** `src/components/dependencies/DependencyMatrix.tsx`
- **Evidence:** `DependencyMatrix.tsx:283` `… : dep.type || 'Epic'` rendered as the dependency's type label.
- **Why:** Unknown type displayed as Epic.
- **Recommended Fix:** `dep.type ?? '—'`.
- **Suggested PR:** PR-ZA-03.

### CAT-AUDIT-1277 — Timeline surfaces default unknown types to "Story"
- **Category:** Zero-Assumption / Fabricated type · **Severity:** Medium
- **Surface:** Shared Timeline + Project Hub timeline · **Route:** timeline views · **Component:** `SidebarRow`, `TimelineView`, `ProjectHubTimelinePage`, `useProjectHubTimeline`
- **File Path:** `src/components/shared/Timeline/SidebarRow.tsx`, `src/components/shared/Timeline/TimelineView.tsx`, `src/pages/project-hub/timeline/ProjectHubTimelinePage.tsx`, `src/hooks/useProjectHubTimeline.ts`
- **Evidence:** `SidebarRow.tsx:350` `childTypesOverride?.[0] ?? "Story"`; `TimelineView.tsx:219` `displayType: issue.issueType ?? "Story"`; `ProjectHubTimelinePage.tsx:32` `(issue.issueType ?? 'Story').toLowerCase()`; `useProjectHubTimeline.ts:73` `issueType: row.issue_type ?? 'Task'`.
- **Why:** Timeline rows/panels render Story/Task icons for unknown types.
- **Recommended Fix:** null-through; icon only when type known.
- **Suggested PR:** PR-ZA-03.

### CAT-AUDIT-1278 — Chat sidebar renders Task icon for unknown ticket type
- **Category:** Zero-Assumption / Fabricated type · **Severity:** Low
- **Surface:** Chat sidebar ticket chips · **Route:** chat · **Component:** `ChatSidebar`
- **File Path:** `src/components/layout/ChatSidebar.tsx`
- **Evidence:** `ChatSidebar.tsx:84` `<JiraIssueTypeIcon type={(c.ticketType as any) ?? 'Task'} size={14} />`.
- **Why:** Unknown type shows Task glyph + "Task" tooltip.
- **Recommended Fix:** `c.ticketType ? <JiraIssueTypeIcon…/> : null`.
- **Suggested PR:** PR-ZA-03.

### CAT-AUDIT-1279 — "Unknown User" / "Unknown" rendered as author names (cluster)
- **Category:** Zero-Assumption / Invented identity · **Severity:** Medium
- **Surface:** Test cycles, version history, activity feeds, chat, releases · **Route:** multiple · **Component:** cluster
- **File Path:** representative: `src/features/test-cycles/components/TesterAssignmentGrid.tsx`, `src/components/releases/test-case-detail/TestCaseVersionHistory.tsx`, `src/components/catalyst-detail-views/shared/sections/CatalystActivitySection.tsx`
- **Evidence:** `TesterAssignmentGrid.tsx:142` `{assignment.user_name || 'Unknown User'}` styled as a real assignee; `TestCaseVersionHistory.tsx:123` `changed_by_profile?.full_name || 'Unknown User'`; `CatalystActivitySection.tsx:171`, `BrActivitySection.tsx:175,243`, `WorkLogPanel.tsx:134`, `ReleaseSidePanel.tsx:359,965`, plus ~250 further `|| 'Unknown'` occurrences (appendix). Note: many are last-resort chains (`full_name || email || 'Unknown'`) which is closer to an honest "we can't resolve this profile" — logged as one Medium cluster, not per-site, because the fallback text is at least not a *plausible* fabricated value. The fix is still a proper empty/deleted-user state (ADS avatar + "Former user"/dash) rather than a name-shaped string.
- **Recommended Fix:** shared `renderPersonOrDash(profile)` helper; anonymous `@atlaskit/avatar` with no name text when unresolvable.
- **Suggested PR:** PR-ZA-09 (identity fallbacks).

### CAT-AUDIT-1280 — Planner task modal fabricates an activity event ("Task created · Unknown")
- **Category:** Zero-Assumption / Fabricated activity record · **Severity:** Medium
- **Surface:** Planner task detail modal — activity tab · **Route:** planner · **Component:** `TaskDetailModal`
- **File Path:** `src/components/planner/task-modal/TaskDetailModal.tsx`
- **Evidence:** `TaskDetailModal.tsx:240` `{ id: '1', action: 'Task created', author: 'System', timestamp: editedTask.createdAt || 'Unknown' }` — a hardcoded synthetic history entry with a literal `'Unknown'` timestamp string.
- **Why:** Renders an invented audit-trail row; timestamp "Unknown" passed where a date is expected.
- **Recommended Fix:** render activity only from real records; empty state otherwise.
- **Suggested PR:** PR-ZA-09.

### CAT-AUDIT-1281 — Issue view data layer: priority ?? 'Medium' into rendered priority control
- **Category:** Zero-Assumption / Fabricated priority · **Severity:** Medium
- **Surface:** WorkHub issue view · **Route:** workhub issue view · **Component:** `useIssueViewData`, `IssueContentView`
- **File Path:** `src/hooks/workhub/useIssueViewData.ts`, `src/components/workhub/issue-view/IssueContentView.tsx`
- **Evidence:** `useIssueViewData.ts:29` `priority: … ?? 'Medium'`; `IssueContentView.tsx:583` `currentPriority={item.priority ?? 'Medium'}`.
- **Why:** The priority selector displays Medium as the current value for an unprioritized issue; saving any other field can persist the fabricated value.
- **Recommended Fix:** `?? null`; picker shows placeholder "No priority".
- **Suggested PR:** PR-ZA-01.

### CAT-AUDIT-1282 — BR health hooks fabricate type/status for health computation + display
- **Category:** Zero-Assumption / Fabricated metric input · **Severity:** Medium
- **Surface:** Business request health chips · **Route:** BR surfaces · **Component:** `useBusinessRequestHealth`, `useBatchBusinessRequestHealth`, `useReleaseItems`, `useAgeingItems`
- **File Path:** `src/hooks/useBusinessRequestHealth.ts`, `src/hooks/useBatchBusinessRequestHealth.ts`, `src/components/project-hub/dashboard/release-health-uwv/useReleaseItems.ts`, `src/hooks/useAgeingItems.ts`
- **Evidence:** `useBusinessRequestHealth.ts:64,66` / `useBatchBusinessRequestHealth.ts:46,48` `issue_type: r.issue_type ?? 'Story'`, `status: r.status ?? 'todo'`; `useReleaseItems.ts:36` `issueType: r.issue_type ?? 'Story'`; `useAgeingItems.ts:184,188` `issue_type || 'Task'`, `priority || 'medium'`.
- **Why:** Health scores and drill-down rows treat unknown-status items as not-started Stories — skews health verdicts users act on.
- **Recommended Fix:** `?? null` and have the health calculator treat null status as "unscorable" rather than todo.
- **Suggested PR:** PR-ZA-05.

---

## Occurrence Appendix — clusters & totals

Grep totals (src/, excluding dormant/graveyard/stories/tests; raw pattern hits, before benign classification):

| Cluster | Pattern family | Raw hits | TRUE-violation share (assessed) |
|---|---|---|---|
| A. Issue-type fallbacks | `(\|\| / ??) 'Story'\|'Task'\|'Epic'\|'Bug'\|'Sub-task'` | **79** | ~60% (rest: type-specific views B4, create-form defaults B1) |
| B. Status fallbacks | `(\|\| / ??) 'todo'\|'To Do'\|'In Progress'\|'Done'` | **54** | ~55% (rest: create defaults, palette keys) |
| C. Priority/severity fallbacks | `(\|\| / ??) 'Medium'\|'medium'\|'low'\|'P3'` (excl. image borderSize) | **107** | ~70% |
| D. Date-now fabrications | `(\|\| / ??) new Date()\|Date.now()` | **37** | ~80% |
| E. Identity fallbacks | `(\|\| / ??) 'Unknown'\|'Unknown User'` | **262** | cluster-logged (CAT-AUDIT-1279) |
| F. "Unassigned" fallbacks | `(\|\| / ??) 'Unassigned'` | **127** | mostly benign (B5) |
| G. Numeric `\|\| 0` on points/progress | sampled | 40+ sampled | rendered-metric subset logged (1272–1275) |

**Total raw occurrences across swept clusters: 666+** (A–F = 666 grep hits; G sampled, not exhaustively counted).

### Benign classes (checked, NOT logged as violations)
- **B1 — Create-form initial state:** `StoryDialog.tsx:22`, `SubtaskDialog.tsx:22`, `CreateStoryModal.tsx:650,1057`, `InlineCreateCard.tsx:226,558`, `IssueActionDialogs.tsx:410,573-574`, `ThemeCreateModal.tsx:58`, `WorkflowEditorPage.tsx:362` — a default selection in a *create/edit form control* is a UX default, not a rendered data claim.
- **B2 — CSS/palette default keys:** `statusPalette.ts` `default:` entries resolve unknown appearance to **neutral** tokens (`var(--ds-background-neutral)` / `var(--ds-text)`) — compliant "render nothing specific" behavior.
- **B3 — Image border sizes:** all `borderSize ?? 'medium'` hits in `Description/` rich-text extensions are Tiptap image attributes, not domain data.
- **B4 — Type-specific detail views:** `CatalystViewEpic ‖ 'Epic'`, `CatalystViewTask ‖ 'Task'`, `CatalystViewStory ‖ 'Story'`, `CatalystViewDefect ‖ 'Bug'` (itemType props only) — the fallback matches the view's guaranteed type; tautological, not a lie. (Their *parent*-type and *priority* fallbacks ARE violations — logged above.)
- **B5 — "Unassigned" for assignee:** Jira's own canonical rendering for an empty assignee field; treated as a legitimate label, not fabrication (e.g. `TaskCard.tsx:223`, `exportDefects.ts:33`, `ProfilePicker.tsx:274-304`).
- **B6 — Aggregation sums `(x || 0)` inside reduce:** e.g. `ScrumBoardPage.tsx`, `useResource360Data.ts:287` — treating null points as 0 in a *sum* is standard practice, though "N unestimated" annotation would be better; not logged.
- **B7 — Mutation/write-path mappings** (`useKanbanMutations.ts:345`) and icon-resolver internal fallback (`jira-issue-type-icons.tsx:306-308` falls back to task glyph but preserves the real label) — noted; the resolver preserving `label: issueType || 'Unknown'` keeps the tooltip honest.
- **Caution:** `WorkItemIcon.tsx:25` doc comment *recommends* `issue.issue_type ?? 'Task'` and `normalizeIconType` (`:84`) hardcodes `?? 'Task'` — canonical guidance actively propagates the banned pattern; fix the doc + shim in PR-ZA-03.

### Suggested PR slicing
| PR | Scope | Findings |
|---|---|---|
| PR-ZA-01 | Detail-view priority/type fallbacks | 1250, 1251, 1255, 1281 |
| PR-ZA-02 | Parent-type fallbacks | 1252, 1253, 1254 |
| PR-ZA-03 | List/table/timeline type+status fallbacks + WorkItemIcon shim/doc | 1256, 1257, 1260, 1276, 1277, 1278 |
| PR-ZA-04 | R360 cluster | 1258, 1259, 1271 |
| PR-ZA-05 | For-You/home/health data layer | 1261, 1262, 1263, 1282 |
| PR-ZA-06 | Incidents + test management | 1264, 1265, 1266 |
| PR-ZA-07 | Date fabrications | 1267, 1268, 1269, 1270 |
| PR-ZA-08 | Numeric/progress fabrications | 1272, 1273, 1274, 1275 |
| PR-ZA-09 | Identity fallbacks | 1279, 1280 |

---

## Lane Summary

- **33 findings logged (CAT-AUDIT-1250 … 1282)** — every one a TRUE violation: a fabricated domain value (type/status/priority/date/metric/identity) rendered to the user as fact.
- **Severity mix:** 12 High, 19 Medium, 2 Low. **Raw occurrence total across pattern clusters: 666+** (79 type, 54 status, 107 priority, 37 date-now, 262 unknown-identity, 127 unassigned-mostly-benign, 40+ numeric sampled).
- **Worst offenders:** the CLAUDE.md banned pattern appears verbatim in `CatalystParentLinker.tsx:919` (`parent_issue_type || "Epic"`); `PersonalizedQueryProcessor.ts` compounds lies ("0 days without update · Medium priority"); `useForYouData.ts` fabricates priority/status/type/timestamps for the entire For-You feed; `useCompareReleases.ts` invents release target dates (= today) and derives daysRemaining from them; `GoalsTreeView.tsx` classifies goals `off_track` from fabricated 0% progress.
- **Systemic root cause:** data-mapping hooks coerce `null → literal` at fetch time, so downstream components never see null and can't render honestly. The canonical `WorkItemIcon` shim documentation itself recommends `?? 'Task'`.
- **Recommended remediation pattern (uniform):** `field ?? null` at the mapping layer + conditional render (`value ? <Chip/> : '—'`) at the presentation layer; explicit "unknown" buckets in aggregations; never `|| new Date()` for display timestamps.
- One positive control found: `BrSidebarAdapter.tsx:31` documents a prior fix ("was `br.urgency ?? 'Medium'` — silently lied") — proof the codebase knows the correct pattern; these findings extend it.
