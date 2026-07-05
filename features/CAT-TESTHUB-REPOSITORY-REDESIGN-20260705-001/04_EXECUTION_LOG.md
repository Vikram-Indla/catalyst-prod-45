# CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Log entries

### 2026-07-05 · Session 001 · S1 — Full-viewport layout + collapsible rails + backlog typography

File: `src/pages/testhub/repository/RepositoryPage.tsx`
- Replaced hardcoded 240px folder div with canonical `ResizablePanel`/`ResizablePanelGroup`/`ResizableHandle` (`@/components/ui/resizable`). Folders rail is now collapsible (imperative `folderPanelRef`) with a header toggle (`PanelLeftClose`) and, when collapsed, a 44px expand strip + toolbar expand button (`PanelLeftOpen`). Collapse state persists to `localStorage('testhub.repo.railCollapsed')`.
- Case list panel fills the viewport (`minSize=40`, generous 16/24 padding), search widened to 420px.
- **Grid H typography parity with Project Backlog:** key column now renders via canonical `makeKeyCell` (13px link, `--ds-line-height-body`, type glyph via `getIcon`), title via `makeSummaryCell` (14px subtle). Retired the inline `font-size-200` key span (was a Grid H miss).
- `focusedRowId` wired so the open case gets the canonical blue focus bar.
- All new spacing tokenized to `var(--ds-space-*)` / `var(--ds-border-radius)` — no bare px.

### 2026-07-05 · Session 001 · S2 — Real ph_issues traceability columns

New file: `src/hooks/test-management/useCaseCoverage.ts`
- Reads `v_tm_requirement_coverage` (verified live on cyij: 56 links, 50 covered cases; `requirement_type` ∈ {story, external}, `latest_run_status` ∈ {not_run,in_progress,passed,failed,blocked,null}, `coverage_verdict` ∈ {ok,nok,not_run}). Aggregates per `test_case_id` → `{ requirementKeys, verdict, latestRun }`. Degrades to empty map on error (columns then show the zero-assumption dash).

File: `src/pages/testhub/repository/RepositoryPage.tsx`
- **Coverage column** — real requirement key(s) (live ph_issues `external_key`) + verdict Lozenge (ok→Covered/success, nok→At risk/removed, not_run→Not run/default). No link → `—` (zero-assumption, never a fake "covered").
- **Last run column** — `latest_run_status` → Lozenge (passed/failed/blocked/in_progress; null→Not run).

### Gates (S1+S2)
- `npx tsc --noEmit` → 0 errors
- `npm run lint:colors:gate` → 0 = baseline 0
- `npm run audit:ads:gate` → PASS, tokens ratcheted 24484→24483 (baseline updated + committed)
- `npm run lint:cre` → PASS

### 2026-07-05 · Session 001 · S3 — Inline quick-create (sticky footer)

File: `src/pages/testhub/repository/RepositoryPage.tsx`
- Added `TestCaseInlineCreateRow` + wired JiraTable `enableStickyCreateFooter` / `stickyCreateFooter` (canonical pattern from `TasksTaskListView.tsx:1973`). Type-and-Enter authoring: status defaults DRAFT, folder inherited from the active folder, label shows where the case lands. Reuses `useCreateTestCase` — no new write path. Full `CreateStoryModal` retained behind "Create case".
- CRE: single-type TESTHUB create (A11/D4), no type catalogue presented → `lint:cre` PASS.
- Gates: tsc 0 · colours 0 · ADS PASS (tokens ratcheted 24483→24475) · CRE PASS.

### Decisions (from Vikram, this session)
- Land S1+S2(+S3): **verify-then-commit** — Vikram verifies on localhost:8080 first; commit + push after confirmation.
- S6 migration: **staging cyij only** (prod lmqw later, explicit go only).

### 2026-07-05 · Session 001 · S4 — Case detail reframe

Files: `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx`, `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx`
- Tabs reordered **Steps-first** (the spec is the point); added a **Runs** tab reading `tm_cycle_scope` joined to `tm_test_cycles` — the same case's execution across every cycle (mental-model plane 3), status as ADS Lozenge.
- Dropped the no-op **Sprint/Reporter/Due-date** for the Test Case type: removed `onReporterChange`/`onDueDateChange` from the test-case sidebar dataSource (Due-date gate now false → hidden) + added `issue_type !== 'Test Case'` exclusions to the shared sidebar's Sprint and Reporter rows. Additive per-type guard (matches existing Feature/BR exclusion pattern) — cannot affect any other type; no other view passes 'Test Case'. Formal `hermes-regression-sweep` on 3 adjacent surfaces PENDING (needs running app).
- Gates: tsc 0 · colours 0 · ADS PASS · CRE PASS.

### 2026-07-05 · Session 001 · S5 — Linking sheet from the repository

New file: `src/pages/testhub/repository/AddToCycleSetSheet.tsx`; wired into `RepositoryPage.tsx`.
- Canonical ADS `ModalDialog` sheet, mode-switched `cycle`|`set`, searchable picker. Reuses `useAddCasesToScope` (tm_cycle_scope) and a `tm_set_cases` insert — no new write path. Opened from the bulk-actions dropdown ("Add to cycle…", "Add to set…"). Closes the "linking only from the cycle/set side" gap.
- Gates: tsc 0 · colours 0 · ADS PASS · CRE PASS.

### 2026-07-05 · Session 001 · S6a — Test Plans surface (zero-UI gap closed)

New file: `src/pages/testhub/plans/TestPlansPage.tsx`; route in `FullAppRoutes.tsx`; nav entry in `TestHubSidebar.tsx`.
- Probed cyij: `tm_test_plans` exists (2 rows) with `plan_key` display key — **navigable by `:key`, no slug migration needed** (Grid F compliant, zero DDL). Canonical `JiraTable` list: key, name (`makeSummaryCell`), status Lozenge, progress track (from `*_count`), timeline. Create-plan modal (ADS). EmptyState CTA.
- Gates: tsc 0 · colours 0 · ADS PASS · CRE PASS.

### 2026-07-06 · Session 001 · S6b — Configurable status-workflow editor: BUILT

Additive, zero-regression approach (no core-enum change):
- Migration `supabase/migrations/20260705211105_tm_case_status_config.sql` — new per-project `tm_case_status_config` (status_key, display_label, category CHECK, sort_order, allowed_next[]) with RLS mirroring `tm_case_priorities` (`tm_user_has_access`) + updated_at trigger. Applied to cyij staging via apply_migration; ledger version 20260705211105 recorded; committed file matches 1:1.
- Hook `src/hooks/test-management/useCaseStatusConfig.ts` — reads config, falls back to canonical DEFAULTS when a project has no rows (so behaviour is unchanged where unconfigured); `useSaveCaseStatusConfig` upserts.
- Admin page `src/pages/admin/test/TestCaseWorkflowPage.tsx` (route `/admin/test/case-workflow`) — live lifecycle preview + 4 editable rows (label, ADS category, reorder, allowed transitions), Save / Reset. Canonical PageHeader/Breadcrumbs/Lozenge/Select/Textfield; ADS tokens only.
- The tm_case_status enum (draft/ready/approved/deprecated) is untouched — this is a presentation/governance layer, so no live status write path changed.
- Verified live on localhost:8080: editor renders, Save persisted 4 rows to cyij `tm_case_status_config` (round-trip confirmed via SQL).
- Gates: tsc 0 · colours 0 · ADS PASS · CRE PASS.

Note (not mine): a pre-existing Vite HMR overlay fires from `src/routes/ProgramRoutesShell.tsx` importing `../pages/Tasks` (missing) — unrelated file, my tsc is clean; flagged for the owning session.

### S6b — (superseded — now BUILT above)

Probed cyij: no `tm_case_statuses` table — the Draft→Review→Approved→Deprecated lifecycle is a code-level enum used app-wide. Making it configurable requires a new table + a migration that rewires a **core status enum across many surfaces** — exactly the "migration touches shared tables → stop, produce data-audit SQL first" stop condition, and the kind of change RULE_TABLE H3 calls "a separate, larger Plan Lock." Not rushed headless. Left as the single remaining piece; recommend a dedicated `activate feature` slice with a data-audit + regression pass.

### Final gate sweep (S1–S5 + S6a)
- `npx tsc --noEmit` → 0 errors
- `npm run lint:colors:gate` → 0 = baseline 0
- `npm run audit:ads:gate` → PASS (tokens ratcheted to 24475)
- `npm run lint:cre` → PASS

### Pending
- Screenshot acceptance (localhost:8080) — commit held until Vikram verifies (verify-then-commit decision).
- `hermes-regression-sweep` for the shared `CatalystSidebarDetails` change (S4).
- S6b workflow editor — separate migration slice.
