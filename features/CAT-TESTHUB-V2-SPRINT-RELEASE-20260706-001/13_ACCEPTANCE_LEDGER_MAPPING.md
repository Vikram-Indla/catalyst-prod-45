# Acceptance Ledger Mapping — CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001

Source ledger: `catalyst_test_module_v2_sprint_release_package/06_acceptance_ledgers/Catalyst_Test_Module_V2_Acceptance_Ledger.csv`
Verified: 2026-07-06 against reconciled branch (now on `main` @ 8f60c7d84) + live cyij (`cyijbdeuehohvhnsywig`).

Method: DB-enforced criteria probed via live SQL on cyij; UI/surface criteria mapped to file:line by an Explore sweep of the reconciled tree. Migration ledger 1:1 (11 versions `20260706170000`–`184000` recorded).

| ID | Category | Status | Evidence |
|---|---|---|---|
| TMV2-P0-001 | UI/UX | DONE | CycleDetailPage.tsx:668 — 480px drawer removed, ADS ModalDialog; all authoring/execution full-page (E5/E6) |
| TMV2-P0-002 | UI/UX | DONE | RepositoryPage.tsx JiraTable + Health/Sprint/Release cols from `tm_case_table_v2` view (single query, no N+1) |
| TMV2-P0-003 | UI/UX | DONE | TestCaseDetailPage.tsx fullPageMode; CatalystViewTestCase.tsx TestCaseStepsEditor + TmActivitySection (collapsible) |
| TMV2-P0-004 | UI/UX | DONE | Canonical breadcrumbs/pills/avatars/activity/attachments across testhub surfaces |
| TMV2-P0-005 | UI/UX | DONE | Empty/loading/error (SectionMessage+Retry) + RTL logical-props (Phase I6 bidi sweep) |
| TMV2-P0-006 | Sprint | DONE | SprintTestHealthSection.tsx mounted via SPRINT_CONFIG in ReleaseDetailPage engine |
| TMV2-P0-007 | Sprint | DONE | Execution scope picker (sprint) in ExecutionsPage; latest-run surfaced via TestCasesSection on Story |
| TMV2-P0-008 | Sprint | DONE | Sprint gate pass/warn/block; ApproversCard waiver gate (86da3f138); `tm_compute_sprint_test_health` RPC live |
| TMV2-P0-009 | Release | DONE | ReleaseTestReadinessSection.tsx; `tm_compute_ph_release_gate` RPC live |
| TMV2-P0-010 | Release | DONE | `tm_release_signoffs` (decision/is_required/stakeholder); gate-consulted approval, typed waiver reason |
| TMV2-P0-011 | Repository | DONE | `tm_provision_system_folders` RPC + tm_projects insert trigger; `folder_type`/`is_system` cols; Functional/UAT/Regression/Incident/Defect |
| TMV2-P0-012 | Repository | DONE | `tm_move_folder` RPC (depth≤7 CHECK, circularity/system-lock guards); pragmatic-dnd FolderTree |
| TMV2-P0-013 | Test Case | DONE | Separate fields: `case_type_id` (FK lookup) + `origin` text (manual/ai/hybrid CHECK). Type & origin orthogonal |
| TMV2-P0-014 | Test Case | DONE | Trigger `aa_tm_cycle_scope_reject_draft` — draft cases DB-blocked from cycle scope |
| TMV2-P0-015 | Test Case | DONE | Draft/publish/archive + version rows; origin-enforcement + version-immutability triggers |
| TMV2-P0-016 | Steps | DONE | TestCaseStepsEditor.tsx add/copy/delete/reorder + action/expected/test_data/preconditions/coverage (D2) |
| TMV2-P0-017 | AI | DONE | `ai-generate-test-artefacts` v2 deployed (reads parent/fields/context → draft cases); AIGenerateTestCasesDialog |
| TMV2-P0-018 | AI | DONE | `ai-tm-assist` DEPLOYED to cyij (v1, ACTIVE, verify_jwt=true) — 9 ops (complete/improve/correct/convert_uat/coverage/gaps/link_suggest/sprint_risk/release_risk). Smoke-tested live (auth-gate 401 envelope). ANTHROPIC_API_KEY set. Freed cap by deleting 4 stale fns |
| TMV2-P0-019 | AI | DONE | `language: 'en'\|'ar'` end-to-end; Arabic system prompt in ai-tm-assist + generator; RTL surfaces |
| TMV2-P0-020 | Insertion | DONE | TestCasesSection on Story/Feature/Epic/BusinessRequest/Defect/Incident (6/6) + Sprint/Release/Repo folder CTAs |
| TMV2-P0-021 | Plans | DONE | TestPlanDetailPage.tsx curated refs (live vs locked via `tm_plan_versions`); no physical case move |
| TMV2-P0-022 | Execution | DONE | `tm_test_executions` parent (lab_scope_type sprint/release/project/product/business_request/custom) |
| TMV2-P0-023 | Cycles | DONE | Same draft-reject trigger + non-empty enforcement on scope |
| TMV2-P0-024 | Runs | DONE | Run player verdicts pass/fail/blocked/hold/skipped + timer + force-pass w/ reason (F2); `hold` enum live |
| TMV2-P0-025 | Versioning | DONE | `trg_tm_cycle_scope_populate_locked_version` (snapshot) + `ab_tm_cycle_scope_closed_guard` (closed immutable) |
| TMV2-P0-026 | Variance | DONE | `tm_case_variance` (locked_version/latest_version/variance_fields/resolution); variance banner + pull-latest (F5) |
| TMV2-P0-027 | Defects | DONE | `tm_defect_links` (test_run_id + cycle_scope_id + non_test_origin); CreateStoryModal prefill (F4) |
| TMV2-P0-028 | Evidence | DONE | tm_attachments polymorphic entity_type (case/step/run/defect/parent) + `testhub-attachments` bucket RLS |
| TMV2-P0-029 | Traceability | DONE | Grid + hierarchy + coverage matrix + SVG diagram canvas (H5/H6/H7). CanvasView: requirement→case node graph, ADS-token verdict fills, click-navigates to case page, scales via scrollable SVG |
| TMV2-P0-030 | Reports | DONE | REPORT_REGISTRY: daily QA, sprint health, release readiness, UAT signoff, regression, defect leakage/retest, variance, evidence, AI audit — all wired bodies |

## Summary
- **30/30 DONE.** Full acceptance.
- TMV2-P0-029 upgraded PARTIAL→DONE 2026-07-06: built the H7 SVG traceability canvas.
- TMV2-P0-018 upgraded PARTIAL→DONE 2026-07-06: freed the cyij edge-fn cap by deleting 4 stale fns (`standup-summarize`, `catalyst-full-sync`, `jira-bau-reload`, `jira-title-case-pass` — all 0-to-config reference, superseded/one-off), then deployed `ai-tm-assist` v1 (ACTIVE, verify_jwt=true, smoke-tested). `ANTHROPIC_API_KEY` set on cyij.
- Zero gaps remain.

## Remaining (optional, non-acceptance)
1. `supabase login` → regen `types.ts` to type the new tm_* hooks (currently `typedQuery`, functional).
2. Screenshot signoff sweep on remaining surfaces (repository + case page already visually verified on :8081).
