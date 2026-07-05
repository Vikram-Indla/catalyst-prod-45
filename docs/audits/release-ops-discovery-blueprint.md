# Release Operations — Discovery & Remediation Blueprint

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001`
**Mode:** PLAN ONLY — no code changes in this pass.
**Date:** 2026-07-06
**Author:** Claude Code (release-ops architect / ADS UX lead / CRE enforcement)

> Precedence (CLAUDE.md): active Plan Lock > feature handover > CLAUDE.md > Catalyst canonical components > ADS > local notes.
> The 12 locked business decisions in the brief are treated as an active decision set and **outrank repo convention** where they conflict (notably drawers — see §7/§9/CRE conflicts).

## Files & areas actually read (evidence base)

Routes / nav / lifecycle:
- `src/routes/FullAppRoutes.tsx` (release-hub block ~L764–804)
- `src/components/layout/ReleaseHubSidebar.tsx` (L34–61)
- `src/lib/release-ops/lifecycle.ts`

Pages (`src/pages/releasehub/**`): AllReleasesPage, AllChangesPage, ReleaseDetailPage, ChangeDetailPage, CommandCenterPage (RH21CommandCenter), ProductionEventsPage, ReleaseCalendarPage, SignOffQueuePage, FreezeWindowsPage, SopTemplatesPage, ReleaseSettingsPage, ReleaseBoardCanonical, ReleasesWorkCanonical, ReleasesTimelineCanonical, ReleaseFilterPreviewPage, ReleaseFilterDetailPage, ReleaseComparePage (dead), TriageQueuePage (dead).

Components (`src/components/releasehub/**`): CreateReleaseModal, CreateChgModal, CreateFreezeWindowModal, CreateSopTemplateModal, ChgDrawer, ReleaseDrawer, ChgGateModal, ReleaseDetailTabs, detail/SopExecutionTab, DeployResultBadge, RiskBadge, SourceBadge, ReleasePredictorCard, ReleasePeekPanel, ReleaseTimeline, ReleasePortfolio, ScopeIntegrityPanel, CatyRiskPanel, OwnerAlignmentStrip, WorkItemTag, WorkItemTraceabilityPanel, FacetFilterBar, EmptyState, SkeletonRows, CatalystAIChip, releaseReadiness.ts.

Hooks / data / rules:
- `src/hooks/useReleaseHub.ts` (1,497 lines)
- `src/pages/ForYouPage.tsx`, `src/hooks/useForYouData.ts`
- `src/lib/catalyst-rules/RULE_TABLE.md`, `src/lib/catalyst-rules/CatalystRules.ts`
- `src/lib/replay/**` (liveReplayTypes.ts, buildLiveReplayJourney.ts, mapReplayStatusCategory.ts, selectReplayCandidates.ts)
- `package.json` (@atlaskit/* — 57 packages)

Migrations:
- `supabase/migrations/20260618120000_release_operations_schema.sql` (core, 446 lines)
- `supabase/migrations/20260618140001_rh_release_signoffs.sql`
- `20260619140000_fix_rh_releases_seed_data.sql`, `20260625000000_create_ph_release_approvers.sql`, `20260625120000_ph_releases_add_section_fields.sql`, `20260701000009_releases_slugs.sql`, `20260701000011_ph_releases_slugs.sql`, `20260701000012_rh_releases_slugs.sql`, `20260703270000_sprint_release_link.sql`

---

## 1. Route Inventory

| Route | Component | Guard | Purpose |
|---|---|---|---|
| `/release-hub` → `/release-hub/overview` | redirect | — | root |
| `/release-hub/overview` | `RH21CommandCenterPage` | `ModuleGuard(releases)` | dashboard KPIs / pending approvals / windows / health |
| `/release-hub/releases` → `.../releases-management` | redirect | — | legacy |
| `/release-hub/releases-management` | `ReleasesPageLazy` (AllReleasesPage) | — | releases list (JiraTable) |
| `/release-hub/releases-management/:releaseSlug` | `ReleaseDetailPageLazy` | — | release detail (8 tabs) |
| `/release-hub/releases-management/:releaseSlug/work` | `ReleaseWorkNavigatorPageLazy` | — | work items in release |
| `/release-hub/release-kanban` | `ReleaseBoardCanonical` | — | canonical KanbanPage mode='release' |
| `/release-hub/work` | `ReleasesWorkCanonical` | — | canonical ProjectAllWorkView entityKind='release' |
| `/release-hub/timeline` | `ReleasesTimelineCanonical` | — | canonical TimelineView (Gantt) |
| `/release-hub/calendar` | `ReleaseCalendarPage` | — | month/quarter grid, 4 lanes |
| `/release-hub/production-events` | `ProductionEventsPageLazy` | — | prod events list + preview modal |
| `/release-hub/changes` | `RH21AllChangesPage` | — | change records list (JiraTable) |
| `/release-hub/changes/:changeId` | `ChangeDetailPage` | — | change detail (5 tabs) — **:changeId is UUID (slug-contract risk)** |
| `/release-hub/sop-templates` | `SopTemplatesPage` | — | SOP templates |
| `/release-hub/sign-off-queue` | `RH21SignOffQueuePage` | — | approval queue |
| `/release-hub/freeze-windows` | `RH21FreezeWindowsPage` | — | freeze windows + conflict count |
| `/release-hub/filters`, `/filters/create`, `/filters/:filterId` | canonical Filter pages (mode='release') | — | cross-project ph_issues filters |
| `/release-hub/settings` | `ReleaseSettingsPage` | — | read-only config snapshot |
| `/release-hub/:releaseId` | `ReleaseDetailPage` | — | legacy UUID release detail |
| `/release-hub/command-center`, `/compare`, `/triage` → `/overview` | redirect | — | deprecated 2026-06-23 |
| `/releasehub/*` → `/release-hub/*` | redirect ×7 | — | legacy path canonicalization |

**Missing routes (target):** `/release-hub/production-events/:eventKey` (full-page Replay — decision #10), `/release-hub/my-execution` or a For-You SOP surface (decision #3).

## 2. Page Inventory

Phase-complete surfaces (built): AllReleasesPage, AllChangesPage, ReleaseDetailPage (8 tabs: Overview/Scope/Readiness/Changes/Sign-offs/Notes/Prod Events/Audit), ChangeDetailPage (5 tabs: Overview/SOP/Work Items/Sign-offs/Activity), CommandCenterPage, ProductionEventsPage, ReleaseCalendarPage, SignOffQueuePage, FreezeWindowsPage, SopTemplatesPage, ReleaseSettingsPage, + 5 canonical adapters (Board/Work/Timeline/FilterPreview/FilterDetail).

Dead / orphaned: `ReleaseComparePage.tsx` (route redirected away), `TriageQueuePage.tsx` (route removed, file remains — hand-rolled `<table>`). Both should be deleted or resurrected via canonical surfaces.

Missing pages (target): **Production Event Replay full page**, **For-You SOP execution surface**, **Emergency Override request/approve surface** (currently no UI at all).

## 3. Existing Data Model (16 `rh_*` tables + 4 altered)

Core (`20260618120000`):
- **rh_releases** (altered): +release_type, target_env, product_id, planned_start_date, planned_release_date, release_manager_id, product_owner_id, qa_lead_id, uat_lead_id, health, readiness_pct. Slug added `20260701000012`.
- **rh_changes** (altered): +change_type, target_env, deployment_category (frontend|backend|integration|database|full_stack|configuration), window_start/window_end, change_manager_id, release_manager_id, external_system, **is_emergency_override, override_reason, override_approver_id**. Legacy `release_id` (1:1) retained.
- **rh_change_release_links** — M:N change↔release, forward source of truth, `linked_at`/`unlinked_at` audit. **(Decision #2 satisfied at schema.)**
- **rh_sop_templates**, **rh_sop_template_steps** (step_type: manual|script|deployment|validation|communication|rollback).
- **rh_sop_steps** (execution): change_id, step_no, step_type, owner_id, environment, branch, **frontend_commit, backend_commit, integration_commit**, script_reference, command_text, expected_result, actual_result, evidence_url, status (pending|in_progress|done|blocked|skipped|failed), **started_at, completed_at**, blocker_reason, is_mandatory. RLS: update by manager OR step owner.
- **rh_change_signoffs** — per-change approvals.
- **rh_release_signoffs** (`20260618140001`) — per-release approvals; mirrors change signoffs. **Absent from `types.ts` — type drift.**
- **rh_freeze_windows** (altered): +target_env, applicability, product_id, status, override_policy.
- **rh_production_events** (altered): +event_key, release_id, change_id, product_id, target_env, produced_at, deployment_status, owner_id, release_notes_id, **work_items_snapshot / business_requests_snapshot / commits_snapshot / sop_evidence_snapshot / approvers_snapshot (JSONB)**.
- Link/content/health: rh_release_brs, rh_release_sprints, rh_release_work_items (inclusion_source: sprint|manual|excluded), rh_release_notes (md + ADF), rh_readiness_checks, rh_notify_subscribers (item_type release|change).
- Cross-hub FKs: `ph_incidents.release_id → rh_releases`, legacy `incidents.release_version_id`. Sprint link `20260703270000_sprint_release_link.sql`.

Governance: RLS `rh_is_manager()` (admin|program_manager), `rh_is_approver()` (+team_lead). Release domain is **schema/RLS-enforced, NOT CRE-type-governed** (CatalystRules.ts is agnostic to rh_* types).

## 4. Existing User Journey

1. Overview (RH21 Command Center) → KPIs, pending approvals, exec queue.
2. Releases list → JiraTable → click row → **ReleaseDrawer (side drawer)** OR navigate to ReleaseDetailPage (8 tabs). Two competing detail patterns.
3. Changes list → JiraTable → **ChgDrawer (side drawer)** OR ChangeDetailPage (5 tabs).
4. Change detail → SOP tab → SopExecutionTab renders rh_sop_steps rows, status select, evidence, commit display (frontend/backend/integration only). **No timer, no commit enforcement.**
5. Sign-off Queue → pending approvals list → Approve/Reject modal (flat list, no dependency visual).
6. Freeze Windows → list + create + conflict count.
7. Calendar → day-level month/quarter grid, 4 lanes, ReleasePeekPanel (**right drawer**).
8. Production Events → JiraTable → **preview modal** with snapshot counts. No replay, no full page.
9. For You → work-item feed only. **No SOP/change/release operational cards.**

## 5. Target User Journey

1. Overview unchanged (canonical).
2. Releases/Changes lists → row click routes to **full-page detail** (no side drawers). Peek = focused modal preview only.
3. **Change without release**: allowed; if `target_env = production` and no release link → **SectionMessage blocker + mandatory justification** before any execute/schedule transition (decision #1).
4. Change Detail → **primary live execution timer** (elapsed since `started_at`) on active SOP step; commit-ID field **mandatory** when step_type ∈ {frontend, backend, integration, database, configuration} before marking done (decision #9).
5. SOP sequencing via **@atlaskit Pragmatic DnD** (reorder step_no).
6. **Emergency override**: RM/CM requests (reason captured) → PO/Admin approves → audited row + **visual override badge** everywhere the change renders (decision #6).
7. Incident raised mid-execution → **link to release + change + SOP step** via bridge tables; back-link visible on Change Detail + Incident detail (decision #5).
8. Sign-off Queue → **interactive dependency-style visual** (reuse DependencyWheelMap) spanning release-level AND change-level gates (decision #12).
9. Calendar → release planning (day) **plus hourly SOP execution lane** (decision #8) from scheduled step windows.
10. Production Events → change-level events **rolled up** to release history (decision #7); row → **full-page Replay** (`/production-events/:eventKey`), modal = preview only (decision #10).
11. For You → **"My SOP steps" operational cards** (secondary execution timer) reading assigned `rh_sop_steps` (decisions #3, #4).

## 6. Gap Matrix (12 locked decisions)

| # | Decision | Status | Gap size | Core gap |
|---|---|---|---|---|
| 1 | Change w/o release; prod flagged + justified | PARTIAL | M | Guard is release→change only; no prod-change-needs-release block + no justification capture |
| 2 | M:N via rh_change_release_links, legacy kept | **EXISTS** | — | Schema + dual-read union done (`useReleaseHub.ts:645–666`) |
| 3 | SOP steps source of truth; For You reads them | PARTIAL | L | `useForYouData` never queries rh_sop_steps; no For-You SOP surface |
| 4 | Timer: Change Detail(1)/For You(2)/Release Detail(3) | PARTIAL | L | started_at/completed_at exist; **zero timer UI** anywhere |
| 5 | Incidents link release+change+SOP step | MISSING | L | No change_id/sop_step_id FKs, no bridge tables |
| 6 | Emergency override request→approve→audit→mark | PARTIAL | L | Flag columns exist; no workflow, no audit table, no badge UI |
| 7 | Prod events change-level + release rollup | PARTIAL | M | Release→event auto-gen works; change→event + rollup missing |
| 8 | Calendar: planning + hourly SOP | PARTIAL | L | Calendar day-scoped; no step scheduling fields, no hourly lane |
| 9 | Commit IDs mandatory for technical steps | PARTIAL | M | frontend/backend/integration cols only; **db+config cols missing**; no enforcement |
| 10 | Prod Event Replay = full page (modal=preview) | MISSING | L | Snapshots stored; no replay route/page/engine |
| 11 | Side drawers banned | **VIOLATION** | L | ChgDrawer, ReleaseDrawer, ReleasePeekPanel, AIInsightsDrawer active |
| 12 | Sign-off release + change, dependency visual | PARTIAL | M | Both levels exist; no dependency model/graph |

## 7. Mental-Model Breakages

1. **Dual detail pattern** — row click sometimes opens a side drawer (ChgDrawer/ReleaseDrawer), sometimes a full page (Detail pages). Users can't predict which; violates decision #11. Collapse to full-page detail + focused modal preview.
2. **Health ≠ Status confusion** — both render as same-size pills side by side, no hierarchy. Users read "health" as current stage.
3. **Orphaned Triage** — changes without a release hide in a dead TriageQueuePage with no entry point; no signal on Releases list that unlinked prod changes exist (compounds decision #1 gap).
4. **"Escalate" shown but not actionable** — CatalystAIChip suggests escalation after wait threshold; no handler.
5. **Replay implies playback that doesn't exist** — Production Events store rich snapshots but the surface only shows counts; users expect a timeline they can scrub.
6. **For You promises "everything assigned to me" but omits SOP steps** — execution workload is invisible to the person who owns it.

## 8. UI/UX Breakages (severity)

| Severity | Surface | Issue | Anchor |
|---|---|---|---|
| **P0** | ChgDrawer | banned side drawer; custom tabs; hand-rolled stepper; nested hand-rolled table | `ChgDrawer.tsx:55–129, 84–104, 107–116, 515–535` |
| **P0** | ReleaseDrawer | banned side drawer; **bare `<input type="date">`**; custom quality-gate cards; hand-rolled table | `ReleaseDrawer.tsx:176–283, 197–204, 417–436` |
| **P0** | ReleasePeekPanel | explicit "right drawer" from calendar chip (banned) | `ReleasePeekPanel.tsx:2` |
| P1 | ReleaseComparePage | hand-rolled `<table>` (use JiraTable); non-ADS `--cp-teal-60` ×5 | `ReleaseComparePage.tsx:88–113, 10/35/73/105/120` |
| P1 | TriageQueuePage | hand-rolled `<table>`; custom fixed-position dropdown; `--cp-bg-elevated` | `TriageQueuePage.tsx:71–131, 138–160, 54/73/83` |
| P1 | AllReleasesPage / ReleaseDetailPage | custom HealthPill inline colors instead of Lozenge | `AllReleasesPage.tsx:45–56`, `ReleaseDetailPage.tsx:64–73` |
| P1 | AllChangesPage | custom RiskPill inline colors | `AllChangesPage.tsx:40–50` |
| P1 | ReleaseDetailPage / ChgDrawer | custom lifecycle stepper (inline-styled circles) | `ReleaseDetailPage.tsx:75–102` |
| P2 | CreateChgModal | error divs styled inline (use SectionMessage) | `CreateChgModal.tsx:198–270` |
| P2 | AllReleasesPage / AllChangesPage | FacetFilterBar custom dropdowns + hand-rolled search input | `AllReleasesPage.tsx:251–261`, `AllChangesPage.tsx:254–261` |

Color law: **no bare hex/rgb found** (good). Non-ADS legacy palette leakage (`--cp-teal-60`, `--cp-bg-elevated`, `--cp-blue`, `--bg-1`) = P2 token cleanup → map to `--ds-*`.

## 9. Data Lineage Breakages

1. **Incident ↔ execution orphaned** — no FK/bridge from incidents to change or sop_step; incident raised during a deploy can't reference what broke.
2. **SOP steps absent from For You lineage** — `useForYouData` 3-wave fetch has no rh_sop_steps branch; execution ownership never surfaces.
3. **Production event generation directional** — release→event auto-inserts (`useReleaseHub.ts:206–243`); change→event never fires; no change→release rollup query.
4. **Emergency override audit orphaned** — flag columns mutate with no audit row and no request/approval workflow table.
5. **SOP scheduling absent** — rh_sop_steps has `started_at`/`completed_at` (actuals) but no `scheduled_start`/`scheduled_end`/`due_date`; calendar can't place steps on an hour grid.
6. **Commit validation absent** — commit fields stored but never enforced; db/config technical categories have no column at all.
7. **Type drift** — `rh_release_signoffs` exists in DB, missing from `src/integrations/supabase/types.ts`.

## 10. Component Mapping (needed UI → Atlassian → Catalyst canonical → reuse file)

| Needed UI | Atlassian component | Catalyst canonical | Reuse file |
|---|---|---|---|
| Tabular lists (releases/changes/SOP/events/freeze) | @atlaskit/dynamic-table | **JiraTable** | `src/components/shared/JiraTable/JiraTable.tsx` |
| Status / health / risk pill | @atlaskit/lozenge | **StatusLozenge** | `src/components/shared/StatusLozenge/StatusLozenge.tsx` |
| Page title + breadcrumb (mirror project module — LOCKED) | (Grid E — no raw breadcrumbs) | **ProjectPageHeader** `hubType="release"` | `src/components/layout/ProjectPageHeader.tsx` |
| Breadcrumb rendering (internal, never called raw) | @atlaskit/breadcrumbs | **ads/Breadcrumbs** (wrapped by ProjectPageHeader) | `src/components/ads/Breadcrumbs.tsx` |
| Create/edit + Replay preview | @atlaskit/modal-dialog | **ads/Modal** | `src/components/ads/Modal.tsx` |
| Users / approvers | @atlaskit/avatar(-group) | **CatalystAvatar** | `src/components/shared/CatalystAvatar.tsx` |
| Assignee picker | @atlaskit/user-picker | user-picker rendering **CatalystAvatar** per option (Grid G3) | (new wrapper; base `@atlaskit/user-picker`) |
| Warnings / freeze conflict / override / prod-no-release | @atlaskit/section-message | **ads/SectionMessage** | `src/components/ads/SectionMessage.tsx` |
| Transient deploy notifications | @atlaskit/flag | **ads/Flag** | `src/components/ads/Flag.tsx` |
| Execution window pickers | @atlaskit/datetime-picker | **CatalystDueDateField** (or datetime-picker direct) | `src/components/shared/CatalystDueDateField/CatalystDueDateField.tsx` |
| SOP step reorder | @atlaskit/pragmatic-drag-and-drop | pattern from kanban/timeline | `src/features/kanban-board/components/*`, `src/components/shared/Timeline/*` |
| Sign-off dependency visual | (custom SVG) | **DependencyWheelMap** | `src/components/dependencies/DependencyWheelMap.tsx` |
| Tabs (replace custom drawer tabs) | @atlaskit/tabs | @atlaskit/tabs (unbanned 2026-06-26) | `@atlaskit/tabs` |
| Readiness % | @atlaskit/progress-bar | @atlaskit/progress-bar | `@atlaskit/progress-bar` |

## 11. Alarm List — Missing Components (must build, ADS-composed)

1. **ExecutionTimer** — live elapsed badge from `started_at` (primary Change Detail, secondary For You, tertiary Release Detail). No canonical timer exists.
2. **CommitIdField** — mono text input, required-by-step-type validation. No commit-input pattern exists anywhere in repo.
3. **SignoffDependencyBoard** — interactive release+change dependency visual. Reuse DependencyWheelMap engine; new data adapter for signoff dependencies.
4. **ProductionEventReplayPage** — full-page snapshot playback + scrubber. Note: `src/lib/replay/**` builds journeys from `ph_issues` (work-item history) — **not** from `rh_production_events` snapshots; a new adapter is required, existing replay lib is not directly reusable.
5. **EmergencyOverridePanel** — request + approve + audit + badge.
6. **ProdNoReleaseJustification** — SectionMessage blocker + reason capture on production change without release.
7. **SopHourlyCalendarLane** — hourly execution overlay for ReleaseCalendarPage.

## 12. Required Migrations

> All target **staging cyij first** (feedback: staging-first, no prod writes). Slug contract applies to any URL-navigated new table. Ledger discipline: 1 file : 1 version.

1. `rh_sop_steps` add `database_commit TEXT`, `configuration_commit TEXT` (decision #9); add `scheduled_start TIMESTAMPTZ`, `scheduled_end TIMESTAMPTZ`, `due_date TIMESTAMPTZ` (decision #8).
2. **Commit enforcement** — CHECK/trigger: `step_type ∈ {frontend,backend,integration,database,configuration}` AND `status='done'` ⇒ matching commit NOT NULL (decision #9).
3. **Incident linkage** — `rh_incident_links` (incident_id, release_id?, change_id?, sop_step_id?, linked_at, linked_by) OR add nullable `change_id`/`sop_step_id` to incidents + bridge; decide via Data/Safety guard (decision #5).
4. **Emergency override workflow** — `rh_emergency_override_requests` (change_id, requested_by, reason, status, approver_id, actioned_at) + audit rows into `rh_change_activity_log` (decision #6).
5. **Change-level production events** — trigger/hook: change `target_env='production'` → `implemented` inserts `rh_production_events(change_id, event_type='change', …)`; + release rollup view (decision #7).
6. **Signoff dependencies** — `rh_signoff_dependencies` (from_signoff_id, to_signoff_id, level release|change, blocks_transition) (decision #12).
7. **Prod-change-needs-release justification** — column `prod_no_release_justification TEXT` on rh_changes + guard (decision #1).
8. **Type regen** — `supabase gen types` to close `rh_release_signoffs` drift (no DDL; ledger note).
9. **rh_changes slug (Grid F, LOCKED)** — add `slug TEXT NOT NULL UNIQUE` + `generate_slug()` trigger (derive from chg_number/title); register `Routes.releaseHub.change(slug)` builder + `useChangeBySlug`; new detail route `/release-hub/changes/:changeSlug`; legacy `:changeId` → UuidToSlugRedirect.

## 13. Required Hooks / Services

| Hook / service | Purpose | Tables |
|---|---|---|
| `useAssignedSopSteps(userId)` | For-You SOP cards (decision #3) | rh_sop_steps (owner_id = auth.uid) |
| `useSopStepTimer(step)` | elapsed compute for ExecutionTimer (decision #4) | rh_sop_steps.started_at |
| `useUpdateSopStep` (extend) | accept + validate commit_id by step_type (decision #9) | rh_sop_steps |
| `useScheduleSopStep` | set scheduled_start/end/due (decision #8) | rh_sop_steps |
| `useRequestEmergencyOverride` / `useApproveEmergencyOverride` | override workflow + audit (decision #6) | rh_emergency_override_requests, rh_change_activity_log |
| `useLinkIncidentToExecution` | incident → release/change/sop step (decision #5) | rh_incident_links |
| `useCreateChangeProductionEvent` | change→event auto-gen + rollup (decision #7) | rh_production_events |
| `useProductionEventReplay(eventKey)` | full-page snapshot playback (decision #10) | rh_production_events |
| `useSignoffDependencies(scope)` | dependency graph data (decision #12) | rh_signoff_dependencies, rh_change/release_signoffs |
| `useValidateProdChangeHasRelease` | block + justification (decision #1) | rh_changes, rh_change_release_links |
| extend `useReleaseCalendar` | hourly SOP execution lane (decision #8) | rh_sop_steps (scheduled_*) |

## 14. Required Chrome MCP Proof Routes

App at `localhost:8080` (project rule). Screenshot + DOM/network probe each after each phase:
1. `/release-hub/changes/:changeId` — SOP tab: live timer running; commit-required validation blocks "Done".
2. `/release-hub/changes/:changeId` — production change w/o release shows SectionMessage blocker + justification field.
3. `/release-hub/changes/:changeId` — emergency override badge + audit trail visible.
4. `/for-you` — "My SOP steps" cards render assigned steps + secondary timer.
5. `/release-hub/sign-off-queue` — dependency visual renders release + change gates, blocked edges.
6. `/release-hub/calendar` — hourly SOP lane places scheduled steps.
7. `/release-hub/production-events` → row → `/release-hub/production-events/:eventKey` full-page Replay (modal = preview only).
8. Regression: `/release-hub/releases-management/:slug`, `/release-hub/changes` — **no side drawers** open on row click (full page instead).

## 15. Phase-by-Phase Implementation Plan

> Each phase ≤ 2h slice, Karpathy-logged, screenshot-gated, ADS-audited, staging-first. Stop for Plan Lock approval before Phase 1.

- **P0 — Drawer ban enforcement (decision #11):** replace ChgDrawer/ReleaseDrawer/ReleasePeekPanel/AIInsightsDrawer with full-page detail + focused ads/Modal preview; delete dead ReleaseComparePage/TriageQueuePage or rebuild via JiraTable. Fix bare `<input type="date">` → CatalystDueDateField.
- **P1 — Commit discipline (decision #9):** migration (db/config commit cols) + CommitIdField + useUpdateSopStep validation.
- **P2 — Execution timer (decision #4):** ExecutionTimer component; primary Change Detail, tertiary Release Detail.
- **P3 — For You SOP (decisions #3, #4):** useAssignedSopSteps + operational cards + secondary timer.
- **P4 — Prod-change-needs-release (decision #1):** justification column + guard + SectionMessage blocker + Releases-list unlinked signal.
- **P5 — Emergency override (decision #6):** workflow tables + hooks + request/approve panel + override badge + audit.
- **P6 — Incident linkage (decision #5):** bridge table + link hooks + back-links on Change/Incident detail.
- **P7 — Change events + rollup (decision #7):** change→event auto-gen + release rollup view.
- **P8 — SOP scheduling + hourly calendar (decision #8):** scheduling cols + useScheduleSopStep + calendar hourly lane.
- **P9 — Signoff dependency visual (decision #12):** rh_signoff_dependencies + SignoffDependencyBoard (DependencyWheelMap reuse).
- **P10 — Production Event Replay full page (decision #10):** route + ProductionEventReplayPage + snapshot adapter; modal downgraded to preview.
- **P11 — Cleanup:** type regen (rh_release_signoffs), non-ADS palette → `--ds-*`, HealthPill/RiskPill → StatusLozenge, custom steppers/tabs → @atlaskit/tabs.

---

## CRE Conflicts — RESOLVED (Vikram, 2026-07-06)

1. **Side drawers — RESOLVED: no drawers, anywhere in this functionality.** Every drawer in release-hub (ChgDrawer, ReleaseDrawer, ReleasePeekPanel, AIInsightsDrawer) is removed and replaced with full-page detail + focused `ads/Modal` preview. No new drawer introduced for any Release Ops surface. Scope = release-hub only (does not retroactively ban drawers elsewhere).
2. **Breadcrumbs — RESOLVED: mirror the Project module exactly.** Use `ProjectPageHeader` with `hubType="release"`; it wraps `ads/Breadcrumbs` internally. **Never call raw `@atlaskit/breadcrumbs`.** Convention (copied from project-hub / verified `ReleaseDetailPage.tsx:315`, `FilterDetailPage.tsx:221`):
   - **L1 list pages:** no `trail` prop → `<ProjectPageHeader hubType="release" actions={…} />`.
   - **L2 detail pages:** single-level trail back to list → `trail={[{ text: 'Releases', href: '/release-hub/releases-management' }]}` (or `{ text: 'Changes', href: '/release-hub/changes' }`), plus `title={entityName}`.
   - **L3+ pages:** multi-level trail, all but last item carry `href`; last renders `isCurrent`.
   - Global hub (release) root crumb = "Releases"/"Changes"; do NOT pass `projectKey` for release/change (global hub, not entity-scoped).
   - `trail` item shape: `{ text: string; href?: string; onClick?: () => void }`.
3. **Components — RESOLVED: use Atlaskit.** `@atlaskit/user-picker` for assignees (render CatalystAvatar per option per Grid G3), `@atlaskit/datetime-picker`, `@atlaskit/tabs`, `@atlaskit/modal-dialog` via ads/Modal, `@atlaskit/section-message`, `@atlaskit/lozenge` via StatusLozenge, `@atlaskit/pragmatic-drag-and-drop`.
4. **`:changeId` UUID route — RESOLVED: proceed per recommendation.** New change routes use `:changeSlug` + builder in `src/lib/routes.ts` + `useChangeBySlug`; add slug column + `generate_slug()` trigger to rh_changes (Grid F). Legacy `:changeId` handled via UuidToSlugRedirect.
5. **No CRE type-governance conflict** on rh_* domain (schema/RLS-enforced). Grid C2 (BR↔Incident allowed) supports incident linkage direction.

**All open decisions closed. No CRE hard-stop. Blueprint ready to promote to implementation phases.**
