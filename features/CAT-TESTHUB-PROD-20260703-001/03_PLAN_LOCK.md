# PLAN LOCK — CAT-TESTHUB-PROD-20260703-001 · TestHub Production Revamp

**STATUS: DRAFT — AWAITING VIKRAM APPROVAL**
**Approved by:** — (pending)
**Format:** Catalyst VeriMAP Plan Lock (per `docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md`, phased multi-slice variant)
**Drafted:** 2026-07-03 (overnight planning cycle) · **Basis:** council A1/A2/A4/A6 + discovery 01–14 + `discovery/07_lessons_past_mistakes.md`
**Timebox model:** every slice ≤ 2 hours hard; one correction loop, then accept / split / rebuild / stop+revert.
**MVP line:** end of P1. **Pre-prod-tomorrow line:** P0 complete + P1-S1…S5 (versioning integrity). Shipping pre-prod before P1-S2 means testers can rewrite execution history — do not.

> Recommended Claude conversation title: `CAT-TESTHUB-PROD-20260703-001 — TestHub production revamp execution`

---

## 0. PRE-FLIGHT GIT STATE (captured 2026-07-03, main @ da6b9eba7)

```
pwd:            /Users/vikramindla/Documents/GitHub/catalyst-prod-45
branch:         main
HEAD:           da6b9eba7 feat(workflows): F1 custom-type workflow binding + F3 table reason capture
dirty (FOREIGN SESSION — Workflow Studio, DO NOT STAGE OR TOUCH):
  M features/CAT-WORKFLOW-STUDIO-20260702-001/sessions/001_discovery_council_plan_p0.md
  M src/hooks/workflow-v2/useWorkflowFoundation.ts
  M src/pages/admin/workflows/studio/EditorPanels.tsx
  M src/pages/admin/workflows/studio/PublishModal.tsx
  M src/pages/admin/workflows/studio/StudioTabs.tsx
  M src/pages/admin/workflows/studio/WorkItemTypesTab.tsx
  M src/pages/admin/workflows/studio/WorkflowEditorPage.tsx
untracked:      features/CAT-TESTHUB-PROD-20260703-001/** (this feature folder)
stashes:        4 (session-logs, phase2-rebase-drift-2, phase2-rebase-unrelated-drift, epitaxy pre-switch)
```

**Concurrency law for execution (L25, CLAUDE.md hard-stop):** another live session owns Workflow Studio files on this checkout. Execution sessions for THIS feature **isolate in a git worktree** if any other session is active. Never `git add -A` / `git add .` — explicit paths only. Every commit's staged list must contain only files authored by this session. Before every linked/MCP DDL batch: `cat supabase/.temp/project-ref` must print `cyijbdeuehohvhnsywig` (staging cyij). Prod `lmqwtldpfacrrlvdnmld` is untouchable.

---

## 1. OBJECTIVE

Take the routed `/testhub/*` module from "~80% real with a lying UI" to a production-credible test-management product (Xray/TestRail class) usable by a 500+-seat QA org in pre-prod. Done means: **(P0)** every routed TestHub surface either works or visibly fails — zero fake data, zero success-toasts over no-ops, zero dead navigation, zero theater fields, dead legacy generation deleted; **(P1)** a real regression cycle can run end-to-end without corrupting execution history — immutable runs, single version writer, slugged routes, computed coverage, honest admin; **(P2)** CI ingestion, quality gates on releases, AI governance, collaboration; **(P3)** pull-based delighters. Strategy is A6's: **subtraction before addition** — excise the lie layer first, then repair errors-as-empty, then build.

## 2. NON-SCOPE (binding, explicit)

The following are OUT of scope for this entire Plan Lock. Touching them = drift, stop and RED FLAG:

1. **Reports refactoring — BANNED.** The 26 wired reports (`src/components/testhub/reports/**` bodies, `report-registry.ts` shipped entries, `src/pages/testhub/reports/**` shell) are REUSE-frozen (Vikram, CAT-REPORTS-HUB-20260703-001). Allowed only: (a) NEW registry entries, (b) hook-level additive error-surfacing repairs where a shard marks P0 (P1-S18) with report bodies byte-identical (`git diff --stat src/components/testhub/reports/` reviewed per slice). Any body diff fails review (A1 VETO-8).
2. **Prod DB — BANNED.** No DDL, no data writes, no `supabase link` against lmqw. All DB work targets cyij staging only.
3. **No deprecation of working surfaces.** The B1–B11 preservation baseline (§6) is live functionality; slices may enhance/refactor with per-surface re-proof, never remove capability. "Coming soon" pages are permanently banned (L2).
4. **No src/ code edits in the planning cycle** — this document is the last planning artifact; code starts only after Vikram approval flips STATUS to APPROVED.
5. **No new parallel schema family** (L20): canonical set is `tm_*` + `src/types/test-management.ts`; `th_*`/`test_*` families are dead — never read, never write; no new imports from `useDefectsG25`/`lib/shared-quality` in new surfaces.
6. **Deferred out of MVP:** `tm_baselines`/`tm_watchers` (P3), `tm_coverage_history` (P3), shared-steps library tables (reuse `tm_test_steps.is_shared` — A4 N5), full RLS server-side RBAC enforcement (design note in P2, implementation may slip P3), 3-pane repository split view (pending decision — if MVP is tree+table only, the `ui/resizable` exception is deferred entirely, A1 §6.3).
7. **CreateStoryModal core logic** (`src/components/workhub/create-story/CreateStoryModal.tsx`) — extend via existing props (`defaultWorkType='QA Bug'`, isDefect branch) only.
8. **JiraTable core** (`src/components/shared/JiraTable/**`) — consume, never edit.
9. **`FullAppRoutes.tsx`** outside the `/testhub` + `/admin/test` route blocks.
10. **Any `ph_*` migration** not explicitly listed in a slice.

## 3. SETTLED DECISIONS (pinned — changing any is a formal 09_DECISIONS entry, never a mid-slice pivot)

- **D-PIN-1 Defect model (L3, locked):** `tm_defects` = TestHub store; `ph_issues` QA Bug / Production Incident = delivery-side; hybrid for reports (D-005); creation via canonical `CreateStoryModal defaultWorkType='QA Bug'` isDefect branch. **No FK between tm_defects and ph_issues** (A4 F2 — 4-fold hybrid stands).
- **D-PIN-2 TESTHUB_BUILD_HANDOVER.md is SUPERSEDED** (L1): historical only; every schema claim re-proven against live cyij before a hook is written.
- **D-PIN-3 Reports contract:** new reports = new registry entries; chart engine = Recharts 3 + `--ds-chart-categorical-1…8`; only sanctioned hex = recharts SVG palette with `ads-scanner:ignore-line` (L19).
- **D-PIN-4 Rich text = ADF path:** `AtlaskitEditor` / `AdfDescriptionField` + `AtlaskitRenderer`; `CatalystRichTextEditor` is a `never`-typed tombstone (A1 VETO-1); prefer `*_adf` columns (precedent tm_defects, 663607f70) over HTML round-trips. No tiptap / `jira-description-editor` imports (VETO-6).
- **D-PIN-5 One counter = one DB maintainer or no counter** — prefer views for anything new (A4 §2.4; L5).
- **D-PIN-6 Enum bridges:** one canonical enum-bridge module per entity; raw status string literals in queries are banned (L8).

**Decisions REQUIRED from Vikram at approval (defaults proposed; approving this Plan Lock approves the defaults):**

| # | Decision | Default (proposed) | Alternative |
|---|---|---|---|
| D-REQ-1 | `tm_cycle_sets` join table vs expand set membership into `tm_cycle_scope` at add-time (A4 N1 vs A6 P0-S8) | **Create `tm_cycle_sets`** (additive, unblocks a silently-failing routed surface tomorrow; DROP-able) | Scope-expansion model (one membership model, no new table) — costs a SetDetailPage rewrite, moves fix out of P0 |
| D-REQ-2 | `tm_case_status` `needs_update`: add enum value vs drop from UI (A4 E2) | **Drop from UI type** (enum ADD VALUE is irreversible) | `ALTER TYPE ADD VALUE` with written "irreversible" note |
| D-REQ-3 | `tm_defect_links` code/schema mismatch: ADD the 4 columns vs rewrite insert (A4 F3) | **ADD columns** (additive, unblocks auto-link chain) — final call after probe P0.2 | Rewrite `useDefects.ts:352-361` to real columns |
| D-REQ-4 | Shared `FolderTree` hand-roll (A1 VETO-5 — the ONLY sanctioned hand-roll, P2/P3) | **Approve as its own line item**: one shared component, pragmatic-drag-and-drop + lazy load, audit-grade story, deletes the existing one-offs | Defer folder drag/move entirely |
| D-REQ-5 | Repository 3-pane MVP? drives `ui/resizable` shadcn exception (A1 VETO-4/§6.3) | **NO for MVP** — tree+table only; exception deferred | Approve resizable as documented exception |

## 4. CANONICAL COMPONENTS SELECTED (A1 verdict table — binding for every slice)

| Element | Canonical | Verdict |
|---|---|---|
| All work-item tables | `src/components/shared/JiraTable` + prefab cells (`makeCheckboxCell/makeKeyCell/makeSummaryCell/makeDateCell/makeStatusCell/makeRowActionsCell`) | USE — mandatory; adoption order §P1-S17 note / A1 §3 |
| Traceability matrix | `src/components/shared/dynamic-table/DynamicTable.tsx` (the 24.7K one, NOT `ads/DynamicTable.tsx`) | USE — documented non-JiraTable choice |
| Drawers / detail | `ads/CatalystDrawer` / `CatalystDetailRouter entityKind='test_case'` / `CatalystViewBase` | USE — portal drawers + zIndex 8000 hacks deleted |
| Modals | `ads/Modal.tsx` (@atlaskit/modal-dialog); destructive = `shared/DangerConfirmModal` | USE |
| Menus | JiraTable `makeRowActionsCell` / `@atlaskit/dropdown-menu` | USE |
| Tabs | `@atlaskit/tabs` (unbanned) — never `ui/tabs.tsx` | USE |
| Status pills / badges | `shared/StatusLozenge`; `@atlaskit/lozenge` appearance map (defined ONCE); `@atlaskit/tag` for labels | USE — delete `src/styles/testhub.css` + `AddTestCasesToCycleDialog/utils.ts:91-119` color maps |
| Rich text | `shared/AtlaskitEditor` / `shared/rich-text/atlaskit/AdfDescriptionField` + `AtlaskitRenderer` | USE (D-PIN-4) |
| Dates / selects / people | `shared/CatalystDueDateField`, `@atlaskit/datetime-picker`, `ads/Select`, `ads/ProfilePicker`, `@atlaskit/user-picker` | USE — ads Select needs `{value,label}` objects (L24) |
| Comments | `shared/CommentsSection` + tm_comments adapter | EXTEND (adapter only) |
| Charts | `testhub/reports/charts/ReportChart` via registry | USE — additive entries only |
| Flags/toasts | `shared/JiraTable/flags.tsx showFlag` | USE — no sonner in new files |
| Empty states | `ads/EmptyState` | USE |
| Bulk actions | `shared/JiraTable/BulkFooterBar` / `shared/BulkSelectionBar` | USE — VETO-3: no token-rethemed hand-rolled bar |
| AI CTAs | `AIIntelligenceButton` or `<Button appearance="primary">` | USE — gradients banned |
| Kanban / Timeline | `kanban/PragmaticBoard` + adapter; `shared/Timeline/TimelineView` | EXTEND — never fork |
| Execution runner shell | canonical page chrome; case pane via CatalystViewBase panel mode | EXTEND — bespoke two-pane tolerated for MVP if chrome+tokens canonical |

**Token-existence rule (A1 VETO-7):** `--ds-border-information`, `--ds-border-success`, `--ds-icon-warning`, `--ds-blanket`, any `--ds-*-hovered` not in the CLAUDE.md table — probe in `@atlaskit/tokens` before writing; absent → use `--ds-border-brand` / `--ds-border` / `--ds-text-warning` / `@atlaskit/blanket` component. No unprobed token names in committed code.

## 5. CANONICAL SCREENS SELECTED

| Screen | Route | Adapter |
|---|---|---|
| Repository | `/testhub/repository` | existing (B1) — enhance in place |
| Cycles / Cycle detail / Runner | `/testhub/cycles`, `/testhub/:projectKey/cycles/:cycleKey`, `…/execute` | existing (B2/B3) — NEUTRAL rewrites get dedicated slices |
| Reports hub | `/testhub/reports/:reportSlug` | frozen (B4) |
| Dashboard/Board/My-work/Defects/Filters | canonical wrappers (ProjectDashboardPage mode='test', KanbanPage mode='test', BacklogPage + sources, project-hub filters hubType='test') | existing (B5) — shared chassis, regression sweep on touch |
| Sets, Timeline, Dependencies, Traceability, Admin | existing routes (B6/B7/B9) | enhance in place |

## 6. PRESERVATION BASELINE — must not regress (A2 §1, abridged; full matrix in council/A2)

B1 repository CRUD+versioning+AI-save-path · B2 cycle CRUD/scope/bulk/comments · B3 runner + **offline queue** + storage attachment uploads (only offline capability in the app) · B4 26/26 wired reports + CSV + redirects (frozen) · B5 canonical wrappers/adapters (shared chassis — a regression here hits project modules) · B6 sets CRUD + `tm_set_cases` membership · B7 timeline drag / dependencies / traceability render · B8 detail views + sidebar · B9 5 admin config pages · B10 DB cascade triggers · B11 releases quality-gate stack (`lib/shared-quality/{useQualityGates,useReadiness}` ← `CatalystShell.tsx:726` — **NOT dead code**).

Any slice touching a B-row's files re-proves that row before merge using the A2 §3 proof block (e.g. B3 = full run + offline drill + attachment probe; B4 = 26-slug smoke + body-diff review; B5 = adapter render + one project-module Backlog screenshot).

**Known-broken today (fixing is additive, not regression):** AI edge fn missing, defect row-click dead URL, Create Cycle silent field drop, sets row-nav unmatched route, zero error states, 11 dead admin sidebar links.

## 7. SEQUENCING CONSTRAINTS (A2 §5 — the Plan Lock encodes them as law)

1. **S1:** version-history/diff UI port lands **before or with** the `src/components/releases/test-case-detail/**` deletion; `src/components/testhub/versioning/VersionDiffView.tsx` is excluded from every orphan sweep (its sole importer lives inside the purge target).
2. **S2:** dead-code purge exclusion list is explicit: keep `src/lib/shared-quality/hooks/useQualityGates*`, `useReadiness*`, `src/components/releases/quality-gates/**`, `src/components/testhub/versioning/**`. Only `src/lib/shared-quality/hooks/useDefects.ts` (zero importers) dies.
3. **S3/S4/S5:** backfill → verify counts → then retire (never retire-first) for `linked_story_key`, `tm_defects.sprint` text, `tm_comments` rows. Grep the 26 report hooks before any column drop.
4. Ghost-table cyij probes precede any code deletion keyed on "absent from types".
5. NEUTRAL rewrites of B1–B3 surfaces each get their own slice with the full proof block — never bundled with feature additions.
6. No slice edits the 26 wired report bodies/hooks (except P1-S18's additive hook repairs, body-diff-gated).

---

## 8. STAGING-PROBE PREAMBLE — P0-S0 (read-only; runs BEFORE any migration is written; blocks all DDL slices)

**SUBTASK P0-S0 · cyij probe batch (A4 §1 verbatim)**
- **Purpose:** close the 14 schema unknowns; the migration ledger over-states the live schema (~73 ghost tables) — "exists in migrations" proves nothing (L4/L7/L9/L10). Also covers L21 (sprint FK target) and trigger forensics (L4).
- **Files to touch:** `features/CAT-TESTHUB-PROD-20260703-001/09_DECISIONS.md` (results recorded), session log. **Zero src/, zero migrations.**
- **Files forbidden:** everything else.
- **Dependencies:** none. May run in parallel with P0-S1 (S1 needs no DDL).
- **Acceptance command:**
```bash
cat supabase/.temp/project-ref   # MUST print cyijbdeuehohvhnsywig before the batch
# then run the 14-probe SQL batch below on cyij (Management API path per memory staging-ddl-via-management-api)
```
- **Probe SQL (exact, one session):**
```sql
-- P0.1 Ghost-relation existence (DAT-013/023, TRC-048, DAT-012, VER-040)
SELECT c.relname, c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('tm_cycle_sets','plan_test_cycles','tm_requirement_tests','tm_requirements',
  'tm_shared_steps','tm_shared_step_categories','tm_scheduled_runs','tm_plan_milestones',
  'tm_saved_filters','tm_notifications','tm_activity_log','tm_ai_embeddings',
  'tm_test_case_templates','tm_user_presence');

-- P0.2 tm_defect_links live columns (DAT-010)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name='tm_defect_links' ORDER BY ordinal_position;

-- P0.3 tm_requirement_links live constraints + orphan/dupe audit (TRC-002/036/038)
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='tm_requirement_links'::regclass;
SELECT count(*) FROM tm_requirement_links l
 LEFT JOIN ph_issues i ON i.id=l.requirement_id
 WHERE l.requirement_id IS NOT NULL AND i.id IS NULL;
SELECT test_case_id, requirement_type, count(*) FROM tm_requirement_links
 WHERE requirement_id IS NULL AND external_key IS NULL
 GROUP BY 1,2 HAVING count(*)>1;

-- P0.4 sprint FK live target (DAT-029, L21)
SELECT conrelid::regclass, confrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conname LIKE '%sprint_id%' AND contype='f';

-- P0.5 FK family split project_id→projects vs tm_projects (DAT-025, L6)
SELECT conrelid::regclass AS tbl, confrelid::regclass AS target
FROM pg_constraint WHERE contype='f' AND confrelid IN
 ('projects'::regclass,'tm_projects'::regclass)
 AND conrelid::regclass::text LIKE 'tm_%';

-- P0.6 RLS zero-policy sweep (DAT-026, L7)
SELECT c.relname FROM pg_class c
WHERE c.relrowsecurity AND c.relname LIKE 'tm_%'
 AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename=c.relname);

-- P0.7 Trigger forensics per core table (DAT-027, VER-012 precondition, L4)
SELECT tgrelid::regclass, tgname, pg_get_triggerdef(oid) FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE 'tm_%' ORDER BY 1;
-- then one authed INSERT/UPDATE/DELETE write-probe per table the plan builds on
-- (tm_test_cases, tm_cycle_scope, tm_test_runs, tm_step_results, tm_defects, tm_set_cases)

-- P0.8 Live enum values (PLN-008, VER-024, DAT-028, L8)
SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
WHERE t.typname IN ('tm_cycle_status','tm_case_status','tm_execution_status',
 'tm_defect_status','tm_defect_severity','tm_test_plan_status') ORDER BY 1, e.enumsortorder;

-- P0.9 Counter drift audit (DAT-024, L5)
SELECT c.id, c.total_cases, s.n FROM tm_test_cycles c
 JOIN LATERAL (SELECT count(*) n FROM tm_cycle_scope WHERE cycle_id=c.id) s ON true
 WHERE c.total_cases IS DISTINCT FROM s.n;
SELECT ts.id, ts.test_count, x.n FROM tm_test_sets ts
 JOIN LATERAL (SELECT count(*) n FROM tm_set_cases WHERE test_set_id=ts.id) x ON true
 WHERE ts.test_count IS DISTINCT FROM x.n;

-- P0.10 Auto-defect trigger behavior (DAT-045/DEF-008): fail a scratch run, then
SELECT id, auto_created_defect_id FROM tm_test_runs WHERE id='<probe-run>';

-- P0.11 Legacy family row counts before any drop/port (DAT-019/021, DEF-040)
SELECT 'test_data_rows' t, count(*) FROM test_data_rows UNION ALL
SELECT 'test_data_parameters', count(*) FROM test_data_parameters UNION ALL
SELECT 'test_cycle_executions', count(*) FROM test_cycle_executions UNION ALL
SELECT 'th_test_executions', count(*) FROM th_test_executions UNION ALL
SELECT 'defects', count(*) FROM defects UNION ALL
SELECT 'tm_test_set_cases', count(*) FROM tm_test_set_cases UNION ALL
SELECT 'tm_test_plan_cases', count(*) FROM tm_test_plan_cases;

-- P0.12 Audit split-brain writers (DAT-056)
SELECT 'tm_audit_log' t, count(*), max(created_at) FROM tm_audit_log
UNION ALL SELECT 'tm_audit_logs', count(*), max(created_at) FROM tm_audit_logs;

-- P0.13 tm_projects duplicate rows before FK repoint (DAT-025 precondition; Senaei BAU dedup, L6)
SELECT key, count(*) FROM tm_projects GROUP BY key HAVING count(*)>1;

-- P0.14 RPC existence for the coverage engine (TRC-043)
SELECT proname FROM pg_proc WHERE proname IN
 ('tm_get_traceability_matrix','tm_get_requirement_test_cases','tm_link_requirement',
  'tm_next_entity_key','tm_evaluate_quality_gates');
```
- **Acceptance condition (binary):** all 14 probe result sets pasted into `09_DECISIONS.md` with a one-line ruling each (exists/absent, drift count, FK target). D-REQ-1/3 defaults confirmed or flipped in writing.
- **Screenshot/evidence:** raw SQL output in 09_DECISIONS.md + session log.
- **Rollback:** n/a (read-only; the one write-probe run row is scratch data on disposable cyij).
- **Done when:** every later DDL slice can cite a probe line instead of the ledger.

---

## 9. PHASE P0 — TRUST REPAIR (12 slices incl. S0 · target: execute tomorrow, ~1.5 days)

**Goal:** every routed `/testhub/*` surface works or visibly fails. Order: subtraction → error truth → route truth → write truth → visual truth. **No P1+ feature slice may start before P0-S1 and P0-S2 merge.**

**Global gates on EVERY slice (all phases):** `npx tsc --noEmit` clean · `npm run lint:colors:gate` pass · `npm run audit:ads:gate` pass · `npm run lint:cre` pass · slice-specific grep assertion returns expected value · light+dark screenshots for UI-touching slices (reload-into-dark, L16) · clear `catalyst-rq-cache` localStorage + hard reload before every data-proof screenshot (L17) · one slice = one commit = one `git revert`.

### SUBTASK P0-S1 · Excise the lie layer — **THE NON-NEGOTIABLE FIRST CODE ACTION**
- **Purpose:** the barrel exports no-op stubs that lie success (`useDeleteTestCase`/`useCreateTestCase`/`useCloneTestPlan` empty mutations; `useTestCycleList`/`useTestCycleListSummary` return `[]`/`null`; `CycleListRow=any`). Any slice landing while a barrel silently swallows mutations can "pass" while doing nothing — which invalidates its own acceptance evidence. Nothing else merges first.
- **Files to touch:** `src/hooks/test-management/index.ts` (delete stubs at :31-52, re-export real implementations from `src/hooks/test-management/useTestCases.ts` :323/:709); importer call-sites surfaced by tsc — importers with no real backing lose the button rather than keep the lie.
- **Files forbidden:** `src/hooks/test-management/useTestCases.ts` internals (re-export only); everything in §2 NON-SCOPE.
- **Dependencies:** none.
- **Acceptance command:**
```bash
[ "$(grep -c 'mutationFn: async (_' src/hooks/test-management/index.ts || true)" = "0" ] \
  && npx tsc --noEmit
```
- **Acceptance condition (binary):** grep = 0 AND tsc clean AND Repository create/delete case round-trips against cyij (row visible in table after cache-clear reload).
- **Screenshot/evidence:** none required (behavioral); SQL probe of created/deleted `tm_test_cases` row in session log.
- **Rollback:** `git revert <commit>`.
- **Done when:** no stub mutation exists anywhere under `src/hooks/test-management/` and the round-trip is proven.

### SUBTASK P0-S2 · Delete the dead legacy generation (landmine sweep)
- **Purpose:** kill wholesale the resurrectable mock layer: 85-fake-row assignment table, Math.random defect modal, mock team/AI-advice tab, console.log calendar, toast-theater quick actions — plus ~10 of the 16 UXD dark-mode P0s that live entirely in these dead folders. Move-not-copy precedent.
- **Files to touch (DELETE):** `src/pages/releases/TestPlansPage.tsx`, `src/pages/releases/TestCyclesPage.tsx`, `src/pages/releases/CycleCommandCenter.tsx`; `src/components/test-plans/**`; `src/components/test-cycles/**`; `src/hooks/test-cycles/**`; `src/features/test-cycles/**`; `src/components/releases/test-cycles/**`, `src/components/releases/smart-assignment/**`, `src/components/releases/add-tests/**`, `src/components/releases/cycle-command-center/**`, `src/components/releases/test-execution/**` (incl. mock `LogDefectModal`); `src/pages/testhub/defects/DefectsPage.tsx` (orphan 468 LOC — the routed one at `src/pages/testhub/DefectsPage.tsx` STAYS); `src/pages/testhub/FilterDetailPage.tsx`; `src/styles/testhub.css` (46.6K, orphan confirmed — re-verify Storybook/dynamic-import at delete time, A1 §6.2).
- **EXCLUSIONS (A2 S1/S2 — do NOT delete):** `src/components/releases/test-case-detail/**` (contains `TestCaseVersionHistory.tsx`, sole importer of `VersionDiffView` — deleted only in P1-S4 after the version-tab port); `src/components/testhub/versioning/**`; `src/lib/shared-quality/hooks/useQualityGates*`/`useReadiness*` + `src/components/releases/quality-gates/**` (LIVE via `CatalystShell.tsx:726`); `src/hooks/test-cycles/useTestReschedule.ts` **if** importer grep shows a routed consumer (P1-S7 target) — excise its dead siblings only.
- **Files forbidden:** everything else; especially `CatalystShell.tsx`, `ReleasesManagementSidebar`.
- **Dependencies:** P0-S1 (tsc surface stable).
- **Acceptance command:**
```bash
# per-family importer guard BEFORE rm (must return only intra-family + usage-map.generated.ts hits):
grep -rn "components/test-plans\|components/test-cycles\|releases/smart-assignment\|releases/add-tests\|releases/cycle-command-center\|releases/test-execution\|releases/test-cycles" src/ | grep -v usage-map.generated
# after deletion:
npx tsc --noEmit && npm run build \
  && [ "$(grep -rc 'generateMockAssignments\|mockTestCases\|mockTeamMembers' src/ | grep -v ':0' | wc -l | tr -d ' ')" = "0" ]
```
- **Acceptance condition (binary):** tsc + build clean; mock-grep = 0; app boots; all 21 testhub routes render.
- **Screenshot/evidence:** 21-route render checklist (screenshot or scripted nav log); rm list enumerated in session log.
- **Rollback:** `git revert` (pure deletion, zero behavior change on routed surfaces).
- **Done when:** no file in the delete list exists, exclusion files still compile, color-baseline ratchet committed if counts dropped (testhub.css death).

### SUBTASK P0-S3 · Silent-error sweep wave 1 — resolvers + execution runner
- **Purpose:** until failures are visible, no acceptance evidence means anything (L9/L11/L17). Fix the runner spine first.
- **Files to touch:** `src/hooks/useTestCycleByKey.ts` (throw on error — DAT-001/PLN-010/EXE-005); `src/pages/testhub/cycles/ExecutionPage.tsx` (scope query error state; **EXE-001** destructure + check `tm_step_results` insert error, no success toast on partial save; **EXE-006** `?caseId` re-select effect runs once, not per refetch); `src/hooks/test-management/useTestCaseExecutionHistory.ts` (kill dead `test_cycle_executions` read + error-as-empty → point at `tm_test_runs` or render explicit error).
- **Files forbidden:** all other runner behavior (offline queue `ExecutionPage.tsx:18-105`, attachment upload :505-526 — byte-identical); §2 list.
- **Dependencies:** P0-S1.
- **Acceptance command:**
```bash
grep -n "const { data } =" src/hooks/useTestCycleByKey.ts src/pages/testhub/cycles/ExecutionPage.tsx src/hooks/test-management/useTestCaseExecutionHistory.ts
```
- **Acceptance condition (binary):** grep shows 0 un-error-checked destructures in the three files; DevTools-forced query failure renders SectionMessage + Retry (not an empty runner); pattern = memory `silent-query-error-sweep` (throw in queryFn; isError → SectionMessage+Retry; isPending → spinner).
- **Screenshot/evidence:** runner error state + normal state, light + dark; B3 offline drill re-proof (A2 §3) since ExecutionPage is touched.
- **Rollback:** revert commit.
- **Done when:** forced failure is visibly an error on the runner spine.

### SUBTASK P0-S4 · Silent-error sweep wave 2 — case + defect hooks
- **Purpose:** same truth repair across the CRUD spine.
- **Files to touch:** `src/hooks/test-management/useTestCases.ts` (×11 sites), `src/hooks/test-management/useDefects.ts` (×10), `src/hooks/useDefectsG25.ts` (error-as-empty :184,:197 + dead `th_test_executions` join → tm_test_runs or explicit error), `src/hooks/test-management/useTestCaseVersions.ts`, `src/hooks/test-management/useTestCycles.ts` (incl. **VER-042**: abort clone on scope-read error), `src/hooks/test-management/useAutoVersioning.ts` (TD-002: throw).
- **Files forbidden:** report hooks (that's P1-S18); §2 list.
- **Dependencies:** P0-S1.
- **Acceptance command:**
```bash
grep -n "const { data } =" src/hooks/test-management/useTestCases.ts src/hooks/test-management/useDefects.ts \
  src/hooks/useDefectsG25.ts src/hooks/test-management/useTestCaseVersions.ts \
  src/hooks/test-management/useTestCycles.ts src/hooks/test-management/useAutoVersioning.ts
```
- **Acceptance condition (binary):** 0 `{data}`-only destructures remaining in listed files; forced-failure renders errors on Repository + Defects.
- **Screenshot/evidence:** forced-failure screenshots Repository + Defects, light+dark.
- **Rollback:** revert commit.
- **Done when:** every listed hook follows the query contract (data, error, isError, isPending).

### SUBTASK P0-S5 · Route truth — defects, sets, traceability
- **Purpose:** no dead navigation.
- **Files to touch:** `src/modules/project-work-hub/adapters/defectsDataSource.ts` (:148-150 `window.location.assign('/testhub/defects/${id}')` → open canonical defect view/modal, NOT a new route yet); `src/pages/testhub/sets/TestSetsPage.tsx` (:435 navigate to a registered route; full slug contract deferred to P1-S14); `src/pages/testhub/traceability/TraceabilityPage.tsx` (TRC-005/006/007: `.eq(project)` server-side, resolve route `projectKey`, error-check scope query).
- **Files forbidden:** `src/lib/routes.ts` beyond what the sets nav needs; `FullAppRoutes.tsx` outside testhub block; §2 list.
- **Dependencies:** P0-S3/S4 (error contract in place).
- **Acceptance command:**
```bash
[ "$(grep -rc 'testhub/defects/\${' src/ | grep -v ':0' | wc -l | tr -d ' ')" = "0" ] && npx tsc --noEmit
```
- **Acceptance condition (binary):** grep = 0; clicking a defect row opens detail without full page reload; traceability network tab shows a project-scoped query.
- **Screenshot/evidence:** defect open, sets nav, traceability — light+dark; B5 adapter proof (my-work + defects row render) since defectsDataSource touched.
- **Rollback:** revert commit.
- **Done when:** zero dead clicks on the three surfaces.

### SUBTASK P0-S6 · Write truth — Create Cycle modal
- **Purpose:** the modal shows fields it silently drops (`releaseId/ownerId/tags/assigneeIds` in state+UI, `handleCreateCycle` :287-301 submits none). Honest removal > theater (zero-assumption law).
- **Files to touch:** `src/pages/testhub/cycles/CyclesPage.tsx`; `src/hooks/test-management/useTestCycles.ts` (extend create input); migration on cyij ONLY if `tm_test_cycles.owner_id` missing (probe first).
- **Do:** wire `ownerId`; wire `releaseId` ONLY if it binds the correct release table — `tm_test_cycles.release_id` FKs legacy `releases` (PLN-025); if wrong id-space, **delete the Release select** rather than wire a lie. **Delete** Tags editor + Assignees tab until a real write path exists.
- **Files forbidden:** cycle status logic (P1-S5); §2 list.
- **Dependencies:** P0-S0 (column probe), P0-S4.
- **Acceptance command:**
```bash
[ "$(grep -c 'assigneeIds' src/pages/testhub/cycles/CyclesPage.tsx || true)" = "0" ] && npx tsc --noEmit
# SQL probe: SELECT id, owner_id FROM tm_test_cycles WHERE id='<new>';  -- owner set
```
- **Acceptance condition (binary):** create cycle with owner → row in `tm_test_cycles` has owner set (SQL output pasted); `assigneeIds` grep = 0.
- **Screenshot/evidence:** modal light+dark; B2 cycle-create re-proof.
- **Rollback:** revert commit (+ DROP COLUMN down-script if migration shipped).
- **Done when:** every visible field in the modal persists, or is gone.

### SUBTASK P0-S7 · Defect write integrity on CycleDetail
- **Purpose:** inline DefectPanel inserts `project_id: item.id` (wrong id) and client MAX-scan keys; converge on the canonical creation path (D-PIN-1).
- **Files to touch:** `src/pages/testhub/cycles/CycleDetailPage.tsx` (DEF-002/UXL-003: rip inline DefectPanel insert; open canonical `CreateStoryModal defaultWorkType='QA Bug'` isDefect branch); `src/hooks/test-management/useDefects.ts` (DEF-007/DAT-009: key gen via `tm_next_entity_key` RPC — existence confirmed by probe P0.14; DAT-010/011: remove auto-link inserts into type-absent relations or fix columns first per D-REQ-3 + probe P0.2).
- **Files forbidden:** `src/components/workhub/create-story/CreateStoryModal.tsx` core (props only); §2 list.
- **Dependencies:** P0-S0 (P0.2/P0.14), P0-S4.
- **Acceptance command:**
```bash
npx tsc --noEmit && npm run lint:cre
# SQL probe: SELECT defect_key, project_id FROM tm_defects WHERE id='<new>';
```
- **Acceptance condition (binary):** create defect from cycle → row with valid `defect_key` + real `project_id` (SQL pasted); zero console PostgREST 4xx during the flow.
- **Screenshot/evidence:** QA Bug modal opened from cycle, light+dark.
- **Rollback:** revert commit.
- **Done when:** the only defect-create path from TestHub is the canonical modal.

### SUBTASK P0-S8 · `tm_cycle_sets` exists or the feature doesn't (D-REQ-1 default)
- **Purpose:** SetDetailPage queries a nonexistent table via `as any` → silent "0 cycles" (L9). Create the table (additive) with the canonical 4 RLS policies in the same migration (L7).
- **Files to touch:** new `supabase/migrations/<unique-ts>_tm_cycle_sets.sql` (cyij apply + committed file, ledger 1:1); regen `src/integrations/supabase/types.ts` in the SAME slice (A4 §2.6); `src/pages/testhub/sets/SetDetailPage.tsx` (drop both `as any` casts at :300,:411).
- **Files forbidden:** any other migration; §2 list.
- **Dependencies:** P0-S0 (P0.1 confirms absence + D-REQ-1 confirmed); timestamp-collision check first (L10).
- **Acceptance command:**
```bash
ls supabase/migrations | cut -d_ -f1 | sort | uniq -d   # must print nothing
[ "$(grep -c "tm_cycle_sets') as any" -r src/ || true)" = "0" ] && npx tsc --noEmit
```
- **Acceptance condition (binary):** add-set-to-cycle round-trips (UI + SQL row); casts grep = 0; migration file committed with ledger row.
- **Screenshot/evidence:** SetDetail cycles tab populated, light+dark.
- **Rollback:** DROP TABLE (additive) — down-script in slice log.
- **Done when:** the routed surface reads a real table through generated types.

### SUBTASK P0-S9 · AI generate — real function + minimal protection
- **Purpose:** "Generate with AI" invokes nonexistent `ai-generate-test-cases`; only `supabase/functions/ai-generate-story-test-cases/` exists.
- **Files to touch:** `src/hooks/test-management/useAIGeneration.ts` (:74 — invoke `ai-generate-story-test-cases` with a prompt-mode branch); `supabase/functions/ai-generate-story-test-cases/` (accept prompt mode + `getUser()` auth check — AI-001/AI-002; zero external imports per L19); mutation `isPending` guard as in-flight dedup (AI-005). Full quota/ledger = P2.
- **Files forbidden:** new edge functions; §2 list.
- **Dependencies:** P0-S1 (real create path).
- **Acceptance command:**
```bash
npx tsc --noEmit
curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$SUPABASE_URL/functions/v1/ai-generate-story-test-cases" -d '{}'   # expect 401 unauthenticated
```
- **Acceptance condition (binary):** Generate on `/testhub/repository` returns cases and persists via the existing `useCreateTestCase` path (rows in `tm_test_cases`); unauthenticated curl → 401.
- **Screenshot/evidence:** dialog before/after generation, light+dark.
- **Rollback:** revert commit + redeploy previous function version.
- **Done when:** the button does what it says, gated by auth, deduped in flight.

### SUBTASK P0-S10 · Routed visual lies — shadow-as-color + banned gradients
- **Purpose:** `--ds-shadow-*` used as background/box-shadow color (UXD-034/035) and gradient CTAs (UXD-022) on live pages.
- **Files to touch:** `src/pages/testhub/cycles/CycleDetailPage.tsx` (:638,:642), `src/pages/testhub/sets/SetDetailPage.tsx` (:155,:166,:324), `src/pages/testhub/sets/TestSetsPage.tsx` (:193), `src/pages/testhub/repository/CaseDrawer.tsx` (:182) — proper scrim `var(--ds-blanket)` (probe first, VETO-7; fallback `@atlaskit/blanket`) / elevation tokens; `src/components/testhub/AIGenerateTestCasesDialog.tsx` (:186,:330,:387,:583 — gradients → ADS Button / AIIntelligenceButton only).
- **Files forbidden:** §2 list; no new `dark:` twins (VETO-2); no `ui/*` imports (VETO-4).
- **Dependencies:** P0-S2 (dead CSS gone).
- **Acceptance command:**
```bash
grep -rn "var(--ds-shadow" src/pages/testhub/cycles/CycleDetailPage.tsx src/pages/testhub/sets/SetDetailPage.tsx \
  src/pages/testhub/sets/TestSetsPage.tsx src/pages/testhub/repository/CaseDrawer.tsx | grep -i "background\|boxShadow" ; \
[ "$(grep -c 'bg-gradient-to-r' -r src/components/testhub/ || true)" = "0" ] \
  && npm run lint:colors:gate && npm run audit:ads:gate
```
- **Acceptance condition (binary):** shadow-as-color grep = 0 in listed files; gradient grep = 0; both gates pass.
- **Screenshot/evidence:** drawers open over content, light + dark (scrim visible in both).
- **Rollback:** revert commit.
- **Done when:** no shadow token used as a color anywhere routed; no gradient outside the two sanctioned AI controls.

### SUBTASK P0-S11 · P0 close-out — runtime verification pass
- **Purpose:** static-only findings must be runtime-proven (L12, L23); baselines ratcheted.
- **Files to touch:** `features/CAT-TESTHUB-PROD-20260703-001/06_VALIDATION_EVIDENCE.md`, `10_SCREENSHOT_CHECKLIST.md`; `design-governance/color-baseline.json` / `audit-baseline.json` (ratchet DOWN only: `node scripts/ads-color-gate.cjs --update`, `node scripts/ads-audit-gate.cjs --update`).
- **Files forbidden:** all src/ (verification only; fixes found here become named slices, not inline patches).
- **Dependencies:** P0-S1…S10 merged.
- **Acceptance command:**
```bash
# one script re-running every P0 grep assertion; all must hold
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate && npm run lint:cre
```
- **Acceptance condition (binary — the P0 exit criterion):** a seeded cyij walkthrough (create case → cycle → execute → fail → defect → report) completes with **zero console errors, zero dead clicks, zero success-toasts-over-nothing**, and forced query failure shows an error on every core surface. 21/21 routes screenshot light+dark.
- **Screenshot/evidence:** full walkthrough screenshots + 21-route light/dark set in 10_SCREENSHOT_CHECKLIST.md.
- **Rollback:** n/a.
- **Done when:** P0 exit criterion signed in 06_VALIDATION_EVIDENCE.md → go/no-go to P1.

---

## 10. PHASE P1 — TABLE STAKES (19 slices, ~4–5 days) — pre-prod usable MVP

**Goal:** a 500-seat QA team runs a real regression cycle without corrupting history or losing data. Dependency order below. Each slice inherits the global gates + the A2 §3 proof block for any touched B-row. Compact SUBTASK blocks; fields identical in meaning to P0.

### P1-S1 · Immutable execution 1 — stop the CASCADE massacre
- **Purpose:** `tm_step_results.test_step_id` is `ON DELETE CASCADE` (VER-002, A4 F4) — every day it stands is unrecoverable data loss. Swap to `SET NULL`/RESTRICT + denormalized `action_snapshot`/`expected_snapshot` columns; soft-delete steps.
- **Files:** new migration (cyij; exact constraint name from cyij per probe, NOT ledger) + types regen; `src/hooks/test-management/useTestSteps.ts`.
- **Forbidden:** `src/pages/testhub/cycles/ExecutionPage.tsx` (next slice); §2.
- **Deps:** P0 complete; probe P0.7.
- **Accept cmd:** `npx tsc --noEmit` + SQL: delete an executed step → step results survive with snapshots.
- **Accept condition:** delete executed step → blocked/soft; `tm_step_results` rows intact (SQL pasted).
- **Evidence:** SQL before/after. **Rollback:** re-add prior FK via down-script (interim deletes unrecoverable — hence EARLY). **Done when:** no execution row can be destroyed by a step edit.

### P1-S2 · Immutable execution 2 — runner reads pinned snapshot
- **Purpose:** runner shows live steps; mid-cycle edits rewrite history (VER-001). Pin `locked_version` at scope-add; runner reads the snapshot.
- **Files:** `src/pages/testhub/cycles/ExecutionPage.tsx`, `src/hooks/test-management/useTestCycles.ts` (scope-add pins version).
- **Forbidden:** offline queue + attachment blocks in ExecutionPage (byte-identical, B3); §2.
- **Deps:** P1-S1, P1-S3 shape agreement.
- **Accept cmd:** `npx tsc --noEmit`; scripted flow: add case to cycle → edit case → open runner.
- **Accept condition:** edit case mid-cycle → runner still shows pinned steps (screenshot + SQL).
- **Evidence:** screenshot light+dark + SQL; full B3 proof block incl. offline drill. **Rollback:** revert. **Done when:** history is execution-time truth.

### P1-S3 · One snapshot writer — DB RPC `tm_create_version_snapshot`
- **Purpose:** collapse 4 client snapshot writers into one RPC; full-field snapshot; maintain `version/current_version/is_latest_version` (VER-005/006/008).
- **Files:** migration (RPC) + `src/hooks/test-management/useAutoVersioning.ts`, `useTestCaseVersions.ts`, `src/services/testCaseAuditService.ts` (path verify at slice start).
- **Forbidden:** §2. **Deps:** P1-S1.
- **Accept cmd:** `grep -rn "tm_test_case_versions" src/hooks src/services | grep -i insert` → exactly 1 path (the RPC call).
- **Accept condition:** 1 snapshot write path; version int increments on edit (SQL).
- **Evidence:** SQL sequence. **Rollback:** revert + DROP FUNCTION. **Done when:** all version writes flow through the RPC.

### P1-S4 · Restore = new version; archive replaces hard delete; version-history port
- **Purpose:** restore must be snapshot-first (no step delete+reinsert, VER-003/004); hard delete leaves history-destroying UI; **and per A2 S1** the version-history/diff UI port from `src/components/releases/test-case-detail/TestCaseVersionHistory.tsx` (VER-022) lands here — then that folder dies.
- **Files:** `src/hooks/test-management/useTestCaseVersions.ts`, `useTestCases.ts`, `src/pages/testhub/repository/RepositoryPage.tsx` bulk bar; port version tab into `CatalystViewTestCase` (keep `src/components/testhub/versioning/VersionDiffView.tsx`); THEN delete `src/components/releases/test-case-detail/**`.
- **Forbidden:** §2. **Deps:** P1-S3.
- **Accept cmd:** `npx tsc --noEmit && npm run build`; importer grep for deleted folder = 0.
- **Accept condition:** restore → history intact (new version row, SQL); delete/bulkDelete gone from UI (confirm-dialog on archive per L13); version diff renders in case detail.
- **Evidence:** screenshots light+dark; B1 proof block. **Rollback:** revert. **Done when:** hard delete is unreachable from UI and history survives restore.

### P1-S5 · Status-vocabulary truth — case enum + cycle FSM
- **Purpose:** `needs_update` 400s (VER-024, D-REQ-2 default: drop from UI); `tm_cycle_status` 7→5 is a full type-swap migration, its own 2h slice (A4 E1: new type → UPDATE map → ALTER USING → drop old → recreate transition trigger); enum-bridge module per entity (L8, D-PIN-6).
- **Files:** migration (type-swap + trigger) + `src/hooks/test-management/useTestCases.ts:9`, cycle status consumers, new `src/lib/testhub/enums.ts` bridge.
- **Forbidden:** §2. **Deps:** P0-S0 (P0.8 live values), P1-S2.
- **Accept cmd:** scripted bulk update through each status value → all 200; `grep -rn "'PLANNED'\|'IN_PROGRESS'" src/pages/testhub src/hooks/test-management` → 0 raw literals.
- **Accept condition:** enum values = UI values exactly; every transition validated by the single trigger.
- **Evidence:** network log + SQL enum dump. **Rollback:** reverse type-swap (values preserved by map) — down-script mandatory. **Done when:** one vocabulary end to end.

### P1-S6 · Cycle CRUD consolidation — one hook stack
- **Purpose:** duplicate hook families cause stale caches (PLN-011). One `['tm-cycles'…]` query-key family; delete `useTestCyclesEnhanced`/duplicate mutations.
- **Files:** `src/hooks/test-management/useTestCycles.ts` + importers; DELETE `src/hooks/test-management/useTestCyclesEnhanced.ts`.
- **Forbidden:** §2. **Deps:** P1-S5.
- **Accept cmd:** `[ "$(grep -rc 'useTestCyclesEnhanced' src/ | grep -v ':0' | wc -l | tr -d ' ')" = "0" ] && npx tsc --noEmit`.
- **Accept condition:** one key family; mutation → visible refresh on all cycle surfaces (screenshot).
- **Evidence:** B2 proof block. **Rollback:** revert. **Done when:** grep = 0.

### P1-S7 · Reschedule truth — per-scope-item dates
- **Purpose:** reschedule rewrites the whole cycle (PLN-012).
- **Files:** migration (scope date cols, additive) + `src/hooks/test-cycles/useTestReschedule.ts` (survivor of P0-S2 exclusion) or its successor location.
- **Forbidden:** §2. **Deps:** P1-S6.
- **Accept cmd:** SQL: reschedule one test → other rows' dates unchanged.
- **Accept condition:** binary per SQL. **Evidence:** SQL before/after. **Rollback:** DROP COLUMNs. **Done when:** per-item dates persist.

### P1-S8 · Plan↔cycle single spine
- **Purpose:** migrate `plan_test_cycles` usage → `tm_test_cycles.test_plan_id` FK (PLN-014); row-probe P0.11 first.
- **Files:** `src/hooks/useTestPlansG26.ts` (verify path at slice start) + migration if backfill needed.
- **Forbidden:** §2. **Deps:** P0-S0 (P0.11).
- **Accept cmd:** `[ "$(grep -rc 'plan_test_cycles' src/ | grep -v ':0' | wc -l | tr -d ' ')" = "0" ]`.
- **Accept condition:** grep = 0; plan detail still lists cycles. **Evidence:** screenshot. **Rollback:** revert. **Done when:** one spine.

### P1-S9 · Traceability single link model 1 — FK + backfill
- **Purpose:** `tm_requirement_links.requirement_id` bare uuid → FK ph_issues + `project_id` column (TRC-001/002/038, A4 F1). Order: orphan cleanup (probe P0.3) → ADD COLUMN + backfill → ADD CONSTRAINT NOT VALID → VALIDATE. Backfill `linked_story_key` rows into links (DAT-031) — **retire-first banned** (A2 S3): backfill row-count proof, reader repointed, then retire.
- **Files:** migration + backfill script (cyij) + types regen.
- **Forbidden:** the two readers (next slice); §2. **Deps:** P0-S0 (P0.3).
- **Accept cmd:** SQL: orphan-link count = 0; every non-null `linked_story_key` has a links row (count equality pasted).
- **Accept condition:** binary per SQL; both old readers still see the same links. **Evidence:** SQL. **Rollback:** DROP CONSTRAINT/COLUMN. **Done when:** FK VALIDated.

### P1-S10 · Traceability 2 — picker + unified readers
- **Purpose:** free-text requirement entry → ph_issues picker; both readers read the links table (TRC-003/018).
- **Files:** `src/components/catalyst-detail-views/**/CatalystViewTestCase.tsx` req tab, `src/modules/project-work-hub/components/story-test-cases/TestCasesSection.tsx`, `src/components/catalyst-detail-views/story/TestCoveragePanel.tsx`.
- **Forbidden:** §2; respect the `requirement_type` CHECK (L22) — defect/incident via `external` + external_key until E4 (P2) widens it.
- **Deps:** P1-S9. **Accept cmd:** grep free-text inputs in the req tab → 0.
- **Accept condition:** story view + case view show identical link set (screenshot pair). **Evidence:** light+dark. **Rollback:** revert. **Done when:** one link model, one reader path.

### P1-S11 · Computed coverage — view/RPC engine
- **Purpose:** OK/NOK/NOT-RUN derived from latest run per linked case (TRC-004, A4 N3: `v_tm_requirement_coverage` VIEW + RPC — never denormalized); manual `coverage_status` writes removed.
- **Files:** migration (CREATE OR REPLACE VIEW/FUNCTION) + `src/hooks/test-cases/useRequirementLinks.ts`, `src/pages/testhub/traceability/TraceabilityPage.tsx`.
- **Forbidden:** report bodies (reports #25/26 repoint is P2/RPT-025 boundary); §2. **Deps:** P1-S9/S10; probe P0.14.
- **Accept cmd:** scripted: fail a run → linked story flips NOK with no manual action (SQL + screenshot).
- **Accept condition:** binary per flow. **Evidence:** light+dark. **Rollback:** CREATE OR REPLACE back / DROP. **Done when:** coverage is computed, single engine.

### P1-S12 · Defect spine 1 — single hook layer
- **Purpose:** kill `g25-*` duplicate query keys; project-scoped stats; sprint dual-column write fixed (DEF-005/012/013). Sprint TEXT column retirement follows A2 S4: grep all readers incl. 26 report hooks BEFORE any drop; dual-read window; drop is a later slice.
- **Files:** `src/hooks/test-management/useDefects.ts`, `src/hooks/useDefectsG25.ts` (retire g25 keys; delete `src/lib/shared-quality/hooks/useDefects.ts` — zero importers, A2 S2), `src/components/workhub/create-story/CreateStoryModal.tsx` **props-level only** (:845-871 sprint write).
- **Forbidden:** CreateStoryModal core; report hooks; §2. **Deps:** P0-S7.
- **Accept cmd:** `grep -rn "\['g25-" src/hooks` → 0; `npm run lint:cre`.
- **Accept condition:** one key family; stats change when switching project (screenshot). **Evidence:** light+dark. **Rollback:** revert. **Done when:** one defect hook spine.

### P1-S13 · Defect spine 2 — canonical detail everywhere
- **Purpose:** defect detail = canonical view everywhere; slugged/keyed route; history reads `tm_test_runs` (DEF-004/010, VER-032).
- **Files:** `src/lib/routes.ts` (+ `FullAppRoutes.tsx` testhub block) + CatalystViewDefect wiring.
- **Forbidden:** §2. **Deps:** P1-S12, P1-S14 ordering flexible (key routes only, no `:id`).
- **Accept cmd:** deep-link `defect_key` URL renders (scripted nav).
- **Accept condition:** deep-link opens; history tab shows real runs. **Evidence:** light+dark. **Rollback:** revert. **Done when:** no modal-only defect detail.

### P1-S14 · Slug contract sweep (CLAUDE.md ⛔)
- **Purpose:** kill `:id` params in the testhub block (TD-001, PLN-053). Per A4 §2.5: sets use existing `set_key` (**no DDL**); filters need additive `slug` on SHARED `saved_filters` (+ `generate_slug()` trigger + backfill ALL modules' rows — coordinate); plans/defects/cases/cycles already keyed (routes/builders/hooks only). UUID redirects outside CatalystShell.
- **Files:** migration (saved_filters slug) + `src/lib/routes.ts` + `useXBySlug`/`useSetByKey` hooks + `FullAppRoutes.tsx` testhub block.
- **Forbidden:** other modules' filter pages beyond the shared-column backfill; §2. **Deps:** P0-S5.
- **Accept cmd:** `grep -n ":id" src/FullAppRoutes.tsx` testhub block → 0 (path of routes file verified at slice start).
- **Accept condition:** grep = 0; every entity URL-addressable by slug/key; legacy UUID URL redirects. **Evidence:** nav screenshots. **Rollback:** DROP COLUMN + revert. **Done when:** slug contract holds module-wide.

### P1-S15 · Runner UX floor
- **Purpose:** navigation guard on dirty state (EXE-003), manual verdict for step-less cases (EXE-004), offline attachment warning — block or warn, never discard (EXE-002 minimum).
- **Files:** `src/pages/testhub/cycles/ExecutionPage.tsx`.
- **Forbidden:** offline queue internals beyond the warning hook-in; §2. **Deps:** P1-S2.
- **Accept cmd:** scripted: navigate away dirty → confirm dialog appears.
- **Accept condition:** dirty-nav confirm; 0-step case can record verdict. **Evidence:** light+dark + B3 offline drill re-proof. **Rollback:** revert. **Done when:** no silent data loss paths in the runner.

### P1-S16 · Admin truth
- **Purpose:** remove 11 dead sidebar links; case-status admin reflects real enum; run-statuses page → real `tm_execution_status` or removed; ModuleGate on `/testhub/*` (ADM-001/002/003/006).
- **Files:** `src/components/admin/AdminSidebar.tsx` (verify path), admin test pages, `FullAppRoutes.tsx` testhub block.
- **Forbidden:** §2. **Deps:** P1-S5 (enum truth).
- **Accept cmd:** scripted click of every admin sidebar link → all resolve; URL access with role=hidden → gated.
- **Accept condition:** binary per script. **Evidence:** light+dark. **Rollback:** revert. **Done when:** admin shows nothing it can't do.

### P1-S17 · Dark/ADS sweep of ROUTED surfaces
- **Purpose:** 95 Tailwind color hits, `.th-badge` pattern remnants, remaining routed `dark:` gaps → tokens/Lozenge (UXD remainder). One semantic token, both themes (VETO-2). JiraTable adoption for the banned tables runs per A1 §3 order as sub-work here or as split slices if >2h each: TestSetsPage grid → JiraTable; SetDetailPage 2 raw tables + modals; CycleDetailPage scope table + drawer deletion.
- **Files:** routed testhub pages/components only; `src/components/testhub/AddTestCasesToCycleDialog/utils.ts` (:91-119 color maps deleted).
- **Forbidden:** report bodies; JiraTable core; §2. **Deps:** P0-S10.
- **Accept cmd:** `npm run audit:ads:gate` with baseline ratcheted DOWN and committed; `grep -rn "dark:" src/pages/testhub src/components/testhub` → 0 new twins.
- **Accept condition:** baselines strictly lower than P0 start; 4 banned tables are JiraTable or deleted. **Evidence:** dark screenshots all routes. **Rollback:** revert per sub-slice. **Done when:** routed TestHub is token-pure.

### P1-S18 · Report hook repairs (ADDITIVE ONLY — tripwire slice)
- **Purpose:** throw-on-error in the 7 silent report hooks; project/sprint-scoped queries replace org-wide scans; "capture since" disclosure line (RPT-001/002/006, TRC-022/023). **Bodies forbidden** — this is the VETO-8 boundary.
- **Files:** `src/components/testhub/reports/hooks/useSprintTestingStatus.ts` + the 6 sibling hooks (enumerate at slice start). Sprint-scoped queries follow client-side JSONB resolution (L21 — `.contains` cannot encode names with spaces).
- **Forbidden:** `src/components/testhub/reports/**` bodies, `report-registry.ts` shipped entries, `src/pages/testhub/reports/**`; §2.
- **Deps:** P0-S4 pattern. **Accept cmd:** `git diff --stat src/components/testhub/reports/ | grep -v hooks/` → empty; forced failure → error card.
- **Accept condition:** error card not zeros; network shows scoped queries; body diff empty. **Evidence:** light+dark + 26-slug smoke (B4). **Rollback:** revert. **Done when:** report hooks tell the truth without touching a body.

### P1-S19 · Enforcement ratchets (A1 E1–E4 — mandatory, lands WITH the sweep, not after)
- **Purpose:** make the cleanliness permanent: (E1) `lint:colors:testhub` STRICT zero-baseline script over `src/pages/testhub`, `src/components/testhub` (+ deleted-family paths as tombstone guards) wired into `.husky/pre-commit` + `ci.yml`; (E2) fix `scripts/no-hardcoded-colors.cjs isAllowedUsage()` fallback hole (`var(--ds-*, #hex)` allowance contradicts CLAUDE.md) — strip for E1 paths minimum, re-baseline once if global; (E3) per-path counts in `scripts/ads-audit-gate.cjs`; (E4) register TestHub create/link surfaces in `scripts/cre-chokepoint-gate.cjs` (currently ZERO TestHub entries) + `filterCreatableTypes(types,'TESTHUB')` + ADM-029 BacklogPage `moduleCode` from useDefectsSource; `EXTRA_CREATE_RIGHTS.TESTHUB` only if create-story-from-requirement is scoped — extend the map, never bypass the filter.
- **Files:** `scripts/no-hardcoded-colors.cjs`, `scripts/ads-audit-gate.cjs`, `scripts/cre-chokepoint-gate.cjs`, `package.json`, `.husky/pre-commit`, `ci.yml`, `design-governance/*baseline*.json`.
- **Forbidden:** weakening any existing gate; §2. **Deps:** P1-S17 complete (else strict mode fails on debt).
- **Accept cmd:** `npm run lint:colors:testhub` → exit 0 with baseline 0; `npm run lint:cre` → includes TESTHUB checks; both run in pre-commit.
- **Accept condition:** binary per commands; CI green. **Evidence:** CI run link + gate output. **Rollback:** revert (gates only). **Done when:** a bare color or unregistered create surface in TestHub cannot be committed.

**P1 exit criterion (binary):** mid-cycle case edit cannot change execution history; every entity URL-addressable by slug/key; coverage computed not typed; admin shows nothing it can't do; `audit:ads` + `lint:colors` baselines strictly lower than P0 start; `lint:colors:testhub` = 0 enforced in CI.

---

## 11. PHASE P2 — COMPETITIVE (20 slices, ~1 week) — Xray/TestRail-class credibility

Compact blocks; every slice still gets the full SUBTASK treatment in its session log before execution. Build order: lift-don't-build first. All migrations additive-first, destructive step in a separate later migration (A4 non-negotiable).

**Quality gates & release readiness (4 slices)**
- P2-S1…S3: mount the existing UNMOUNTED gate stack (schema+RPCs+hooks+UI per discovery 13) on Release Hub; `tm_test_cycles.release_id` → correct release id-space (PLN-025); `readiness_pct` computed from gates+executions (RPT-005). Files: releases hub surfaces + migration; **Forbidden:** report bodies; quality-gate B11 files may be consumed, never broken. Accept: release page shows computed readiness; gate eval RPC round-trip (SQL).
- P2-S4: retire `/release/incidents/reports` 0-row page or repoint (RPT-004 — already PLACEHOLDER'd for Vikram). Accept: route resolves to real data or is gone + redirect.

**Automation/CI ingestion (4 slices)**
- P2-S5…S8: JUnit XML upload → edge function → `tm_test_runs` with provenance (`manual|automated`); API token surface; run-source lozenge per row (AUT family). Edge functions zero external imports (L19). Accept: `curl` a JUnit file → runs appear in cycle with provenance; unauthenticated → 401; provenance visible in runner + reports (via existing hooks only).

**AI governance (3 slices)**
- P2-S9: usage-ledger table (AI-003; new tm_* table ships 4 RLS policies same migration). P2-S10: per-user quota + cooldown (AI-004). P2-S11: delete dead `useCatyAI` layer + orphaned consumers (AI-006) + batch/cache polish. Accept: quota exhausted → visible block, ledger rows (SQL); importer grep for deleted layer = 0.

**Collaboration (4 slices)**
- P2-S12: CatalystActivitySection on case view (COL-001). P2-S13: same on cycle view (COL-002). P2-S14: comment spine unification tm_comments→ph_comments bridge (COL-003) — **A2 S5 order binding:** migrate rows on cyij → verify counts → swap reader+writer in one slice → screenshot old comment visible on new spine. P2-S15: comment-before-first-run on scope items + fire defined notification events (COL-004/005). Accept per slice: comment persists + count parity SQL; B2 comments re-proof.

**Planning depth (3 slices)**
- P2-S16: per-instance assignee/due-date on scope (migration additive + UI). P2-S17: cycle board/calendar rebuilt small on canonical components (PragmaticBoard adapter / retheme-in-place calendar per A1) — only now, with real data contracts. P2-S18: saved filters on repository with slugs (rides P1-S14 column). Accept: assignment round-trips; board renders real scope; filter deep-link works.

**RBAC reality (2 slices)**
- P2-S19: `tm_user_roles` assignment UI + one consumer path (matrix stops being decorative — ADM-004/005) or explicit descope decision recorded in 09_DECISIONS. P2-S20: RLS alignment note for ADM-007 (server-side enforcement design; implementation may slip to P3). Also here: set-membership consolidation (A2 S6) — canonicalize `tm_set_cases`, move `trigger_update_test_set_count` onto it, merge `tm_test_set_cases` rows (probe P0.11) then DROP + CTAS snapshot rollback; and E4 CHECK widening for `requirement_type` defect/incident (A4 E4).

**P2 exit criterion:** a CI pipeline can post results that appear in cycles/reports with provenance; release go/no-go reads computed gates; AI spend is bounded and logged; case/cycle pages have comments+activity.

---

## 12. PHASE P3 — DELIGHTERS (12–15 slices, pull-based, no calendar commitment)

Bounded backlog. **Pull rule:** an item enters execution ONLY as a written 2-hour SUBTASK block (same fields as P0) appended to this file via the drift/rebaseline process, with its own accept grep + screenshots. Anything larger gets split or refused.

Backlog: shared steps / parameterized (data-driven) cases (reuse `tm_test_steps.is_shared`, A4 N5); flaky-test detection from run history; AI coverage-gap suggestions + AI insight cards on remaining surfaces (reuse report-insights pattern); exploratory/session-based testing notes; bulk import (CSV/TestRail); PDF/exec export; cross-project dashboards; keyboard-first runner (TestRail-parity hotkeys); requirement-change → "needs re-test" flagging (needs VER stack — last); public read-only report links; `tm_defect_status_history` + MTTR (A4 N2, D-004 pattern); `tm_coverage_history` snapshots (A4 N4); `tm_baselines`/`tm_watchers` (A4 N6); defect key zero-padding normalization in `tm_next_entity_key` (DAT-058); shared FolderTree (D-REQ-4, VETO-5 — its own approval line).

### SUBTASK P3-F6 · Shared steps / parameterized test cases
- **Purpose:** Enable test reuse via shared test-step library and data-driven (parameterized) test case execution; reduce duplication and improve test maintenance (A4 N5). Shared steps marked via existing `tm_test_steps.is_shared` flag; parameterized cases reference a dataset (tm_test_data_rows) and execute once per row.
- **Files to touch:**
  - `src/hooks/test-management/useSharedSteps.ts` (new — query shared steps, filter by project/type)
  - `src/pages/admin/test-ops/TestOpsPage.tsx` (add "Shared steps library" tab showing reusable steps across projects)
  - `src/components/testhub/cycles/ExecutionPage.tsx` (show "data-driven execution" badge on parameterized cases + expand step list to show data context per row)
- **Files forbidden:** report bodies (§2 VETO-8); TestHub runner offline queue internals; §2 full list.
- **Dependencies:** P1-S1 (step immutability + snapshots live); P0-S3 (runner spine works); existing tm_test_steps.is_shared flag (not adding column).
- **Acceptance command:**
```bash
# Audit: shared steps visible in hook, UI renders shared-step references
[ "$(grep -c 'is_shared' src/hooks/test-management/useSharedSteps.ts)" = "1" ] && \
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate
```
- **Acceptance condition (binary):**
  - Hook returns shared steps, filtered by project (SQL: query returns steps with is_shared=true)
  - TestOps "Shared steps library" tab lists shared steps with name + project + usage count (how many cases use each)
  - ExecutionPage marks parameterized cases with badge; shows data context per step
  - Zero console errors on load
- **Screenshot/evidence:** TestOps "Shared steps" tab light + dark; ExecutionPage with parameterized case open, data context visible; usage count accurate (SQL verify).
- **Rollback:** `git revert` (no schema changes).
- **Done when:** admin views shared step library with usage counts, executor sees parameterized case with data context per step.

### SUBTASK P3-F5 · Defect key zero-padding normalization
- **Purpose:** Defect keys generated by `tm_next_entity_key()` use sequential integers (DEF-1, DEF-2, ..., DEF-100, DEF-101). Normalize all keys to zero-padded 5-digit format (DEF-00001, DEF-00002, ..., DEF-00100, DEF-00101) for consistent sorting and display; update RPC to generate zero-padded keys going forward (DAT-058).
- **Files to touch:**
  - `supabase/migrations/<unique-ts>_tm_defect_key_normalize.sql` (new — normalize existing rows + update RPC tm_next_entity_key)
  - `src/integrations/supabase/types.ts` (no changes needed if RPC signature unchanged)
- **Files forbidden:** report bodies (§2 VETO-8); §2 full list.
- **Dependencies:** P0-S7 (tm_next_entity_key RPC exists); existing defects exist on cyij.
- **Acceptance command:**
```bash
# Audit: all tm_defects.defect_key values are zero-padded (grep returns only PAD format)
[ "$(grep -c 'DEF-[0-9]\{1,4\}' src/)" = "0" ] && \
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate
```
- **Acceptance condition (binary):**
  - All existing defect_key rows normalized to DEF-NNNNN format (SQL: verify min/max keys, spot-check format)
  - Next defect created uses zero-padded format (manual create, verify key in DB)
  - Zero console errors
- **Screenshot/evidence:** SQL query output before/after normalization counts; manual create screenshot; zero grep matches for non-PAD format.
- **Rollback:** reverse UPDATE via down-script (preserve old keys in audit log if needed).
- **Done when:** admin creates defect, gets DEF-00XXX format; grep finds zero old-format keys.

### SUBTASK P3-F4 · Coverage history snapshots (coverage progression tracking)
- **Purpose:** Capture coverage state (stories/features covered vs uncovered) at regular intervals (daily or per-cycle); enable trend reporting and coverage velocity analysis — "did we increase coverage this week?" (A4 N4, D-004 pattern).
- **Files to touch:**
  - `supabase/migrations/<unique-ts>_tm_coverage_history.sql` (new — table + backfill RPC)
  - `src/integrations/supabase/types.ts` (regen after migration)
  - `src/hooks/test-management/useCoverageHistory.ts` (new — query snapshots by project/date range, compute trend)
  - `src/pages/admin/test-ops/TestOpsPage.tsx` (add "Coverage history" tab with chart/trend)
- **Files forbidden:** report bodies (§2 VETO-8); report hooks; §2 full list.
- **Dependencies:** P2 complete (ph_issues + tm_requirement_links + tm_test_case_links live); P3-F2 coverage-gap logic confirmed.
- **Acceptance command:**
```bash
# Schema audit: table exists, backfill succeeds, snapshot counts match projects
[ "$(grep -c 'tm_coverage_history' src/integrations/supabase/types.ts)" = "1" ] && \
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate
```
- **Acceptance condition (binary):**
  - Migration applied: `tm_coverage_history` table exists with rows (one per snapshot: project_id, snapshot_date, total_items, covered_items, coverage_pct)
  - Backfill RPC `tm_backfill_coverage_history()` populates history from today going back 30 days (one snapshot per project per day)
  - Hook returns trends: project + array of {date, coverage_pct}
  - Admin tab renders: project selector + line chart of coverage % over 30 days
  - Zero console errors on load
- **Screenshot/evidence:** TestOps "Coverage history" tab light + dark, chart visible; SQL query output proving snapshot counts; B9 admin re-proof.
- **Rollback:** DROP TABLE, DROP FUNCTION (reversible).
- **Done when:** admin views 30-day coverage trend per project, chart renders correctly, SQL proves one snapshot per project per day.

### SUBTASK P3-F3 · Defect status history + MTTR computation
- **Purpose:** Track defect status changes over time; compute mean-time-to-resolution (MTTR) from creation to closed/resolved. Surface MTTR on defect detail view + admin metrics to measure team velocity and QA process efficiency.
- **Files to touch:**
  - `supabase/migrations/<unique-ts>_tm_defect_status_history.sql` (new — table + trigger + RPC)
  - `src/integrations/supabase/types.ts` (regen after migration)
  - `src/hooks/test-management/useDefectMetrics.ts` (new — hook wrapping RPC, returns defect_id + mttr_hours + status_change_count)
  - `src/pages/admin/test-ops/TestOpsPage.tsx` (add "Defect metrics" tab with MTTR summary)
- **Files forbidden:** report bodies (§2 VETO-8); defect detail views beyond adding one read-only MTTR field; §2 full list.
- **Dependencies:** P2 complete (tm_defects live); defects created/updated via canonical path (P0-S7).
- **Acceptance command:**
```bash
# Schema audit: table exists, trigger logs changes, RPC returns correct MTTR
[ "$(grep -c 'tm_defect_status_history' src/integrations/supabase/types.ts)" = "1" ] && \
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate
```
- **Acceptance condition (binary):**
  - Migration applied: `tm_defect_status_history` table has rows, one per status change (SQL: verify count matches defect update count)
  - RPC `tm_get_defect_mttr()` returns defect_id + mttr_hours (hours from creation to closed, NULL if open)
  - Admin "Defect metrics" tab shows: total defects, avg MTTR (hours), median MTTR, count by status
  - Zero console errors on load
- **Screenshot/evidence:** TestOps "Defect metrics" tab light + dark; SQL query output proving trigger logging; B9 admin re-proof (ModuleGate still guards access).
- **Rollback:** DROP TRIGGER, DROP TABLE, DROP FUNCTION (all reversible).
- **Done when:** admin views MTTR stats, SQL proves trigger fired on every status change, RPC computes correctly.

### SUBTASK P3-F2 · AI coverage-gap suggestions
- **Purpose:** Identify stories/features with zero linked test cases; surface on TestOps admin so teams know which items need QA investment before release.
- **Files to touch:**
  - `src/hooks/test-management/useCoverageGaps.ts` (new — queries ph_issues uncovered by tm_requirement_links, groups by project/type)
  - `src/pages/admin/test-ops/TestOpsPage.tsx` (add "Coverage gaps" tab after Flaky tests tab)
- **Files forbidden:** report bodies (§2 VETO-8); report hooks; §2 full list.
- **Dependencies:** P2 complete (ph_issues + tm_requirement_links live).
- **Acceptance command:**
```bash
# coverage-gap logic returns correct item list
grep -n "linked_item_id\|NOT EXISTS" src/hooks/test-management/useCoverageGaps.ts
# UI renders with no console errors
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate
```
- **Acceptance condition (binary):**
  - Query returns stories/features with zero linked test cases (SQL round-trip: X items uncovered by type)
  - TestOps admin tab shows list with issue key + type + project + "linked test count" (0)
  - ADS tokens only (no hard colors), fully gated by admin role
- **Screenshot/evidence:** TestOps "Coverage gaps" tab before/after, light + dark; SQL query output proving coverage math; B9 admin re-proof (ModuleGate still guards access).
- **Rollback:** `git revert` (zero schema changes).
- **Done when:** admin views uncovered items, SQL proves zero linked cases for each.

### SUBTASK P3-F1 · Flaky-test detection
- **Purpose:** Identify tests failing intermittently (>20% failure rate in last 7 days); surface on TestOps admin panel so teams can stabilize high-noise tests before release gating.
- **Files to touch:** 
  - `src/hooks/test-management/useFlakyTestDetection.ts` (new — detection logic querying `tm_test_runs` by case+project+date, computing failure pct)
  - `src/pages/admin/test-ops/TestOpsPage.tsx` (new tab or section: "Flaky tests" with case key + failure rate + 7-day run count)
- **Files forbidden:** report bodies (§2 VETO-8); report hooks; §2 full list.
- **Dependencies:** P2 complete (tables live, test runs history populated).
- **Acceptance command:**
```bash
# detection logic returns correct case list
grep -n "failure_rate\|run_count\|tm_test_runs" src/hooks/test-management/useFlakyTestDetection.ts
# UI renders with no console errors
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate
```
- **Acceptance condition (binary):** 
  - Detection function returns cases with >20% failures (SQL round-trip pasted: 3 test cases, exact fail counts)
  - TestOps admin panel shows list with case key + fail rate + run count, no errors on load
  - ADS tokens only (no hard colors), fully gated by admin role
- **Screenshot/evidence:** TestOps "Flaky tests" tab before/after, light + dark; SQL query output proving detection math; B9 admin re-proof (ModuleGate still guards access).
- **Rollback:** `git revert` (zero schema changes, zero cascade).
- **Done when:** admin views flaky test list, sees correct rates, SQL proves the numbers match run history.

---

## 13. VALIDATION COMMANDS (run before EVERY commit, all phases)

```bash
# 1. Type safety
npx tsc --noEmit

# 2. Color law (global ratchet)
npm run lint:colors:gate

# 3. ADS audit ratchet (Tailwind utils, font-size, spacing)
npm run audit:ads:gate

# 4. CRE chokepoints (mandatory when any create/link surface touched)
npm run lint:cre

# 5. TestHub strict zero-baseline (exists after P1-S19; from then on, every slice)
npm run lint:colors:testhub

# 6. Targeted vitest — JiraTable regression guard (mandatory when any table surface touched)
npx vitest run src/components/shared/JiraTable/__tests__/chevron-slot-gating.test.ts
# plus any test file added by the slice:
npx vitest run <slice-test-paths>

# 7. Manual color audit (zero output = clean)
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "(#[0-9a-fA-F]{3,8}|rgba?\(|hsl[a]?\()" \
  src/pages/testhub src/components/testhub | grep -v node_modules | grep -v "\.snap" | grep -v "ads-scanner:ignore"

# 8. Migration hygiene (before naming any migration)
ls supabase/migrations | cut -d_ -f1 | sort | uniq -d   # must print nothing

# 9. DB targeting (before EVERY linked/MCP DDL batch)
cat supabase/.temp/project-ref    # must print cyijbdeuehohvhnsywig
```

Baselines only ratchet DOWN (`node scripts/ads-color-gate.cjs --update` / `node scripts/ads-audit-gate.cjs --update` + commit) when a slice reduces counts.

## 14. SCREENSHOT CHECKLIST (per UI-touching slice + phase close-outs)

- [ ] Light mode screenshot of the changed surface
- [ ] Dark mode screenshot — **reload-into-dark only** (runtime toggle gives false readings, L16)
- [ ] `catalyst-rq-cache` localStorage cleared + hard reload before every data-proof screenshot (L17)
- [ ] Empty state / loading state / **error state (DevTools-forced failure)** where the slice touches queries
- [ ] Adjacent-UI regression shot: any touch of shared chassis (JiraTable consumers, adapters, CreateStoryModal props, CatalystViewBase) → one project-module screenshot (A2 B5 rule)
- [ ] Modal/drawer footers collision-checked against the floating CATY widget (L14)
- [ ] P0 close-out: 21/21 testhub routes, light + dark
- [ ] P1 close-out: full regression-cycle walkthrough (create case → cycle → execute → fail → defect → coverage flip), light + dark
- [ ] Evidence filed in `10_SCREENSHOT_CHECKLIST.md` + `06_VALIDATION_EVIDENCE.md` with raw command output

## 15. STOP CONDITIONS — stop and RED FLAG if:

1. Any file outside the slice's "Files to touch" list needs changes.
2. Any DB column/table/trigger doesn't exist as the probe said (probe drift = stop, re-probe, log).
3. Any canonical component doesn't fit — unsuitability requires API+usage evidence, not "overkill".
4. Any regression detected in the B1–B11 baseline or adjacent project-module UI.
5. Slice exceeds 2 hours (one correction loop → accept/split/rebuild/stop+revert).
6. A slice wants to edit a report body, JiraTable core, or CreateStoryModal core (§2 items 1/7/8).
7. `supabase/.temp/project-ref` prints anything other than `cyijbdeuehohvhnsywig` before a DDL batch, or any "working directory was deleted / cwd recovered" error (assume nothing survived — re-verify cwd, worktree, project-ref).
8. Staged files include anything authored by another session (Workflow Studio files listed in §0).
9. An `ALTER TYPE ADD VALUE` is proposed without a written "irreversible" note (A4 non-negotiable).
10. A slice discovers a latent 400/dead table during the silent-error sweep — the surfaced failure becomes a NAMED new slice, never inline scope creep (A6 risk register).

RED FLAG format: `1. What might regress/block · 2. Why · 3. Evidence · 4. Safer option · 5. Decision needed from Vikram`.

## 16. DRIFT / REBASELINE RULES

1. Any deviation from a SUBTASK block mid-slice → STOP; document in `08_DRIFT_LOG.md` (what, why, evidence).
2. Get rebaseline approval from Vikram before continuing.
3. If the Plan Lock itself is superseded: set this file's STATUS to SUPERSEDED, write the successor as `03b_PLAN_LOCK_REVISED.md`, carry forward every un-executed slice explicitly (no silent drops).
4. Probe results that contradict a slice's assumptions rebaseline THAT slice only; the phase structure stands.
5. P3 pull-ins are appended under §12 with full SUBTASK blocks + a 09_DECISIONS entry — they do not modify P0–P2.
6. Council/discovery outputs are hypotheses (L23): if execution contradicts a cited claim, trust the live probe, log the correction in 08_DRIFT_LOG, and update the slice.
7. Baselines (`design-governance/*.json`) move only downward; an unavoidable one-time up-rebaseline (E2 global scanner fix) requires its own 09_DECISIONS entry.

## 12. PHASE P3 — PULL-BASED DELIGHTERS (appended post-P0..P2 merge)

**Goal:** proven patterns ported / AI insights surfaced / bulk operations / admin power-user features. Each item = standalone 2-hour SUBTASK with its own session log. **No batching across P3 items.**

### SUBTASK P3-F7 · AI insight cards for TestOps admin panel
- **Purpose:** surface 4 key TestHub health insights (coverage anomaly, execution efficiency, flaky-trend acceleration, defect-closure velocity) via proven `CatyInsightCard` pattern (Tasks/for-you reuse).
- **Files to touch:** `src/hooks/test-management/useTestHubInsights.ts` (new); `src/pages/admin/test-ops/TestOpsPage.tsx` (mount insights above tabs).
- **Files forbidden:** `CatyInsightCard.tsx` core; §2 list.
- **Dependencies:** P3-F1..F6 merged.
- **Acceptance command:**
```bash
npx tsc --noEmit && npm run lint:colors:gate && npm run audit:ads:gate
# SQL: spot-check coverage-drop detection, defect-closure trend
```
- **Acceptance condition (binary):** 4 insights render (coverage %, exec speed, flaky 7d→30d delta, closure rate); ADS tokens only; zero console errors on forced failure.
- **Screenshot/evidence:** TestOps admin light+dark (insights above tabs); force-failure error state.
- **Rollback:** `git revert`.
- **Done when:** insights render + compute correctly; screenshots filed in `06_VALIDATION_EVIDENCE.md`.

---

## 17. TOTALS

| Phase | Slices | Wall-clock (1 builder + agents) |
|---|---|---|
| P0 trust-repair | **12** (S0 probe batch + S1–S11) | ~1.5 days — **executable tomorrow** |
| P1 table-stakes | **19** (A6's 18 + S19 enforcement) | ~4–5 days |
| P2 competitive | **20** | ~1 week |
| P3 delighters | **12–15** | pull-based |
| **Total** | **~63–66** | **MVP line = end of P1 · pre-prod-tomorrow line = P0 + P1-S1…S5** |

---

*Inputs: council/A1 (canonical verdicts + 8 vetoes), A2 (preservation matrix B1–B11 + S1–S8 sequencing), A4 (schema list + 14-probe batch), A6 (phasing skeleton), discovery/07 (lessons L1–L26). Path corrections applied against src/ at da6b9eba7: real hooks live in `src/hooks/test-management/` (not `src/hooks/test-cases/`); `useTestCycleByKey.ts` at `src/hooks/`; dead CSS at `src/styles/testhub.css`; orphan defects page at `src/pages/testhub/defects/DefectsPage.tsx` vs routed `src/pages/testhub/DefectsPage.tsx`.*

**STATUS: DRAFT — AWAITING VIKRAM APPROVAL. No code before this flips to APPROVED.**
