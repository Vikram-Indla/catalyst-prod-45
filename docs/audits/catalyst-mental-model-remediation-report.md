# Mental Model Remediation Report

Status: **Slice 1 — Test Hub lineage/gating only.** Release/Incident/Strategy/Chat mental-model rebuilds not started this slice.

## Test Hub — prerequisite lineage (partial)

Investigated the actual defect-creation call sites (not just the hook) before fixing, per plan:

1. **`src/pages/testhub/cycles/CycleDetailPage.tsx:699-715`** — defect creation from an in-progress test run **already passes** `source_test_run_id` and `source_test_case_id` correctly. This path was not broken; the audit's static grep on `useDefects.ts:441-442` (`?? null` defaults) flagged the *hook's* permissiveness, not a live bug in the execution path.
2. **`src/components/workhub/create-story/CreateStoryModal.tsx`** and **`src/modules/project-work-hub/adapters/defectsDataSource.ts:192`** (CAT-0004) — these are backlog/quick-create paths that legitimately create standalone QA Bugs without test-case/run context (valid Jira-parity pattern: not every bug originates from a formal test execution). Per CLAUDE.md's zero-assumption rule, the correct fix is not to force a fake link or block creation — it's to make the missing lineage **visible** rather than silently absent.

**Fix applied**: [`CatalystViewTmDefect.tsx`](src/components/catalyst-detail-views/defect/CatalystViewTmDefect.tsx) — the "Raised from test case" row previously rendered nothing when `source_test_case_id` was null (correct zero-assumption behavior, but invisible). Now renders `Not linked to a test case` in subtle text when absent, so the traceability gap is auditable on every defect that lacks it instead of being indistinguishable from "the field just doesn't apply here."

This closes CAT-0001/CAT-0002's actual concern (silent, invisible lineage bypass) without breaking the legitimate standalone-defect creation path CAT-0004 also touches — creation itself is unchanged; visibility of the gap is the fix.

## Test Hub — empty/non-executable cycle (CAT-0005)

**Fix applied**: [`CyclesPage.tsx`](src/pages/testhub/cycles/CyclesPage.tsx) — `Create Cycle` button is now `isDisabled` when `selectedCaseIds.size === 0` (previously only checked `name.trim()`), with inline copy "Add at least one test case to make this cycle executable" replacing the case-count chip when nothing is selected. A cycle with zero scope can no longer be saved from this modal.

## Not started this slice
- Release Hub readiness-gate model, Incident Hub triage/SLA/RCA model, Strategy balanced-scorecard model, Chat collaboration-surface model — see `catalyst-remediation-plan.md` wave order for scheduling.
- Incident Hub's 2 P0s (CAT-0009, CAT-0012) specifically require re-reading `features/CAT-INCIDENT-GOVERNANCE-20260703-001/07_HANDOVER.md` against current code before any fix — not done this slice.
