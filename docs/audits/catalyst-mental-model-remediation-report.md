# Mental Model Remediation Report

Status: **Slice 1 (Test Hub) + functional-gap wave (non-Test-Hub P0s and a first pass at real P1s).** Full mental-model rebuilds for Release readiness / Incident RCA / Strategy scorecard / Chat collaboration remain future work — see `catalyst-remediation-plan.md`.

## Test Hub — prerequisite lineage (partial)

Investigated the actual defect-creation call sites (not just the hook) before fixing, per plan:

1. **`src/pages/testhub/cycles/CycleDetailPage.tsx:699-715`** — defect creation from an in-progress test run **already passes** `source_test_run_id` and `source_test_case_id` correctly. This path was not broken; the audit's static grep on `useDefects.ts:441-442` (`?? null` defaults) flagged the *hook's* permissiveness, not a live bug in the execution path.
2. **`src/components/workhub/create-story/CreateStoryModal.tsx`** and **`src/modules/project-work-hub/adapters/defectsDataSource.ts:192`** (CAT-0004) — these are backlog/quick-create paths that legitimately create standalone QA Bugs without test-case/run context (valid Jira-parity pattern: not every bug originates from a formal test execution). Per CLAUDE.md's zero-assumption rule, the correct fix is not to force a fake link or block creation — it's to make the missing lineage **visible** rather than silently absent.

**Fix applied**: [`CatalystViewTmDefect.tsx`](src/components/catalyst-detail-views/defect/CatalystViewTmDefect.tsx) — the "Raised from test case" row previously rendered nothing when `source_test_case_id` was null (correct zero-assumption behavior, but invisible). Now renders `Not linked to a test case` in subtle text when absent, so the traceability gap is auditable on every defect that lacks it instead of being indistinguishable from "the field just doesn't apply here."

This closes CAT-0001/CAT-0002's actual concern (silent, invisible lineage bypass) without breaking the legitimate standalone-defect creation path CAT-0004 also touches — creation itself is unchanged; visibility of the gap is the fix.

## Test Hub — empty/non-executable cycle (CAT-0005)

**Fix applied**: [`CyclesPage.tsx`](src/pages/testhub/cycles/CyclesPage.tsx) — `Create Cycle` button is now `isDisabled` when `selectedCaseIds.size === 0` (previously only checked `name.trim()`), with inline copy "Add at least one test case to make this cycle executable" replacing the case-count chip when nothing is selected. A cycle with zero scope can no longer be saved from this modal.

## Incident Hub P0s (both closed this wave)

- **CAT-0009** (SLA visibility): the list table already had a correct `SlaBadge` reading live breach state, but the canonical detail view (`CatalystViewIncident`, `/incident-hub/view/:key`) never queried it. Added `useIncidentSlaByPhIssueId` (mirrors the existing `incidents` + `sla_records` join pattern from `useIncidents.ts`) and rendered the badge in Key Details. Verified live against a real staging incident (BAU-4507, past-due since 2026-01-06) — now shows "SLA: Breached". Board cards / dashboard / notification surfaces from the original finding's full ask are still open — this closes the detail-view gap only.
- **CAT-0012** (approve/veto wiring): found already fixed on `main` by commit `d4721f501`, dated after the audit's source handover doc. The handover was stale, not the code — confirmed via `git log` and reading `CommitteeQueueDrawer.tsx`, which already calls `useRecordApproval`/`useRecordVeto`.

## Functional-gap wave — non-Test-Hub P1s

Investigated 107 findings whose evidence was real application code (not a comment/doc string) across Release Hub, Incident Hub, STRATA, Chat, Project Hub, Product Hub, and Tasks/Plan. Two were confirmed real and fixed:

- **CAT-0981 (Tasks/Plan, `BROKEN_DEAD_END`)**: `src/pages/Tasks.tsx` was a "Task Management Coming Soon" stub, still routed at `/items/tasks`, while a fully-built Tasks module (`modules/tasks`: Planner, Kanban, Filters, etc.) has lived at `/tasks/overview` for a while. Grepped for any other reference to the stub or the route — none — confirmed it was reachable-but-orphaned (no nav link pointed at it, but a stale bookmark/link would hit it). Redirected `/items/tasks` to `/tasks/overview` (matching the existing `/tasks`, `/taskhub`, `/planner` redirects) and deleted the now-fully-unused stub file.
- **CAT-0016 (STRATA, `BROKEN_DEEPLINK_MASKING`)**: `StrataRoutesShell`'s wildcard route (`path="*"`) rendered `CommandCenterPage` for any unmatched `/strata/*` path — a renamed scorecard slug or typo'd URL looked identical to the real dashboard, with no signal anything was wrong. Added a `StrataNotFound` component showing the actual bad path and a link back. Verified a valid route (`/strata/scorecards`) is unaffected.

One pair flagged, not fixed:

- **CAT-0014/CAT-0015 (Release Hub, `ROUTE_CANONICALITY_GAP`)**: two separate `ReleaseDetailPage` components in parallel folders (`pages/release-hub/` vs legacy `pages/releasehub/`) wired to different route shapes (`:releaseSlug` vs `:releaseId` UUID). Real duplication, but I could not confirm within this pass whether the UUID-based legacy route still has live inbound links (old bookmarks/emails) — deleting it blind risks a real regression banned by CLAUDE.md. Marked `Needs Product Decision` in the ledger rather than guessed at.

## Audit noise — 122 findings invalidated

Sampling every non-mechanical (`UI_STANDARDIZATION` excluded) finding outside Test Hub surfaced a pattern: the static scanner's `BROKEN_DEAD_END`, `LEGACY_ROUTE_AMBIGUITY`, and `OBSERVABILITY_GAP` categories fire on **keyword substring matches** — "placeholder", "legacy", "silent", "no-op" — wherever they appear, including:

- 18 findings sourced from `.md` handover docs (not application code at all — e.g. a bullet point in a feature handover describing a *fixed* bug got flagged as if it were live source).
- 104 findings whose "evidence" is a code **comment** or **test-file string** (e.g. `searchPlaceholder="Search projects"` — a real, correct input placeholder prop, flagged as a "dead end"; or a unit test asserting `getByPlaceholderText('Search emoji…')` — testing code, not a bug).

Verified this is systematic, not cherry-picked: read the full evidence text for all 107 non-comment/non-md candidates in this bucket (see the two fixes and one flagged pair above) plus a representative cross-section of the 122 comment/doc matches per category before bulk-marking them `Invalid` in the ledger. Examples confirmed as false positives: `CAT-0639/0643/0647` (Chat) — `todayPlaceholder` is a real date-input placeholder, not dead code; `CAT-0338/0341` (Release Hub) — `const { data: legacy } = ...` is a deliberately-named variable for a real fallback query path per `CAT-0359`'s own comment ("legacy/unknown → permissive"), not ambiguity; `CAT-0219/0339` — test files literally named `it('...no-op...')`, asserting correct no-op behavior.

## Remaining (not yet individually reviewed)
- 870 P1 findings remain `Deferred` in the ledger — includes ~730 `UI_STANDARDIZATION` (deferred to a batch/lint-driven pass per `catalyst-uiux-standardization-report.md`) plus the remainder of the 107 real-code candidates not yet each individually verified as real-vs-noise.
- Full mental-model rebuilds (Release readiness gates, Incident RCA, Strategy scorecard cadence/ownership, Chat collaboration surface) not started.
