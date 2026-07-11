# CAT-TESTHUB-REMEDIATION-20260711-001 — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.
> Log every loop entry here before moving to the next experiment.
> See protocol: docs/ways-of-working/CATALYST_KARPATHY_LOOP.md

---

## Loop entries

[Entries will be appended during discovery and implementation]

## [LOOP-001] Mobbin availability gate

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** Mobbin MCP is connected and can supply verifiable market references.
**Experiment:** Searched the complete connected tool inventory for Mobbin by tool name and description.
**Evidence:** Zero Mobbin tools were returned.
**Decision:** DISCARD
**Reason:** The required research source is unavailable; substitutes are explicitly forbidden.
**Next step:** Ask Vikram to connect/authenticate Mobbin and keep the market-reference stage stopped.

## [LOOP-002] Existing automated Test Hub coverage

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** The Test Hub has broad automated coverage for its connected lifecycle.
**Experiment:** Inventoried Test Hub test files and executed the only Test Hub unit suite.
**Evidence:** `useDeleteTestExecution.test.tsx` passes 3/3, but it covers only execution deletion. Three browser specs exist, including an auth setup with a committed credential, and are not a safe or complete production-certification suite.
**Decision:** DISCARD
**Reason:** A passing three-test unit suite does not cover authoring, planning, cycles, runner outcomes, evidence, defects, traceability, reports, permissions, offline sync, or volume.
**Next step:** Define journey-based unit, integration, policy, browser, accessibility, visual, volume, and recovery coverage in the blueprint.

## [LOOP-003] Test Hub styling baseline

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** Current Test Hub files introduce hard-coded color violations that must be remediated before UX work.
**Experiment:** Ran `npm run lint:colors:testhub` across the Test Hub scope.
**Evidence:** The gate reported 0 violations across 116 files.
**Decision:** DISCARD
**Reason:** Color-token purity is a proven working property and must be preserved; it is not the current root cause of lifecycle failure.
**Next step:** Focus remediation on information architecture, interaction completeness, lifecycle wiring, data safety, and testability while keeping the zero-violation gate.

## [LOOP-004] Test Hub static-quality baseline

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** The Test Hub source scope passes the repository's current lint rules.
**Experiment:** Ran ESLint against Test Hub pages, components, management hooks, and case/cycle detail views.
**Evidence:** The scope failed with 360 findings: 147 errors and 213 warnings. Examples include `@ts-nocheck`, extensive `any` usage, missing hook dependencies, direct ADS imports outside the wrapper, and restricted bespoke UI imports.
**Decision:** DISCARD
**Reason:** The module is not currently static-quality clean even though its color gate passes.
**Next step:** Classify findings into production-risk, canonical-component drift, and legacy debt; add a no-net-new-debt gate plus targeted remediation acceptance tests.

## [LOOP-005] Historical certification remains valid

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** The 2026-07-07 production-readiness handover still certifies the current staging journey.
**Experiment:** Compared its recorded seed totals and screenshot/test claims with current live staging and checked-in evidence.
**Evidence:** Current staging has 14 cases, 0 plan memberships, 10 step results, and 2 requirement links, versus the handover's 93 cases, 50 memberships, 144 results, and 56 links. Referenced certification screenshots are absent; available lab screenshots are prototypes.
**Decision:** DISCARD
**Reason:** The old certification cannot prove today's data, routes, or behaviors.
**Next step:** Rebuild certification around deterministic isolated data and repeatable CI/browser/policy evidence.

## [LOOP-006] Remediation should begin with visual redesign

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** UI redesign is the safest first implementation wave because UI/UX carries 80% weighting.
**Experiment:** Compared independent component, screen, UX, integration, data-safety, QA, and implementation-planning reports.
**Evidence:** All seven roles converged on security, history retention, Test Space context, transactional lifecycle contracts, and certification as prerequisites. Existing canonical shells are broadly reusable.
**Decision:** DISCARD
**Reason:** A visual-first change would conceal rather than correct the system's root failures and would violate the Mobbin/approval gates.
**Next step:** Complete Mobbin-backed design and approval, then implement security/data foundations before visual remediation.

## [LOOP-007] Continuation unblocks missing capabilities

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** The model switch or continuation restored the missing Mobbin and browser capabilities.
**Experiment:** Re-searched connected tools for Mobbin, tried shell and in-app browser access to `localhost:8080`, then tried Chrome control and ran Chrome plugin diagnostics.
**Evidence:** Mobbin still returned 0 tools. Shell and in-app browser both could not reach port 8080 from this environment. Chrome is running, and the native host manifest is correct, but the ChatGPT Chrome Extension is not installed/enabled in the selected Chrome profile.
**Decision:** DISCARD
**Reason:** The required market source and controllable signed-in browser are still unavailable. The user's screenshot proves the app is running; the blocker is Codex access to that browser state.
**Next step:** Ask Vikram to connect/authenticate Mobbin MCP and install/enable the ChatGPT Chrome Extension in the Chrome profile where `localhost:8080` is open.

## [LOOP-008] Live runtime agrees with repository/data findings

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** Once Chrome control is restored, the live Test Hub routes will prove the module is closer to production-ready than the repository/data probes suggested.
**Experiment:** Claimed the signed-in Chrome `localhost:8080` tab and swept 15 Test Hub/admin routes read-only, saving screenshots and route text evidence.
**Evidence:** Routes load, but repository shows 2 cases, board shows archived work, plans show blank progress/timeline, reports show 0% coverage and 193 defects, traceability has a failed row displaying `0/1 PASSING`, timeline shows no matching work, My Work shows a different single case, and admin coverage shows 682 stories with 0 linked test cases.
**Decision:** DISCARD
**Reason:** The live UI confirms real surfaces exist, but it also confirms disconnected scope, lifecycle, coverage, and reporting gaps.
**Next step:** Keep Phase 1 as runtime-backed current-state evidence; continue only after Mobbin is connected for the market/future-state phase.

## [LOOP-009] Mobbin install flow exposes tools to current Codex task

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** Opening/adding Mobbin in ChatGPT will make Mobbin reference tools available inside this already-running Codex task.
**Experiment:** Opened the Mobbin ChatGPT app URL, observed the app page indicating Mobbin is installed/added, then re-ran connected tool discovery for Mobbin.
**Evidence:** Tool discovery still returned no Mobbin tools in this Codex task after the install/add flow.
**Decision:** DISCARD
**Reason:** Mobbin appears installed at the ChatGPT app level, but it is not yet exposed to this Codex task. The likely next gate is Mobbin sign-in/authorization plus a fresh Codex task/session refresh.
**Next step:** Handover to a fresh task. First action there: verify Mobbin tool exposure. If unavailable, stop and ask Vikram to complete connector sign-in/refresh.

## [LOOP-010] Mobbin evidence gate cleared

**Date:** 2026-07-11
**Phase:** Discovery
**Hypothesis:** A fresh continuation task exposes authenticated Mobbin search and image results.
**Experiment:** Queried Mobbin screen and flow search for repository, planning/readiness, run/result, traceability, and role/permission patterns; inspected returned images.
**Evidence:** Mobbin returned screen and flow metadata plus images. Accepted links and adaptation boundaries are recorded in `docs/testhub-remediation/02-market-reference-library.md`.
**Decision:** KEEP
**Reason:** The required external reference source is now available and material UX choices can be tied to verifiable evidence without copying a foreign design system.
**Next step:** Present the issue matrix, future-state experience, wiring blueprint, and owner approval packet; keep production implementation locked.

## [LOOP-011] Discovery packet completeness

**Date:** 2026-07-11
**Phase:** Planning
**Hypothesis:** Phases 1–5 can be handed to the owner as a coherent, evidence-backed approval packet without changing production code.
**Experiment:** Reconciled the current-state report, 15-route runtime sweep, Mobbin library, issue matrix, future-state experience, wiring blueprint, seven-agent outputs, and Advanced Council verdict.
**Evidence:** Documents 04–07 exist with Preserve/Remediate/Defer dispositions, full lifecycle contracts, binary acceptance criteria, and explicit owner questions. `03_PLAN_LOCK.md` remains `NOT_WRITTEN`.
**Decision:** KEEP
**Reason:** The discovery deliverable is complete enough for owner disposition, but no implementation authorization has been inferred.
**Next step:** Obtain owner answers and exact authorization boundary; then draft a slice-specific Plan Lock before any code or schema change.

## [LOOP-012] Dedicated Test Hub cockpit boundary

**Date:** 2026-07-11
**Phase:** Planning
**Hypothesis:** The premium cockpit can be implemented without modifying the shared Project Dashboard or creating new data contracts.
**Experiment:** Traced `/testhub/dashboard` to its thin `ProjectDashboardPage mode="test"` mount, inspected its two KPI widgets, the active Test Space resolver, execution/case/cycle hooks, canonical `JiraTable`, and display-key routes.
**Evidence:** Test Hub is isolated at `DashboardPage.tsx`; existing hooks provide project-scoped cases, executions, and cycles; execution navigation already uses `Routes.testHub.execution(execution_key)`. The cycle mapper does not expose `execution_id`, so execution-scoped readiness cannot be truthfully calculated in this slice.
**Decision:** KEEP
**Reason:** A dedicated read-only cockpit is a surgical three-file change. It can improve hierarchy while preserving sibling dashboards and explicitly omitting unsupported readiness claims.
**Next step:** Obtain approval of the exact `03_PLAN_LOCK.md`, create an isolated worktree, and implement only the locked slice.

### Format

```
## [LOOP-NNN] <Short description>

**Date:** YYYY-MM-DD
**Phase:** Discovery | Implementation | Validation
**Hypothesis:** [What you expected to be true]
**Experiment:** [Exact probe run]
**Evidence:** [What you found]
**Decision:** KEEP | DISCARD
**Reason:** [Why — 1-2 sentences]
**Next step:** [What to do with this result]
```
