# LANE 13 — Accessibility (Static Audit)

**Audit:** CAT-AUDIT-FULLSWEEP-20260703-001 · **Lane:** 13 · **Date:** 2026-07-03
**Method:** Read-only static scan of `src/` (2,892 `.tsx/.jsx` files; excluded `modules-dormant/`, graveyard, `*.stories.*`, `*.test.*`, `__tests__/`, `src/test/`, `src/stories/`). Scanner: multi-line JSX opening-tag parser (scratchpad `a11y-scan.cjs`) + targeted greps. No server, no browser, no builds.

**Tooling note (finding CAT-AUDIT-1150):** `package.json:19` defines `"lint:accessibility": "node scripts/audit-accessibility.cjs"` but **`scripts/audit-accessibility.cjs` does not exist** — `npm run lint:accessibility` fails with `MODULE_NOT_FOUND`. The prescribed scanner could not be run; this lane's numbers come from the scratchpad scanner instead.

---

## Findings

### CAT-AUDIT-1150 — `lint:accessibility` script is missing (broken tooling)
- **Category:** Accessibility / Tooling
- **Severity:** High
- **Surface:** Repo tooling (CI / pre-commit ecosystem)
- **Route:** n/a
- **Component:** n/a
- **File Path:** `package.json:19` (references non-existent `scripts/audit-accessibility.cjs`)
- **Mode:** n/a
- **CRE:** n/a · **ADS:** n/a · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** Gate absent — no automated a11y regression signal at all
- **Evidence:** `npm run lint:accessibility` → `Error: Cannot find module '.../scripts/audit-accessibility.cjs'` (MODULE_NOT_FOUND, exit non-zero). `ls scripts/` confirms no `audit-accessibility*` file.
- **Why:** A referenced-but-missing lint script silently guarantees zero accessibility enforcement; anyone wiring it into CI gets a hard failure or (worse) skips it.
- **Recommended Fix:** Either restore/author `scripts/audit-accessibility.cjs` (the scratchpad scanner in this lane is a working starting point) or remove the dead npm script.
- **Regression Risk:** None (tooling only).
- **Validation Required:** `npm run lint:accessibility` exits 0 with a report.
- **Suggested PR:** PR11

### CAT-AUDIT-1151 — 683 clickable `<div>/<span>` without keyboard affordance
- **Category:** Accessibility / Keyboard operability
- **Severity:** Critical (top defect class by volume)
- **Surface:** App-wide — worst: Task10, Project Work Hub, WorkHub, Releases, Tasks
- **Route:** multiple (module-wide)
- **Component:** multiple (429 distinct files)
- **File Path:** clusters below; samples: `src/modules/task10/components/landing/T10LandingPageV3.tsx:88`, `src/modules/project-work-hub/components/SubtasksPanel/SubtasksPanelV2.tsx:559`, `src/components/workhub/allwork/AllWorkSplitView.tsx:273`, `src/components/releases/ReleaseCard.tsx:19`, `src/components/releases/GanttBar.tsx:20`
- **Mode:** both
- **CRE:** n/a · **ADS:** overlaps hand-rolled-UI ban (many are hand-rolled cards/rows) · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 2.1.1 (Keyboard), 4.1.2 (Name/Role/Value) — element has `onClick` but no `role`, no `tabIndex`, no `onKeyDown/Press/Up`
- **Evidence:** Scanner matched 683 opening tags of `div|span` containing `onClick=` with none of `role/tabIndex/onKey*`. **Caveat (honest):** count includes some `onClick={e => e.stopPropagation()}` wrapper divs (e.g. `src/components/workhub/allwork/AllWorkTable.tsx:317` wraps a checkbox purely to stop row-click propagation — benign). Wrappers are a minority; row/card/chip click targets dominate the clusters.
- **Why:** These targets are invisible to keyboard and screen-reader users — cannot be focused, cannot be activated, announce as plain text.
- **Recommended Fix:** Replace with `<button>` / Atlaskit `Pressable`/`Button` where semantic; for rows, add `role="button" tabIndex={0}` + Enter/Space handler or move activation onto an inner real button. Triage stopPropagation wrappers out first.
- **Regression Risk:** Medium — converting divs to buttons alters default styling/event bubbling; do per-surface slices with screenshot signoff.
- **Validation Required:** Keyboard-only walkthrough per surface (Tab reaches target, Enter/Space activates); re-run scanner, count must drop.
- **Suggested PR:** PR11 (split per cluster)

### CAT-AUDIT-1152 — `role="button"` without keyboard handler (9)
- **Category:** Accessibility / ARIA misuse
- **Severity:** High
- **Surface:** Capacity analytics, filters, ProjectHub dashboard, chat-v2, detail views
- **Route:** multiple
- **Component:** CapacityAnalyticsView, CanonicalFilter, GadgetSettingsPanel, ActivityRow, CatalystParentLinker
- **File Path:** `src/components/capacity/CapacityAnalyticsView/CapacityAnalyticsView.tsx:382,649,672` · `src/components/catalyst-detail-views/shared/sections/CatalystParentLinker.tsx:193` · `src/components/filters/CanonicalFilter.tsx:2379` · `src/components/project-hub/dashboard/GadgetSettingsPanel.tsx:809,972` · `src/features/chat-v2/components/Activity/ActivityRow.tsx:312,417`
- **Mode:** both
- **CRE:** n/a · **ADS:** n/a · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 2.1.1 — promises button semantics to AT but Enter/Space do nothing
- **Evidence:** e.g. `CatalystParentLinker.tsx:193`: `<span role="button" onClick={...}>` — no `onKeyDown`, no `tabIndex` visible in tag.
- **Why:** Worse than a bare div: screen reader announces "button", user presses Enter, nothing happens — a trust-breaking lie to AT.
- **Recommended Fix:** Add `tabIndex={0}` + Enter/Space `onKeyDown`, or swap to a real `<button>`.
- **Regression Risk:** Low — additive handlers.
- **Validation Required:** Keyboard activation probe on each of the 9 sites.
- **Suggested PR:** PR11

### CAT-AUDIT-1153 — 28 icon-only `<button>` without accessible name
- **Category:** Accessibility / Name, Role, Value
- **Severity:** High
- **Surface:** Admin pages (worst), boards, detail views, incidents
- **Route:** `/admin/*` and multiple
- **Component:** CapacityDepartments, ResourceAssignments, BulkEditModal, UserDrawer, WorkflowTypePanel, BoardCard, CatalystParentLinker, CatalystQuickActions, IncidentTimeline
- **File Path:** `src/pages/admin/CapacityDepartments.tsx:162,179,188` · `src/pages/admin/ResourceAssignments.tsx:393,402` · `src/pages/admin/components/BulkEditModal.tsx:96` · `src/pages/admin/components/UserDrawer.tsx:342` · `src/components/admin/WorkflowTypePanel.tsx:195,277` · `src/components/boards/BoardCard.tsx:129` · `src/components/catalyst-detail-views/shared/sections/CatalystParentLinker.tsx:543,1276` · `src/components/incidents/IncidentTimeline.tsx:184` (+15 more, appendix)
- **Mode:** both
- **CRE:** n/a · **ADS:** should be `@atlaskit/button` IconButton (which *requires* `label`) — hand-rolled buttons dodge that guarantee · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 4.1.2 — button announces as "button" with no name
- **Evidence:** `CapacityDepartments.tsx:162`: `<button onClick={() => copyToClipboard(...)}>` containing only a Copy icon; no `aria-label`/`title` on the button. It sits inside `<Tooltip content="Copy DID">` — Atlaskit Tooltip only describes while shown; the button still has no persistent accessible name.
- **Why:** Screen-reader users hear "button" ×3 in a row with no way to distinguish copy/edit/delete.
- **Recommended Fix:** Add `aria-label`, or migrate to Atlaskit `IconButton` with mandatory `label` prop.
- **Regression Risk:** Very low — attribute-only.
- **Validation Required:** Re-run scanner; VoiceOver spot-check on `/admin` list rows.
- **Suggested PR:** PR11

### CAT-AUDIT-1154 — 9 `<img>` without `alt`
- **Category:** Accessibility / Non-text content
- **Severity:** Medium
- **Surface:** Chat dock/avatars, rich-text media, Jira icon lib, PWH backlog
- **Route:** multiple
- **Component:** CatyFabIcon, ChatDock, avatar, ChatProjectRow, atlaskitMediaOverrides, ComposerAttachmentChip, jira-issue-type-icons, BacklogPage.atlaskit
- **File Path:** `src/components/chat/dock/CatyFabIcon.tsx:3` · `src/components/chat/dock/ChatDock.tsx:10` · `src/components/chat/main/avatar.tsx:4` · `src/components/layout/ChatProjectRow.tsx:9` · `src/components/shared/rich-text/atlaskit/atlaskitMediaOverrides.tsx:225` · `src/features/chat-v2/components/Attachments/ComposerAttachmentChip.tsx:193` · `src/lib/jira-issue-type-icons.tsx:379,398` · `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:449`
- **Mode:** both
- **CRE:** n/a · **ADS:** avatars should be `@atlaskit/avatar` · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 1.1.1 — screen readers announce raw filename/URL or nothing
- **Evidence:** Scanner matched `<img` opening tags with no `alt=` attribute at the 9 locations above.
- **Why:** Avatars and issue-type icons carry meaning (who/what type); missing alt loses it; decorative ones need `alt=""` to be skipped.
- **Recommended Fix:** Meaningful `alt` (user name, issue type) or explicit `alt=""` when decorative.
- **Regression Risk:** Very low.
- **Validation Required:** Re-run scanner → 0.
- **Suggested PR:** PR11

### CAT-AUDIT-1155 — 348 inline `<svg>` without `aria-hidden`/`role`/`aria-label`
- **Category:** Accessibility / Non-text content
- **Severity:** Medium (high volume, mostly decorative)
- **Surface:** App-wide — worst: `ja/icons`, project-work-hub, chat, capacity, notifications, kanban, layout
- **Route:** multiple
- **Component:** 123 distinct files
- **File Path:** clusters: `src/components/ja` (41 — e.g. `src/components/ja/icons/WorkItemIcon.tsx:121,128,136,144`), `src/modules/project-work-hub` (24), `src/components/chat` (21 — e.g. `ChatMainView.tsx:584,597,630`), `src/components/capacity` (18), `src/components/notifications` (17), `src/components/shared` (16), `src/modules/kanban` (16), `src/components/layout` (14)
- **Mode:** both
- **CRE:** n/a · **ADS:** icon components should come from `@atlaskit/icon` (which handles this) · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 1.1.1 — unhidden decorative SVGs create AT noise; meaningful ones lack names
- **Evidence:** Scanner matched `<svg` opening tags with none of `aria-hidden`, `role=`, `aria-label`.
- **Why:** Screen readers may announce "image/group" repeatedly for every glyph in dense surfaces (chat, kanban, tables).
- **Recommended Fix:** Add `aria-hidden="true" focusable="false"` on decorative SVGs (a one-pass codemod in the icon registries — `WorkItemIcon.tsx`, `jira-issue-type-icons.tsx` — clears the biggest clusters); `role="img"` + `<title>` where meaningful.
- **Regression Risk:** Very low — attribute-only.
- **Validation Required:** Re-run scanner; count → near 0.
- **Suggested PR:** PR11

### CAT-AUDIT-1156 — 38 hand-rolled fixed-inset overlays without Escape; 31 also without any focus management
- **Category:** Accessibility / Focus management & keyboard traps
- **Severity:** Critical
- **Surface:** Modals/drawers across workhub, releasehub, budget, backlog, task10, incidents, program, skills-inventory
- **Route:** multiple
- **Component:** see list
- **File Path:** No Escape + no focus code (31): `src/components/workhub/workitems/WorkItemDrawer.tsx`, `src/components/wsjf/WSJFScoringModal.tsx`, `src/components/backlog/DetailPanel/modals/WSJFModal.tsx`, `src/components/backlog/DetailPanel/modals/AddMilestoneModal.tsx`, `src/components/backlog/ViewingDropdown.tsx`, `src/components/budget/DataQualityDetailModals.tsx`, `src/components/capacity-heatmap/KeyboardShortcutsPanel.tsx`, `src/components/catalyst-ai/CatalystAIPanel.tsx`, `src/components/catalyst-roadmap/RoadmapObjectivesPanel.tsx`, `src/components/contract-horizon/ResourceDrawer.tsx`, `src/components/epic-backlog/tabs/MilestonesTab.tsx`, `src/components/evidence/gallery/DeleteConfirmDialog.tsx`, `src/components/layout/MobileMenuDrawer.tsx`, `src/components/objective-roadmap/EnterpriseRoadmapFiltersDialog.tsx`, `src/components/program/ProgramRoadmapFiltersDialog.tsx`, `src/components/release-hub/ReleaseArtifactSelector.tsx`, `src/components/releasehub/ChgDrawer.tsx`, `src/components/releasehub/ChgGateModal.tsx`, `src/components/requirement-assist/GenerationOverlay.tsx`, `src/components/skills-inventory/DeleteSkillDialog.tsx`, `src/components/skills-inventory/SkillsFiltersDialog.tsx`, `src/components/ui/lookup-select.tsx`, `src/components/wsjf/WSJFScoringModal.tsx`, `src/modules/incidents/analytics/components/DrilldownDrawer.tsx`, `src/modules/okr-v2/components/StrategyAnalyticsModal.tsx`, `src/modules/project-work-hub/components/FilterDrawer.tsx`, `src/modules/task10/components/landing/T10CompletedDetailModal.tsx`, `src/modules/task10/components/landing/T10LandingPageV3.tsx`, `src/pages/program/ExecutionWorkbench/WorkbenchFiltersDialog.tsx`, `src/pages/releasehub/TriageQueuePage.tsx`, `src/pages/work-tree/WorkTreePage.tsx`. No Escape, partial focus only (7): `src/components/budget/FixCTCModal.tsx`, `src/components/budget/SingleResourceEditModal.tsx`, `src/components/project-hub/work-items/CreateWorkItemModal.tsx`, `src/components/project-hub/work-items/detail/LinkedItemsSection.tsx`, `src/components/releasehub/ReleaseDrawer.tsx`, `src/modules/task10/components/modals/T10RenameModal.tsx`, `src/modules/tasks/components/AddColumnModal.tsx`
- **Mode:** both
- **CRE:** n/a · **ADS:** these are hand-rolled modals — banned class; `@atlaskit/modal-dialog` provides focus trap + Escape for free · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 2.1.2 (No Keyboard Trap — inverse problem: focus escapes *behind* the overlay), 2.4.3 (Focus Order); most also lack `aria-modal`/`role="dialog"` (only 57 `aria-modal` usages repo-wide vs 69 fixed-inset overlay files)
- **Evidence:** 69 files render `fixed inset-0` overlays; 38 have no `Escape`/`useCloseOnEscape`/Atlaskit-modal/Radix reference anywhere in the file; of those, 31 have no `focus()`/FocusLock/focus-trap/autoFocus either. (Radix-based `src/components/ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx` were excluded as false positives — Radix supplies trap+Escape at runtime.) The canonical `src/components/overlays/AtlassianModal.tsx` (192 lines) claims "proper focus management" in its docblock but contains no Escape handler and no focus trap — only a `focus-visible` ring class.
- **Why:** Keyboard users open a drawer/modal, Tab lands in the page behind it, Escape does nothing — the overlay is inescapable without a mouse.
- **Recommended Fix:** Migrate to `@atlaskit/modal-dialog` / canonical Catalyst modal per the hand-rolled-UI ban; interim: shared `useCloseOnEscape` + focus trap in `AtlassianModal.tsx` so all consumers inherit it.
- **Regression Risk:** Medium — modal migration touches layout; do per-surface with screenshot signoff.
- **Validation Required:** Keyboard probe per overlay: open → Tab cycles inside → Escape closes → focus returns to trigger.
- **Suggested PR:** PR11 (interim hook) + follow-on migration slices

### CAT-AUDIT-1157 — Unlabeled raw `<input>` fields (588 occurrences without `aria-label`)
- **Category:** Accessibility / Forms
- **Severity:** High (with over-count caveat)
- **Surface:** Admin pages (FieldRegistry, Workflows, JiraSync, NotificationTriggers, Quarters), create dialogs, inline edits
- **Route:** `/admin/*` and multiple
- **Component:** multiple
- **File Path:** samples: `src/pages/admin/QuartersAdminPage.tsx:98` · `src/pages/admin/connections/JiraSyncPage.tsx:1071` · `src/pages/admin/NotificationTriggers.tsx:492` · `src/pages/admin/workflows/WorkflowAdminPage.tsx:349,566` · `src/pages/admin/workflows/CatalystWorkflowBuilder.tsx:595` · `src/pages/admin/test/TestRunStatusesPage.tsx:149`
- **Mode:** both
- **CRE:** n/a · **ADS:** raw `<input>` instead of `@atlaskit/textfield` + `@atlaskit/form` Field (which wires labels) · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 1.3.1 / 3.3.2 / 4.1.2 — no programmatic label; placeholder-only labeling
- **Evidence:** 588 `<input` occurrences in scope lack `aria-label`. **Honest caveat:** some are implicitly labeled — e.g. `src/pages/admin/FieldRegistryPage.tsx:296` wraps the input in a `<label>` (valid implicit association), and some are checkbox cells. Confirmed-unlabeled examples: `QuartersAdminPage.tsx:98` (`<input type="number" value={year} ...>` — no label element, no aria-label, no id/htmlFor) and `JiraSyncPage.tsx:1071` (placeholder-only destructive-confirm field). The 588 is an upper bound; a labeled-association-aware pass is needed for the true count.
- **Why:** Screen readers announce "edit text" with no field name; placeholder disappears on input.
- **Recommended Fix:** Per-surface pass: wrap in `<label>` / add `htmlFor`+`id` or `aria-label`; prefer Atlaskit `Field`+`Textfield`. Start with `/admin` forms (highest density, sampled above).
- **Regression Risk:** Very low.
- **Validation Required:** Axe-style label check per form after fix; refined scanner distinguishing label-wrapped inputs.
- **Suggested PR:** PR11

### CAT-AUDIT-1158 — `autoFocus` used 237 times across 166 files
- **Category:** Accessibility / Focus management
- **Severity:** Low–Medium (context-dependent)
- **Surface:** App-wide — shared tables, tasks, filters, workhub, releases, admin
- **Route:** multiple
- **Component:** samples: `src/components/shared/BacklogTable/BacklogTable.tsx:4384` · `src/components/shared/JiraTable/JiraTable.tsx:3132` · `src/components/shared/GroupByPopover.tsx:265` · `src/modules/tasks/components/PlannerSearchBar.tsx:447` · `src/modules/tasks/components/TaskDetailDrawer/SidebarFields.tsx:722`
- **Mode:** both
- **CRE:** n/a · **ADS:** n/a · **Typography:** n/a · **Performance:** n/a
- **Accessibility:** WCAG 2.4.3 / 3.2.1 — autoFocus is legitimate inside just-opened dialogs/inline-edit fields; risky on page-level or list-render inputs where it steals focus and disorients AT users
- **Evidence:** Scanner found 237 `autoFocus` tokens. Not all are defects — inline-edit and modal-first-field usage (the majority by cluster: shared inline editors, create modals) is the correct pattern. Flag is for triage, not bulk removal.
- **Why:** Focus theft on mount of non-dialog surfaces breaks reading order and scroll position.
- **Recommended Fix:** Triage the 166 files: keep dialog/inline-edit usage; remove autoFocus from anything rendered during normal page/list mount.
- **Regression Risk:** Low.
- **Validation Required:** Manual triage list; keyboard probe on any removals.
- **Suggested PR:** PR11 (triage only)

### CAT-AUDIT-1159 — Positive `tabIndex`: PASS (0 found)
- **Category:** Accessibility / Focus order — **Severity:** Info (pass)
- **Surface/Route/Component/File Path:** n/a · **Mode:** n/a · **CRE/ADS/Typography/Performance:** n/a
- **Accessibility:** WCAG 2.4.3 — clean
- **Evidence:** Scanner regex `tabIndex={1..n}` (numeric and string forms) → 0 matches in scope.
- **Why/Recommended Fix/Regression Risk:** None — record as pass. **Validation Required:** keep in future scanner. **Suggested PR:** n/a

### CAT-AUDIT-1160 — `aria-hidden` on focusable elements: PASS (0 found)
- **Category:** Accessibility / ARIA misuse — **Severity:** Info (pass)
- **Surface/Route/Component/File Path:** n/a · **Mode:** n/a · **CRE/ADS/Typography/Performance:** n/a
- **Accessibility:** WCAG 4.1.2 — clean per static check (aria-hidden co-occurring with tabIndex=0 or role="button"+onClick in the same opening tag → 0)
- **Evidence:** Scanner → 0 matches. Caveat: static check only covers same-tag co-occurrence; aria-hidden ancestors of focusable children are not detectable without a DOM.
- **Suggested PR:** n/a

### CAT-AUDIT-1161 — Contrast-risk color pairs: 41 gray-on-gray Tailwind pairs + widespread subtlest/sunken co-usage
- **Category:** Accessibility / Contrast (static risk flags — need runtime verification)
- **Severity:** Medium
- **Surface:** all-releases, release-compare, committee, budget (FixCTCModal), work-manager, capacity, releases toolbar
- **Route:** multiple
- **Component:** EnterpriseTableView, Toolbar, ReleaseCard, ComparisonTable, TaskDrawer, CommitteeQueueTable, ExecutiveInsightPanel, ReleasesToolbar, CycleCardEnhanced, AllocationBookingModal, FeatureDetailsPanel, FixCTCModal
- **File Path:** 41 same-line pairs, samples: `src/features/all-releases/components/EnterpriseTableView.tsx:68` (`bg-slate-50 text-slate-500`) · `src/features/all-releases/components/ReleaseCard.tsx:96` (`bg-slate-100 text-slate-500`) · `src/components/committee/CommitteeQueueTable.tsx:250` (8px text + `bg-slate-100 text-slate-500` — double risk with tiny type) · `src/components/budget/FixCTCModal.tsx:307,471` (disabled `bg-slate-200 text-slate-400/500`) · `src/components/releases/all-releases/ReleasesToolbar.tsx:95,120` (`bg-slate-50 text-slate-400`)
- **Mode:** both — dark-mode variants often absent on these lines, so dark mode inherits light grays
- **CRE:** n/a · **ADS:** every one of these is ALSO a banned Tailwind color utility (cross-flag to ADS lane / color ratchet baseline) · **Typography:** `text-[8px]` at CommitteeQueueTable.tsx:250 · **Performance:** n/a
- **Accessibility:** WCAG 1.4.3 — `text-slate-400` (#94a3b8) on `bg-slate-50` (#f8fafc) ≈ 2.9:1, below 4.5:1; `text-slate-500` on `bg-slate-100` ≈ 4.2:1, borderline fail
- **Evidence:** grep of same-line `text-(gray|slate)-(400|500)` + `bg-(gray|slate)-(50|100|200)` → 41 hits. Additionally `--ds-text-subtlest` and `--ds-surface-sunken` co-occur in 20+ files (`src/features/health/components/HealthPanel.tsx`, `src/features/kanban-board/components/Board.tsx`, `src/features/release-calendar/components/CalendarGrid.tsx`, `src/styles/*.css`) — token-pair co-usage is a *risk flag only*; ADS subtlest-on-sunken generally passes for large text but needs runtime check where used for body/small text.
- **Why:** Low-vision users lose day-counters, disabled-state reasons, and toolbar state entirely; these are also unfixable by theme because they bypass tokens.
- **Recommended Fix:** Replace Tailwind pairs with ADS tokens (`var(--ds-text-subtle)` on `var(--ds-background-neutral)` etc. — token pairs are contrast-vetted by ADS); runtime-verify the subtlest/sunken usages in dark mode.
- **Regression Risk:** Low — color swap; screenshot signoff both modes.
- **Validation Required:** Contrast measurement (axe/devtools) on the 41 sites post-fix, both modes.
- **Suggested PR:** PR11 (doubles as color-ratchet reduction — ratchet baselines down after)

---

## Occurrence Appendix

| # | Class | Occurrences | Distinct files | Worst clusters |
|---|---|---|---|---|
| 1150 | Missing lint:accessibility script | 1 | 1 | package.json |
| 1151 | Clickable div/span, no keyboard | 683 | 429 | task10 (50), project-work-hub (44), workhub (35), tasks (26), releases (24), shared (22), project-hub (21), strategy (17) |
| 1152 | role="button" no key handler | 9 | 6 | capacity (3), project-hub dashboard (2), chat-v2 (2) |
| 1153 | Icon-only button, no name | 28 | 17 | pages/admin (7), detail-views (3), shared (3) |
| 1154 | img without alt | 9 | 8 | chat (4), lib icons (2) |
| 1155 | svg without aria-hidden/role/label | 348 | 123 | ja (41), project-work-hub (24), chat (21), capacity (18), notifications (17) |
| 1156 | Hand-rolled overlays, no Escape | 38 (31 with zero focus mgmt) | 38 | releasehub (3), backlog (3), budget (3), task10 (3) |
| 1157 | input without aria-label (upper bound) | 588 | — | pages/admin densest (sampled) |
| 1158 | autoFocus (triage, not all defects) | 237 | 166 | shared (18), tasks (16), filters (12), workhub (12) |
| 1159 | Positive tabIndex | 0 | 0 | PASS |
| 1160 | aria-hidden on focusable (same-tag) | 0 | 0 | PASS |
| 1161 | Gray-on-gray Tailwind pairs | 41 | ~20 | all-releases, budget, committee, releases |
| | subtlest+sunken co-usage (risk flag) | 20+ files | 20+ | features/*, styles/*.css |

**Total flagged occurrences: 1,982** (683+9+28+9+348+38+588+237+41 +1 tooling; of which 588 input-label and 237 autoFocus are triage upper bounds, and ~20 subtlest/sunken files are risk flags not counted).

Raw per-occurrence JSON: scratchpad `a11y-raw.json` (session-local; scanner source `a11y-scan.cjs` reproducible in <1 min).

## Lane Summary

Static-only sweep; no server or browser used. The prescribed `npm run lint:accessibility` is broken — `scripts/audit-accessibility.cjs` does not exist (CAT-AUDIT-1150), so a scratchpad scanner produced this lane's data across 2,892 files.

Two defect classes dominate: **683 mouse-only click targets** on div/span (CAT-AUDIT-1151, clustered in task10 / project-work-hub / workhub) and **38 hand-rolled overlays with no Escape handling, 31 of which have zero focus management** (CAT-AUDIT-1156) — including the canonical `AtlassianModal.tsx`, whose docblock claims focus management it doesn't implement. Supporting classes: 348 unhidden inline SVGs (one codemod clears most), 28 nameless icon buttons (admin-heavy), 9 `role="button"` semantics lies, 9 alt-less images, 588 (upper-bound) unlabeled inputs, and 41 gray-on-gray Tailwind pairs that fail WCAG contrast math and violate the ADS token ban simultaneously. Two clean passes: zero positive tabIndex, zero same-tag aria-hidden-on-focusable.

Everything maps to PR11; the overlay class should additionally feed the hand-rolled-UI migration backlog since `@atlaskit/modal-dialog` fixes trap+Escape+aria-modal for free. Static caveats are declared inline (stopPropagation wrapper divs, label-wrapped inputs, legitimate dialog autoFocus) — counts for 1151/1157/1158 are honest upper bounds pending per-surface triage.
