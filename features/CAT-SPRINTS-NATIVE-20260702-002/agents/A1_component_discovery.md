# A1 — Canonical Component Discovery
**Feature:** CAT-SPRINTS-NATIVE-20260702-002 (native sprint module redesign)
**Agent:** Canonical Component Discovery · **Date:** 2026-07-02
**Method:** Read 13_COUNCIL_VERDICT.md, then file-level probes (grep + reads) of every candidate. All paths absolute from repo root `Catalyst-web/`.

Hierarchy applied: existing Catalyst canonical → Catalyst wrapper → `@atlaskit/*` primitive. Hand-rolled = forbidden.

---

## 1. Sprint list table — `JiraTable` ✅ (canonical, fits)
- **Component:** `JiraTable` — `src/components/shared/JiraTable/JiraTable.tsx` (+ `types.ts`, `cells.tsx`, `flags.tsx`)
- **Evidence:** `types.ts:120` `export interface JiraTableProps<TRow>`; already consumed by UWV, roadmap, tasks. `src/components/releases/cells.tsx:6` already imports `Column, CellProps from '@/components/shared/JiraTable/types'` — release cell factories are **already JiraTable-shaped**.
- **API verification against spec:**
  - **Grouped rows w/ group headers:** YES — `groups?: RowGroup<TRow>[]` (`types.ts:126`), `RowGroup` supports `label`, `meta`, and rich `labelNode` (`types.ts:97–117`); collapse via `collapsedGroups`/`onToggleGroup` (`types.ts:213–214`). Live consumer: `src/components/universal-work-view/UWVTable.tsx:151` builds `RowGroup<UWVItem>[]`, passes `groups={groups ?? undefined}` (line 327).
  - **Status pill cell:** YES — `makeStatusCell` (`cells.tsx:446`) and `makeStatusEditCell` (`cells.tsx:477`).
  - **Avatar cell:** YES — `makeAssigneeCell` (`cells.tsx:531`).
  - **Kebab menu:** YES — `makeRowMenuCell` (`cells.tsx:118`) + `contextMenuActions` prop (`types.ts:269`).
  - **Progress bar cell:** NOT in JiraTable/cells.tsx, but exists as a JiraTable-typed factory in `src/components/releases/cells.tsx:75` `makeProgressCell` (segmented Done/InProgress/ToDo bar, ADS tokens, e.g. `--ds-background-information-bold` at line 122). Reuse/adapt — not a gap requiring approval.
  - **Inline contextual action button:** proven pattern in `src/components/releases/cells.tsx:203` `makeActionsCell` — conditionally renders `<Button appearance="default" spacing="compact">Release</Button>` for eligible rows next to the kebab (`ActionsMenu`). Clone for "Start sprint"/"Complete sprint".
  - **Row count banner:** YES — `showRowCount`/`totalRowCount` (`types.ts:160–161`). Note: doc comment says footer renders "when not grouping" — verify count display when `groups` is active (minor gap, cosmetic).
- **Gap notes (no new component needed):**
  - `showRowCount` may be suppressed in grouped mode → if the "This space has N sprints" banner is wanted while grouped, render it in the toolbar above the table (CatalystListPageLayout slot), not by modifying JiraTable.
  - Sprint-specific column factories (name+lozenge cell, owner cell, release-chip cell) = new **cell factories** in a `src/components/sprints/cells.tsx`, composed from canonical pieces. Cell factories are consumer code per JiraTable's design, not hand-rolled UI.

## 2. Group-by month headers — `JiraTable RowGroup` ✅
- Use `groups` with `id = 'YYYY-MM'`, `label = 'January 2026'`, newest first; count is rendered by JiraTable automatically; `labelNode` available if a lozenge is wanted in the header (per `types.ts:108–116` this is the documented Atlaskit "Group: …" pattern — Lozenge/Avatar in the label slot).
- Status group-by: same mechanism, `labelNode` = `StatusLozenge`.
- Per-group "+" create is available but flag-gated: `enableGroupCreateButton` + `onAddToGroup` (`types.ts:225, 323`).

## 3. Sprint length indicator (1W/2W) + create-modal "ribbon"
- **List cell indicator:** `@atlaskit/lozenge` — canonical for compact categorical markers. Evidence of established use: `src/components/releases/cells.tsx:2` (`import Lozenge from '@atlaskit/lozenge'`), plus Card.tsx, CatalystDefectFields.tsx, etc. `<Lozenge>1W</Lozenge>` / `<Lozenge appearance="new">2W</Lozenge>`. Badge is numeric-count-only; Tag is removable-chip semantics — both wrong.
- **"Ribbon" on the create modal card:** **NO canonical ribbon/corner-fold component exists.** Grep for "ribbon" hits only unrelated files (`ThemeCard.tsx`, `HubIcon.tsx`, R360, testhub reports — none are a corner ribbon primitive). A hand-rolled CSS corner ribbon is banned. **Proposal (ADS-compliant alternative):** render the length as a `Lozenge` in the modal's option-card header row (right-aligned), i.e. the 1W|2W chooser cards each carry `<Lozenge appearance="inprogress">1 WEEK</Lozenge>`. If a true diagonal ribbon is insisted on → NEW component → **Vikram approval required**. Recommendation: Lozenge, no new component.

## 4. Progress bar — reuse `makeProgressCell` (canonical) over `@atlaskit/progress-bar`
- **Primary:** `src/components/releases/cells.tsx:75` `makeProgressCell` — fraction tooltip + segmented bar (done/in-progress/todo) already JiraTable-typed and ADS-tokened. Matches the spec "fraction + segmented bar by status category" exactly. Also `src/components/releases/ReleaseProgressBar.tsx` (593B standalone) for non-table surfaces (side panel).
- **Fallback primitive:** `@atlaskit/progress-bar` exists in repo (`src/components/ads/ProgressBar.tsx` wrapper; used in `JiraSyncPage.tsx`, `CatyWorkloadRisk.tsx`) — single-segment only, cannot show status-category segments → use only if the segmented design is dropped.

## 5. Create modal
- **Shell:** `@atlaskit/modal-dialog` (`Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition`) — exactly what `src/components/sprints/SprintCreateModal.tsx:15` uses today. Keep; rebuild body in place.
- **Name field:** `@atlaskit/textfield` (SprintCreateModal.tsx:17 already imports). Auto mode = read-only Textfield (recomputed), Custom mode = editable.
- **Auto | Custom mode switch:** `RadioGroup` from `@atlaskit/radio` — canonical in-repo usage: `src/components/filters/FilterSaveModal.tsx:7` `import { RadioGroup } from '@atlaskit/radio'` (used at lines 299, 310 for exactly this "mode choice inside a modal" pattern). No ToggleGroup component exists in repo (`@atlaskit/toggle` is a boolean switch — wrong semantics for a 2-option choice). 1W/2W length picker: same `RadioGroup` (or the two option-cards, see §3, backed by radio semantics).
- **Dates:** `CatalystDatePicker` — `src/components/ui/catalyst-date-picker.tsx`; evidence: `ReleaseCreateModal.tsx`, `EpicDialog.tsx`, and SprintCreateModal.tsx:19 already import it. End date in Auto mode = computed, render read-only.
- **OWNER field (terminology: Owner, never "Driver"):** **`ProfilePicker`** — `src/components/ads/ProfilePicker.tsx`. Its own doc header: *"Canonical Catalyst people picker … single source of truth for every assignee / reporter / owner / manager picker in the app"* and *"Adding a new picker? Mount <ProfilePicker /> — do NOT roll a new component."* Supports custom `renderTrigger` for table cells. Do NOT use `@atlaskit/user-picker` (only reached `CloneIssueDialog.tsx`; ProfilePicker supersedes it) and do NOT clone ProductSelect for people.
- **Notes/description:** `@atlaskit/textarea` — SprintCreateModal.tsx:18 already imports; same as ReleaseCreateModal/ReleaseEditModal.
- **Project picker (existing):** `ProductSelect` from `src/components/releases/ReleaseFilters.tsx:589` (label-agnostic) — already used by SprintCreateModal.tsx:20.
- **"Link to release" single-select:** `@atlaskit/select` single-select styled like the `SprintLinker` chip pattern — `src/components/releases/SprintLinker.tsx` (header: "Displays current linked sprints as removable chips, with an Add … button opening a dropdown"; built on `@atlaskit/select`, `@atlaskit/primitives` Box/Inline/Stack, `@atlaskit/button/new`, token()). SprintLinker itself is multi-select release→sprints; the sprint modal needs the mirror (sprint→one release): **adapt the SprintLinker chip UX into a single-select variant** in `src/components/sprints/` reusing the same primitives — adaptation of a canonical pattern, not a new hand-roll.
- **DoD section:** see §12.

## 6. Status pills + interactive dropdown ✅
- **Palette:** `src/components/catalyst-detail-views/shared/sections/statusPalette.ts` — `STATUS_BG/STATUS_FG` (bold) + `STATUS_BG_SUBTLE/STATUS_FG_SUBTLE` (line 63/71) + `statusBg()/statusBgSubtle()`. Memory note: work-item pills currently use the SUBTLE tier; change colors only here.
- **Static pill:** `StatusLozenge` — `src/components/shared/StatusLozenge/StatusLozenge.tsx` (re-exported type used by JiraTable `cells.tsx:444`).
- **Interactive pill:** `StatusLozengeDropdown` — `src/components/shared/StatusLozenge/StatusLozengeDropdown.tsx`, header: *"CANONICAL interactive status pill … One dropdown component for every detail view, header, table editor."* Portal-anchored (deliberately NOT @atlaskit/popup/dropdown-menu — documented reasons in file). **Gap:** its option groups come from work-item workflow hooks (`useCanonicalIssueWorkflow`, `STATUS_OPTION_GROUPS`); the sprint status vocabulary (planning|active|awaiting_approval|completed|canceled|archived) must be fed as a custom options list — it accepts grouped options via `buildGroupsFromOptions`-style input, so this is a props-level adaptation, not a fork. Verify during Plan Lock that a non-work-item options source is injectable; if not, extend `StatusLozengeDropdown` with an `options` prop (small canonical extension, not a new component).

## 7. Avatars
- **Single avatar (owner cell, approver rows):** `CatalystAvatar` — `src/components/shared/CatalystAvatar.tsx` (Atlaskit Avatar + deterministic initials fallback; the canonical one). ⚠️ A second, older `src/components/ui/catalyst/CatalystAvatar.tsx` exists (initials-only, cn/tailwind) — do NOT use; prefer `shared/CatalystAvatar`.
- **Contributor stack:** `@atlaskit/avatar-group` via the existing pattern `src/components/projecthub/MemberStack.tsx` (`import AvatarGroup from '@atlaskit/avatar-group'`, profile cache, overflow "+N" click). Reuse MemberStack directly if profile-id-driven; else AvatarGroup + resolveAvatarUrl per its pattern.

## 8. Approvers card ✅ (already config-aware for sprints)
- `ApproversCard` — defined in `src/components/releases/detail/ReleaseSidePanel.tsx:285` `function ApproversCard({ releaseId, config = RELEASE_CONFIG }...)`. Comment at line 251: *"ApproversCard is config-aware (ph_release_approvers vs **ph_sprint_approvers**, FK column, profile embed alias)"* — it already reads `config.approvers.{table, fkColumn, profileFkAlias}`. **Gap:** it is module-private (not exported) → export it (or lift to `src/components/shared/`) and extend rows with decision lozenge (Pending/Approved/Rejected via `@atlaskit/lozenge`) + `decided_at` relative time (`src/lib/formatTimeAgo.ts`). Extension of canonical, no new component.

## 9. AI elements ✅
- **Trigger icon:** `CatyPulseIcon` — `src/components/ui/CatyPulseIcon.tsx` (signature icon, magenta #CD519D component-owned, never muted). Evidence: HealthPanel.tsx, ImproveIssueDropdown.tsx.
- **Button:** `CatyButton` — `src/components/for-you/atlaskit/CatyButton.tsx` (label = the action, e.g. "Sprint health"; loading="Thinking…" built in; exports `CatyHead` = CatyPulseIcon wrapper).
- **Result panel:** `CatyInsightCard` — `src/components/for-you/atlaskit/CatyInsightCard.tsx` (title, isLoading, onDismiss, onRefresh; Spinner/Tooltip/token-based). Existing consumers: CatyBoardInsight, CatyWorkloadRisk, CatyAgeingTriage — clone the CatyBoardInsight wiring (board_insight_cache) for `sprint_summary_cache`.

## 10. Dependencies section ✅
- `src/components/dependencies/`: `DependenciesSidebar.tsx` (compact section — best fit for sprint detail), `DependencyBadge.tsx`, `DependencyDrawer.tsx` / `DependencyDetailsDrawer.tsx`, `CreateDependencyDialog.tsx`, `DependencyContextMenu.tsx`, analytics panels (`DependencyAnalyticsPanel.tsx`, `DependencyWheelMap.tsx`). Health penalty "open blocker deps" reads `work_item_dependencies` — same source these components consume. Reuse as-is, filtered to sprint members.

## 11. Time-in-status widgets ✅ (gated Phase 3)
- `src/components/project-hub/dashboard/widgets/TimeInStatusWidget.tsx` (30K, main), `TimeInStatusHoverCard.tsx`, `TimeInStatusFullscreenModal.tsx`, `TimeInStatusEtaStrip.tsx` (+ test). Reuse for the sprint report; per council these ship only after the native-transition write path + backfill proofs.

## 12. DoD editor (per-work-item-type status select rows) — composition, closest pattern exists
- **Closest existing pattern:** `src/components/admin/WorkflowTypePanel.tsx` — renders per-work-item-type status rows using `JiraIssueTypeIcon` (`src/lib/jira-issue-type-icons`), `useTypeWorkflow` / `WORK_ITEM_TYPES` (`src/hooks/useTypeWorkflow.ts`), `STATUS_CATEGORY_COLORS` (`src/constants/statusCategoryColors.ts`).
- **DoD row composition (all canonical parts):** `JiraIssueTypeIcon` + type label + `@atlaskit/select` (single-select of that type's status catalog from `useTypeWorkflow`) rendering options as `StatusLozenge`. Container: plain Stack/rows inside the modal section — the per-type status catalog READ comes from the existing hooks (also `useIssueTypeWorkflow.ts`, `useCanonicalIssueWorkflow.ts`).
- **Verdict:** new *assembly* (`SprintDodEditor`) from canonical parts — no new primitive; flag in Plan Lock as a composed section, not a hand-rolled control.

## 13. Empty states, dates, typography
- **Empty state:** `EmptyState` wrapper — `src/components/ads/EmptyState.tsx` ("Catalyst wrapper over @atlaskit/empty-state", `size="default"` full-page / `size="compact"` widget-nested). Consumers: KanbanPage, UWVTable, MilestoneManager.
- **Date formatting:** list cells: follow `src/components/releases/cells.tsx:146,168` — `toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })`; overdue = `var(--ds-text-danger)` (Jira parity per probe #6). Relative times: `src/lib/formatTimeAgo.ts`. Auto-name "08 Jan 26" format needs a tiny pure util in the sprint naming lib (shared client util mirrored by `sprint_autoname()` SQL — already in verdict §1); no canonical `DD Mon YY` formatter exists.
- **Typography:** `Heading` wrapper `src/components/ads/Heading.tsx` (over `@atlaskit/heading`; also `src/components/ads/PageHeader.tsx`); font tokens only (`--ds-font-size-*` as SprintCreateModal already does).

## 14. Page chrome ✅ (paths confirmed)
- `CatalystListPageLayout` — `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx` (consumer: `BoardManagerPage.tsx`); barrel `src/components/shared/CatalystListPage/index.ts` + `src/components/shared/index.ts`.
- `AtlaskitPageShell` — `src/components/ads/AtlaskitPageShell.tsx` (used by CatalystListPageLayout itself and TimelineView).
- `ProjectPageHeader` — `src/components/layout/ProjectPageHeader.tsx` (consumers: KanbanPage, ProductDashboardPage).
- Breadcrumbs: `src/components/ads/Breadcrumbs.tsx` (wraps `@atlaskit/breadcrumbs`) — via the layout, not mounted ad hoc.
- Current page to rebuild: `src/pages/project-hub/SprintsPage.tsx` (today mounts SprintCreateModal + shared release surfaces).

---

## Gap register (items needing decision/approval)
| # | Item | Class | Action |
|---|------|-------|--------|
| G1 | Diagonal corner "ribbon" on create-modal length cards | No canonical exists | Use Lozenge in card header (recommended). True ribbon = NEW component → **Vikram approval** |
| G2 | `StatusLozengeDropdown` options source is work-item-workflow-bound | Props-level extension | Add injectable `options`/groups prop if not already accepted; log in Plan Lock |
| G3 | `ApproversCard` not exported from ReleaseSidePanel | Export/lift | Export or move to shared; add decision lozenge + decided_at columns |
| G4 | Row-count banner while grouped | Possible JiraTable limit | Render count in toolbar slot instead; verify at build |
| G5 | Progress cell lives in `releases/cells.tsx` | Relocation | Generalize into `sprints/cells.tsx` or shared cells; pure reuse |
| G6 | Single-select release chip (mirror of SprintLinker) | Pattern adaptation | Build from @atlaskit/select + primitives per SprintLinker; not hand-rolled |
| G7 | `SprintDodEditor` section | New assembly of canonical parts | Declare in Plan Lock as composition (JiraIssueTypeIcon + @atlaskit/select + StatusLozenge + useTypeWorkflow) |
| G8 | Duplicate CatalystAvatar (`ui/catalyst/` vs `shared/`) | Ambiguity trap | Standardize on `src/components/shared/CatalystAvatar.tsx` |

**Nothing in the design requires a from-scratch primitive.** The only Vikram-approval item is the literal ribbon (G1), which has a recommended Lozenge substitute.
