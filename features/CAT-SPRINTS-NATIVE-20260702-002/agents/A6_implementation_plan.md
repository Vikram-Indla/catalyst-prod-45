# A6 — Implementation Plan (Ordered File Edit Lists)
**Feature:** CAT-SPRINTS-NATIVE-20260702-002 · **Agent:** Implementation Planner · **Date:** 2026-07-02
**Inputs:** 13_COUNCIL_VERDICT.md (verdict + probe evidence + plan adjustments), agents/A2_screen_discovery.md (blast radius + forbidden candidates). All file paths below verified to exist on disk unless marked **NEW**.

**Conventions**
- Migration filenames use `supabase/migrations/YYYYMMDDHHMMSS_<name>.sql`; timestamps below are placeholders in dependency order — regenerate at creation time.
- Every slice ends with: `npx tsc -p tsconfig.app.json` (baseline ~157 errors — no NEW errors), `npm run lint:colors:gate`, `npm run audit:ads:gate`. Vitest is broken on Node 20 → functional proof via Chrome MCP DOM probes + PostgREST curl, never screenshots-as-proof.
- All shared release/sprint files (`WorkItemsSection.tsx`, `ReleaseSidePanel.tsx`, `AddWorkItemsModal.tsx`, `ReleaseDetailPage.tsx`) serve RELEASE_CONFIG and MILESTONE_CONFIG too — **every edit must be `config.kind === 'sprint'`-gated**. Un-gated edits = regression red flag.
- DB probes: staging app DB = `cyijbdeuehohvhnsywig`. Supabase MCP currently points at prod (`lmqwtldpfacrrlvdnmld`) where `ph_jira_sprints` does not exist — run probes via PostgREST against staging, not the MCP.

---

## PHASE P — PROBES (no code, no commits)

### P.1 — Schema + data probes (Size S; partially done, evidence in 13_COUNCIL_VERDICT §Probe Evidence)
Remaining (must run with **service role or authenticated session** — anon RLS returned 0 for ph_issues):
1. Linkage counts on `ph_issues`: rows with `sprint_id IS NOT NULL` vs `sprint_release` JSONB non-empty vs `sprint_name IS NOT NULL`; overlap/mismatch counts. **Gates S0.2a.**
2. `information_schema.columns` full dump for `ph_jira_sprints` (confirm exact live column set before writing the S0.1a migration — slug exists out-of-band; other drift possible).
3. Confirm `vw_sprint_jira_progress` definition (`pg_views.definition`) so S0.2a recreates it faithfully.
4. Native-write test target: identify the exact Catalyst status-mutation paths (workflow-v2 `useWorkflowFoundation`, kanban `useKanbanMutations`) → informs whether S0.1b trigger fires on `ph_issues.status` UPDATE alone.

**Verify:** counts recorded in `06_VALIDATION_EVIDENCE.md`. No files changed.
**Deps:** none. **Blocks:** S0.1a (item 2/3), S0.2a (item 1), S0.1b (item 4).

---

## PHASE 0 — FOUNDATIONS

### S0.1a — Sprint-native columns migration + slug hook fix (Size M)
**Migrations (create):**
1. `supabase/migrations/20260703090000_sprint_native_columns.sql` — codify existing `slug` column + add slug-generation trigger (catalyst_slugify prior art, frozen-on-creation, `-2`/`-3` dedupe); ADD COLUMNS to `ph_jira_sprints`: `deleted_at timestamptz`, `created_by uuid REFERENCES auth.users`, `name_mode text CHECK (name_mode IN ('auto','custom')) DEFAULT 'auto'`, `length_weeks int CHECK (length_weeks IN (1,2))`, `approval_policy text CHECK (approval_policy IN ('any','all','quorum')) DEFAULT 'all'`, `end_date date`; UNIQUE `(project_id, name)`.

**Source edits (ordered):**
2. `src/hooks/useSprintBySlug.ts` — keep `.is('deleted_at', null)` (column now real); add project narrowing via `project_id` join/lookup instead of the admitted global-slug fallback; extend select to `end_date, length_weeks, status, start_date, name_mode, approval_policy, created_by, deleted_at`.
3. `src/lib/entity-hub/config.ts` — SPRINT_CONFIG `buildDetailHref`/`buildWorkHref` (lines 144–147): replace hand-concatenation + `?? 'BAU'` fallback with `Routes.projectHub.sprint/sprintWork` imports from `src/lib/routes.ts`.
4. `src/lib/routes.ts` — no new builders needed (sprint/sprints/sprintWork exist, lines 35–39); only confirm exported types if config.ts import needs them.
5. `src/pages/project-hub/SprintsPage.tsx` — `handleOpenDetail` (line ~218): remove raw-UUID fallback; slug is now guaranteed → route only by slug (slug contract: no UUID params).

**Verify:** PostgREST curl confirms new columns; navigate `/project-hub/BAU/sprints/<slug>` resolves (Chrome MCP DOM probe); UUID URL no longer generated from the list.
**Deps:** P.1(2,3). **Blocks:** everything downstream.

### S0.1b — Native transition write path (Size M) — NEW slice from probe evidence (0 native rows in work_item_transitions)
**Migrations (create):**
1. `supabase/migrations/20260703093000_native_transition_trigger.sql` — `AFTER UPDATE OF status ON ph_issues` trigger → INSERT `work_item_transitions` (`jira_changelog_id NULL`, `from_status`, `to_status`, `transitioned_by = auth.uid()`, `transitioned_at = now()`, `time_in_from_status_ms` computed from the previous transition row for the issue).

**Source edits:** none (DB-level; deliberately keeps ~6 status-mutation call sites untouched — no blast-radius edits).
**Verify:** change one issue's status in Catalyst UI → `SELECT count(*) FROM work_item_transitions WHERE jira_changelog_id IS NULL` ≥ 1 with correct from/to and ms. Then flip status back; ms plausibility check. Record in 06_VALIDATION_EVIDENCE (this is Analytics Gate leg 2).
**Deps:** P.1(4). **Blocks:** S3.4, S3.5 (hard gate); enriches S3.1 context.

### S0.2a — FK backfill + progress-view repoint (Size M)
**Migrations (create):**
1. `supabase/migrations/20260703100000_sprint_fk_backfill.sql` — UPDATE `ph_issues.sprint_id` from `sprint_release` JSONB name-match and `sprint_name` text match against `ph_jira_sprints.name` (count assertions inline via `DO $$ ... RAISE EXCEPTION` if matched-count ≠ P.1 probe count); CREATE OR REPLACE `vw_sprint_jira_progress` to aggregate on `sprint_id` FK instead of `sprint_name`.

**Source edits:** none (view keeps its column contract so `useEntityProgress(SPRINT_CONFIG)` consumers are untouched).
**Verify:** pre/post row counts identical per sprint (`GROUP BY sprint_id` vs old name-match counts); SprintsPage progress column unchanged (DOM probe).
**Deps:** P.1(1), S0.1a. **Blocks:** S0.2b, S0.4, Phase 1 reads.

### S0.2b — UI read/write repoint + Jira-sync neuter + changelog instrumentation (Size M/L)
**Source edits (ordered, all sprint-kind-gated):**
1. `src/lib/entity-hub/config.ts` — add `matchIssueByFk?: 'sprint_id'` (or equivalent) to `EntityConfig` + set on SPRINT_CONFIG; leave `matchIssueByField: 'sprint_name'` on nothing (remove for sprint).
2. `src/components/releases/detail/WorkItemsSection.tsx` (lines ~240–261) — sprint branch: query `ph_issues.eq('sprint_id', entityId)` instead of `.contains('sprint_release',[{name}])`. Release/milestone branches untouched.
3. `src/components/releases/detail/AddWorkItemsModal.tsx` — sprint branch: membership mutation writes `sprint_id` (set/clear), AND inserts a `work_item_changelogs` row `field_name='sprint'` (from/to sprint name, actor, timestamp) — council #9 forward instrumentation (no retroactive data exists on staging).
4. `src/lib/jira-integration/useJiraSyncMutations.ts` + `src/modules/workhub/admin/hooks/useSyncEngine.ts` — surgical only: skip `sprint_name`/`sprint_release` overwrite for issues whose `sprint_id` points at a Catalyst-native sprint (`created_by IS NOT NULL` or jira-id-null discriminator — decide in Plan Lock). **Nothing else in these files.**

**Verify:** open sprint detail → same item list as pre-slice (DOM count match); add + remove an item → `sprint_id` set/cleared AND changelog row present; run a Jira sync → native sprint memberships NOT reverted (the 710-row-revert regression test).
**Deps:** S0.2a. **Blocks:** S1.4 chip data, S3.3.
**2h check:** borderline. If sync-engine discrimination proves gnarly, split item 4 into its own micro-slice S0.2c.

### S0.3 — Sprint status vocabulary (Size M)
**Migrations (create):**
1. `supabase/migrations/20260703110000_sprint_status_vocabulary.sql` — UPDATE mapping `in_progress→active`, `released→completed`; widen/replace CHECK on `ph_jira_sprints.status` to `('planning','active','awaiting_approval','completed','canceled','archived')` (add `'draft'` only if Plan Lock keeps it — verdict marks it `draft?`).

**New files:**
2. **NEW** `src/lib/sprints/sprintStatus.ts` — status constants, display labels, Lozenge appearance map (component-owned colors, no hex), allowed-transition guard map aligned to the ph_wf Sprint SDLC catalog (this module's first read surface).

**Source edits:**
3. `src/pages/project-hub/SprintsPage.tsx` — replace `toCellStatus()` released/unreleased mapping (lines 47–51) + StatusFilter options (lines 250–257) with sprintStatus.ts vocabulary (minimal — full toolbar rebuild is S1.1b).
4. `src/lib/entity-hub/config.ts` — only if EntityConfig needs a `statusVocabulary` field for shared dialogs; otherwise untouched.

**Verify:** DB rejects `status='released'` insert on a native sprint; list renders new pills (screenshot + DOM text probe).
**Deps:** S0.1a. **Blocks:** S1.1, S2.2.

### S0.4 — Dead-data soft purge (Size S)
**Migrations (create):**
1. `supabase/migrations/20260703120000_sprint_dead_data_purge.sql` — `UPDATE ph_jira_sprints SET deleted_at = now()` for the 26 dead Jira imports (25 released + 1 archived; WHERE guarded by jira-import discriminator, count-asserted = 26).

**Source edits:**
2. `src/hooks/workhub/useEntities.ts` — sprint-kind-gated `.is('deleted_at', null)` on the list query (and any count query feeding the footer banner).

**Verify:** list shows 0 sprints + correct empty state; PostgREST count with/without filter = 0/26.
**Deps:** S0.2a (backfill references live names first), S0.1a. **Blocks:** clean Phase-1 screenshots.

---

## PHASE 1 — LIST + CREATE

### S1.1 — JiraTable list ⚠ SPLIT REQUIRED (was 1 slice; cannot fit 2h)
**S1.1a — SprintsTable on JiraTable (Size M/L):**
1. **NEW** `src/components/sprints/SprintsTable.tsx` — JiraTable-composed (import from `src/components/shared/JiraTable/JiraTable.tsx`; **consume, never edit** — 3,197-line shared canonical; any gap = written proof + red flag, not a patch). Columns per list spec §10: Sprint (name + 1W/2W lozenge), Status (pill from sprintStatus.ts), Progress (fraction + segmented bar), Start date, Sprint end (overdue → `var(--ds-text-danger)`), Release (chip — placeholder/dash until S1.4), Owner (created_by avatar), ⋯ kebab.
2. `src/pages/project-hub/SprintsPage.tsx` — swap `ReleasesTable` (line 326) → `SprintsTable`; drop `hideSprintsColumn` plumbing. `ReleasesTable.tsx` itself untouched.

**S1.1b — Toolbar parity + removals (Size M):**
3. `src/pages/project-hub/SprintsPage.tsx` — REMOVE Project dropdown (lines 297–303), density/hide ToolbarMenuButton (259–287), Description col dependency; status filter → multi-select checkboxes default non-archived; contextual quick-action ("Start sprint"/"Complete sprint" on eligible rows — action wiring lands in S2.2, button renders disabled/hidden until then); count banner ("This project has N sprints"); replace bare `<div style={{padding:24}}>` loading/error (lines 291–292) with ADS Spinner/EmptyState.

**Verify (each):** screenshot signoff (light+dark) + DOM probe of column headers/filter options; kebab still opens (edit/delete pathways preserved).
**Deps:** S0.3, S0.4. **Blocks:** S1.2.

### S1.2 — Group-by Month/Status + segmented progress (Size M)
1. **NEW** `src/lib/sprints/groupSprints.ts` — Month grouping from `start_date` ("January 2026" headers, newest first) + Status grouping.
2. `src/pages/project-hub/SprintsPage.tsx` — GroupFilter options → Month | Status | None only (delete product/release_date/start_date groupings, lines 159–178).
3. `src/components/sprints/SprintsTable.tsx` — grouped section headers; progress bar segmented by status category.

**Verify:** screenshot + DOM header-text probe; group counts sum to banner count.
**Deps:** S1.1a/b.

### S1.3 — Create modal ⚠ SPLIT REQUIRED
**S1.3a — Auto-naming util + SQL mirror (Size M):**
1. **NEW** `src/lib/sprints/autoName.ts` — `sprintAutoName(projectKey, startDate, lengthWeeks)` → `<KEY>-Sprint <M>.<W> - <DD Mon YY>`; M = start month, W = `ceil(startDay/7)`, end = start+4d (1W) / start+11d (2W). Pure, no Date-locale traps (UTC).
2. **NEW** `src/lib/sprints/autoName.probe.mjs` — node-run assertion script (vitest broken): the corrected council vectors (Sun 04 Jan 26 + 1W → `1.1 - 08 Jan 26`; Feb-start rollover → `2.1`; 2W spanning months named from start month; year-collision case).
3. `supabase/migrations/20260703130000_sprint_autoname_fn.sql` — `sprint_autoname()` SQL mirror + BEFORE INSERT validation (auto mode: name must equal fn output) + custom-name dedupe (`-2` suffix) trigger.

**S1.3b — Modal rebuild (Size M/L):**
4. `src/components/sprints/SprintCreateModal.tsx` — Auto|Custom name toggle (`name_mode`), 1W/2W length picker, start-date picker, computed read-only end date + name recompute on start/length change (Custom frees field; back-to-Auto recomputes), Driver/creator avatar (Jira parity — defaults to creator, writes `created_by`), description. Keep ADS modal primitives + CatalystDatePicker already in file.
5. `src/hooks/workhub/useEntities.ts` — `useCreateSprint`/`useUpdateSprint` payloads: `name_mode, length_weeks, end_date, created_by, approval_policy` (sprint-kind-gated; release/milestone payloads untouched).

**Verify:** node autoName.probe.mjs green; create via UI → DB row name === `sprint_autoname()` output; custom duplicate → `-2`; screenshot of modal.
**Deps:** S0.1a (columns). S1.3b deps S1.3a.

### S1.4 — Release link (Size M/L — keep single, watch the box)
1. `supabase/migrations/20260703140000_ph_release_sprints.sql` — `ph_release_sprints (release_id uuid REFERENCES ph_releases, sprint_id uuid REFERENCES ph_jira_sprints, linked_by uuid, created_at timestamptz DEFAULT now(), PRIMARY KEY (release_id, sprint_id))` + RLS (modeled on rh_release_sprints in `20260618120000_release_operations_schema.sql` — prior art only, do not touch rh_*).
2. **NEW** `src/hooks/useSprintReleaseLink.ts` — link/unlink mutations + linked-release query (name + release_date).
3. `src/components/sprints/SprintCreateModal.tsx` — optional "Link to release" single-select.
4. `src/components/releases/detail/ReleaseSidePanel.tsx` — sprint-kind: editable linked-release chip (retarget the orphaned `src/components/releases/SprintLinker.tsx` chip UX — copy the pattern; decide in Plan Lock whether to import or fork, SprintLinker stays unmounted); release-kind: "Sprints" chips row.
5. `src/components/sprints/SprintsTable.tsx` — Release column: linked release name chip + its release_date.

**Verify:** link in modal → chip on sprint panel + chips row on release detail + list column populated; unlink clears all three; DB join row probe.
**Deps:** S1.3b, S0.2b (detail reads). **2h check:** if the release-side chips row drags, defer it to a micro-slice — sprint-side chip + list column are the acceptance core.

---

## PHASE 2 — LIFECYCLE

### S2.1 — Definition of Done ⚠ SPLIT REQUIRED
**S2.1a — DoD schema + create-modal section (Size M):**
1. `supabase/migrations/20260703150000_ph_sprint_dod.sql` — `ph_sprint_dod (id, sprint_id FK, work_item_type text, done_status text, created_at, UNIQUE(sprint_id, work_item_type))` + RLS + `vw_sprint_dod_state` view (per-type counts at/beyond DoD status using the per-type status catalogs) + seed-default trigger (`'Done'` per type present) on sprint insert.
2. **NEW** `src/hooks/useSprintDod.ts` — read/update DoD rows + vw_sprint_dod_state query.
3. `src/components/sprints/SprintCreateModal.tsx` — "Definition of done" section (per-type status selects; options from existing per-type catalogs — **read** `src/config/defectWorkflow.ts` etc., never edit them).

**S2.1b — Detail-page DoD card (Size M):**
4. **NEW** `src/components/sprints/DefinitionOfDoneCard.tsx` — editable per-type DoD + satisfaction state from the view.
5. `src/components/releases/detail/ReleaseSidePanel.tsx` (or `src/pages/release-hub/ReleaseDetailPage.tsx` section mount — Plan Lock decides) — sprint-kind-gated mount.

**Verify:** create sprint → seeded rows per type present; edit persists; vw counts match hand-counted statuses.
**Deps:** S1.3b (modal), S0.2b (typed membership). **Blocks:** S2.2.

### S2.2 — awaiting_approval flow + policy ⚠ SPLIT RECOMMENDED
**S2.2a — DB flow (Size M):**
1. `supabase/migrations/20260703160000_sprint_approval_flow.sql` — `ph_sprint_approvers`: CHECK `status IN ('pending','approved','rejected')` + `decided_at timestamptz` + `decision_note text`; `sprint_check_dod_satisfaction()` fn + trigger (on ph_issues status change for in-sprint items) flipping active→awaiting_approval when vw_sprint_dod_state all-satisfied.

**S2.2b — Lifecycle actions UI (Size M):**
2. **NEW** `src/lib/sprints/lifecycle.ts` — transition guards (planning→active needs start_date + ≥1 item with warn path; awaiting_approval→completed needs policy satisfied or zero-approver confirm; rejection→active with reason).
3. **NEW** `src/components/sprints/SprintLifecycleActions.tsx` — "Start sprint" / "Request approval" / "Complete sprint" buttons + confirm dialogs (ADS ModalTransition).
4. `src/pages/release-hub/ReleaseDetailPage.tsx` — sprint-kind-gated: mount SprintLifecycleActions in place of the release Release/Archive verbs (release + milestone paths byte-identical).
5. `src/pages/project-hub/SprintsPage.tsx` / `SprintsTable.tsx` — wire the S1.1b contextual quick-action to the same guards.

**Verify:** DoD-satisfy last item → status flips to awaiting_approval (DB probe, never to completed); start-sprint guard blocks empty sprint (DOM); zero-approver complete shows confirm.
**Deps:** S2.1a, S0.3. **Blocks:** S2.3.

### S2.3 — Approver decisions UI (Size M)
1. **NEW** `src/hooks/useSprintApprovals.ts` — approve/reject mutations (writes status, decided_at, decision_note), policy evaluation (any / all / quorum-majority-with-tie-wait), completion/reopen side-effect.
2. `src/components/releases/detail/ReleaseSidePanel.tsx` — sprint-kind-gated Approvals card upgrade: avatars + Pending/Approved/Rejected lozenge + relative time + Approve/Reject-with-note actions; rejection reopens (→active) with reason surfaced.

**Verify:** DB-probe the three policy scenarios (1 approver; 3×all with 1 reject → active; 4×quorum 3-of-4 → completed, 2-2 tie waits); timeline rows carry decided_at.
**Deps:** S2.2a/b.

---

## PHASE 3 — INSIGHTS (HARD-GATED: ship only after (1) S0.1b native write proven, (2) changelog backfill validated for one project, (3) FK sole read path — per verdict)

### S3.1 — Summary cache ⚠ SPLIT REQUIRED
**S3.1a — Cache table + edge fn (Size M):**
1. `supabase/migrations/20260703170000_sprint_summary_cache.sql` — `sprint_summary_cache (id, sprint_id FK, data_hash text, summary jsonb, created_at, updated_at, UNIQUE(sprint_id, data_hash))` — clone of board_insight_cache pattern.
2. **NEW** `supabase/functions/summarize-sprint/index.ts` — fork of `supabase/functions/summarize-release/` with cache-first check + prompt context extended with approvals, contributors, scope changes. (Fork, don't edit summarize-release — release surface must not regress.)

**S3.1b — UI wiring (Size S/M):**
3. **NEW** `src/lib/sprints/summaryHash.ts` — SHA-256 over sorted (issue_key|status|assignee|updated_at) tuples + approver rows + dates/status.
4. **NEW** `src/components/sprints/summarize/useSprintSummary.ts` — cache-first hook (pattern: `src/components/releases/detail/summarize/useReleaseSummaryStream.ts`).
5. `src/pages/release-hub/ReleaseDetailPage.tsx` — sprint-kind-gated: Summarize Sprint button (CatyPulseIcon, canonical magenta, never muted) → cached inline CatyInsightCard.

**Verify:** first click generates + caches; second click (no data change) served from cache (network probe: no edge-fn call); mutate an item → hash change → regenerates.
**Deps:** S2.3 (approvals in context). Gate legs 1–3.

### S3.2 — Dependencies section (Size M)
1. **NEW** `src/components/sprints/SprintDependenciesSection.tsx` — unresolved `work_item_dependencies` where dependent is in-sprint; reuse `src/services/dependencyService.ts` (read-only reuse, no edits).
2. `src/pages/release-hub/ReleaseDetailPage.tsx` — sprint-kind-gated mount.

**Verify:** seed a dependency → renders; resolve → disappears (DOM probe).
**Deps:** S0.2b.

### S3.3 — Scope-change history (Size M)
1. **NEW** `src/hooks/useSprintScopeChanges.ts` — `work_item_changelogs` `field_name='sprint'` for the sprint (forward-accrued from S0.2b instrumentation only — zero retroactive rows on staging; render nothing when empty, zero-assumption).
2. **NEW** `src/components/sprints/ScopeChangeSection.tsx` — "Added after start" table (item, who, when, days-before-end; last-day adds warning lozenge). Table = JiraTable or ADS DynamicTable per Plan Lock proof.
3. `src/pages/release-hub/ReleaseDetailPage.tsx` — sprint-kind-gated mount (report section).

**Verify:** add item after sprint start → row appears with actor + timestamp; empty sprint shows nothing (not fabricated rows).
**Deps:** S0.2b (instrumentation), S2.2 (start-date semantics).

### S3.4 — Sprint health (Size M)
1. **NEW** `src/lib/sprints/healthScore.ts` — deterministic `100 − penalties` (pace gap, open blocker deps, overdue, approval stall >48h, unassigned); bands ≥80/50–79/<50. Pure fn + node probe script.
2. **NEW** `src/components/sprints/SprintHealthCard.tsx` — CatyPulseIcon trigger beside More actions; enabled ONLY when (transitions populated ∧ dates set ∧ ≥1 item), disabled tooltip lists what's missing; click → CatyInsightCard panel (% + band + pending list + linked-release date).
3. `src/pages/release-hub/ReleaseDetailPage.tsx` — sprint-kind-gated mount.

**Verify:** node probe on fixture inputs; disabled-state tooltip on a dateless sprint (DOM); score recomputes after status change.
**Deps:** S0.1b (hard), S3.2 (dep data), S1.4 (release date).

### S3.5 — Time-in-status + efficiency (Size L — pre-authorized split if either half overruns)
**S3.5a — Efficiency score:**
1. **NEW** `src/lib/sprints/efficiency.ts` — `40·CR + 25·FE + 20·SS + 15·TA` per verdict §8 (committed = members at start; late adds excluded from CR denominator) + node probe script.
2. **NEW** `src/hooks/useSprintEfficiency.ts` — over `work_item_transitions` (native + backfilled) + scope-change rows.
3. **NEW** `src/components/sprints/SprintEfficiencySection.tsx` — score + "vs last sprint ±n" chip; render nothing for sprints without transition coverage.

**S3.5b — Time-in-status detail:**
4. **NEW** `src/components/sprints/SprintTimeInStatusSection.tsx` — per item per status per assignee-at-the-time (`transitioned_by`), longest-dwell first. Reuse patterns from `src/components/project-hub/dashboard/widgets/TimeInStatusWidget.tsx` (read for pattern; do not edit the widget).
5. `src/pages/release-hub/ReleaseDetailPage.tsx` — sprint-kind-gated mounts.

**Verify:** hand-compute one sprint's CR/FE/SS/TA from raw transition rows = rendered score; dwell table matches transition ms sums.
**Deps:** S0.1b + backfill validation (gate legs 1–2), S2.2 (completed sprints exist), S3.3 (SS inputs).

---

## FILES FORBIDDEN (must NOT be touched)

| File / area | Reason |
|---|---|
| `src/pages/Sprints.tsx` (route :888) | Legacy `iterations`-table Tailwind-era page; separate deprecation feature |
| `src/pages/SprintBoard.tsx` (route :889) | Legacy `iterations` + `stories.sprint_id`; same |
| `src/components/work-items/SprintSelector.tsx` | Legacy `iterations` writer; same |
| `src/modules/in-jira/**` (incl. `useBoardData.ts`) | Separate `injira_sprints` world; independent module |
| `src/components/catalyst-detail-views/shared/sections/statusPalette.ts` | Locked ADS SUBTLE tier (reverted 2026-06-29); pill colors change only there and only with explicit approval — sprint work adds none |
| `src/config/defectWorkflow.ts`, `src/features/kanban-board/data/columnConfig.ts`, `src/types/backlog.types.ts` / workItem/project-hub type status maps, `releasehub.design`, ads/internal status files | Common-status injection split to its own Feature Work ID (council resolution); DoD **reads** these catalogs, never edits |
| `src/pages/releasehub/**` (ReleaseBoardCanonical, ReleasesTimelineCanonical, ReleaseDetailPage, ChangeDetailPage, ReleaseSettingsPage, SopTemplatesPage, ProductionEventsPage) + `src/hooks/useReleaseHub.ts` + rh_* schema | rh_* release-ops module; `rh_release_sprints` is prior-art reference only |
| `src/components/releases/ReleasesTable.tsx` + `src/pages/project-hub/ReleasesPage.tsx` | Release surfaces; sprints EXIT ReleasesTable in S1.1a — its release behaviour (incl. `sprint_names` column) must stay byte-identical |
| `src/components/shared/JiraTable/JiraTable.tsx` | 3,197-line shared canonical; consume only — any needed change = written proof + red flag, separate approval |
| Blast-radius readers: `CatalystSidebarDetails.tsx`, `EditableFields.tsx`, `IssueContentView.tsx`, `WorkItemRow.tsx`, `useKanbanData.ts`, `useBoardCards.ts`, `BasicFilterBar.tsx`, `AdvancedFilterPanel.tsx`, `useUWVData`/backlog/health/replay/R360/csvExport readers | A2 §4 clusters 1–12, 19–21 — read `sprint_release`/`sprint_name`; S0.2a keeps those columns populated for existing data, so no repoint needed in v1; any edit = un-scoped regression |
| `src/lib/jql/**`, `src/components/caty/**`, `src/features/jql-filter/**` | Caty/JQL sprint field mappings; out of scope |
| `src/pages/testhub/**` (SprintTestingStatusPage, useSprintTestingStatus) | Reads sprint_name view aggregates; unaffected while columns persist |
| `useSyncEngine.ts` / `useJiraSyncMutations.ts` beyond the S0.2b surgical skip | Sync engine = highest-blast-radius code in the repo |
| `supabase/functions/summarize-release/**` | Release summary must not regress; S3.1 forks instead |
| `src/components/releases/SprintLinker.tsx` | Orphaned; pattern donor only — copy UX, leave file unmounted/unmodified |

---

## DEPENDENCY GRAPH

```
P.1 ──► S0.1a ──► S0.2a ──► S0.2b ──► S1.4, S3.2, S3.3
P.1 ──► S0.1b ─────────────────────► S3.4, S3.5 (hard gate)
S0.1a ─► S0.3 ──► S1.1a ─► S1.1b ─► S1.2
S0.2a ─► S0.4 ──► (clean Phase-1 screenshots)
S0.1a ─► S1.3a ─► S1.3b ─► S1.4
S1.3b + S0.2b ─► S2.1a ─► S2.1b
S2.1a + S0.3 ─► S2.2a ─► S2.2b ─► S2.3 ─► S3.1a ─► S3.1b
S2.2 + S3.3 + S0.1b ─► S3.5;  S0.1b + S3.2 + S1.4 ─► S3.4
```
Parallelizable lanes after S0.1a: {S0.1b} ∥ {S0.2a→S0.2b} ∥ {S0.3} ∥ {S1.3a}.

## SLICE COUNT SANITY
Council plan: 16 implementation slices + probes. After 2-hour-box audit: **22 slices** (probes + 21 implementation).
Splits imposed: S0.2→a/b (backfill vs UI+sync), S1.1→a/b (table vs toolbar), S1.3→a/b (naming util+SQL vs modal), S2.1→a/b (schema+modal vs detail card), S2.2→a/b (DB flow vs actions UI), S3.1→a/b (cache+edge fn vs UI). S3.5 pre-authorized to split a/b if the first half fills the box. S1.4 and S0.2b flagged borderline with named fallback cuts.
Migration count: 10 files (S0.1a, S0.1b, S0.2a, S0.3, S0.4, S1.3a, S1.4, S2.1a, S2.2a, S3.1a).

## TOP RISKS (ordered)
1. **S0.2 membership semantics** — 21 behavioural surfaces read sprint_name/sprint_release; mitigation: never null those columns in v1, only repoint the sprint detail read path + stop sync overwrites for native sprints.
2. **Sync-engine native-sprint discrimination** (S0.2b item 4) — the exact discriminator (created_by vs jira-id-null) must be decided in Plan Lock before code.
3. **Environment drift** — prod lacks `ph_jira_sprints` entirely; every migration must be staged + verified on cyijbdeuehohvhnsywig, and prod rollout is a separate decision.
4. **DoD trigger loops** (S2.2a) — trigger on ph_issues status update also feeds S0.1b's transition trigger; ordering + recursion guards needed in one migration review.
5. **Shared-file gating** — 4 shared release files edited across 7 slices; each edit reviewed against RELEASE/MILESTONE render paths (regression red-flag protocol).
