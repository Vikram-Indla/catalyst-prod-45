# 14 — Competitor Feature Baseline: Enterprise Test-Management Taxonomy

Feature: CAT-TESTHUB-PROD-20260703-001 · Discovery agent · 2026-07-03

**Provenance note (evidence rule):** This document is deliberately NOT sourced from the repo. It is a market-knowledge baseline drawn from the assistant's product knowledge (cutoff Jan 2026) of Jira Xray, TestRail, AIO Tests, Zephyr Scale (formerly TM4J), Tricentis qTest, and PractiTest. Individual vendor claims are marked with the vendor name; where a capability's exact current state is uncertain it is marked UNKNOWN rather than asserted. This file is the yardstick for the TestHub gap analysis — each row becomes a gap-scoring line item.

**Competitor shorthand:** XR = Xray, TR = TestRail, AIO = AIO Tests, ZS = Zephyr Scale, QT = qTest, PT = PractiTest.

**Sibling context:** `12_ai_gateway.md` confirms Catalyst already has a Gemini generate-test-cases-from-story pipeline (`ai-generate-story-test-cases` edge fn, wired to `tm_test_cases`/`tm_test_steps`) — relevant to Domain 13.

---

## Domain map (16 domains)

| # | Domain | One-line scope |
|---|---|---|
| 1 | Test Design & Authoring | The test-case editor itself: steps, types, rich content |
| 2 | Repository Organization | Folders, hierarchy, search, bulk ops at 10k+ case scale |
| 3 | Parameterization & Datasets | Data-driven tests, variables, combinatorial iterations |
| 4 | Preconditions & Shared Steps | Reusable step blocks and setup objects |
| 5 | Versioning & History | Case versioning, immutable run snapshots, audit |
| 6 | Test Planning | Plans as scoping containers above cycles |
| 7 | Cycles / Runs Management | Cycle creation, assignment, environments, re-runs |
| 8 | Execution UX | The runner: step-by-step execution ergonomics |
| 9 | Defect Integration | Bug raising/linking from failures, dedupe, sync |
| 10 | Traceability & Coverage | Requirement↔test↔defect chains, coverage math |
| 11 | Reporting & Analytics | Dashboards, canned + custom reports, exports |
| 12 | Automation & CI Ingestion | JUnit/Cucumber import, REST API, CI plugins |
| 13 | AI Assistance | Generation, healing, dedupe, summarization |
| 14 | Administration & Custom Fields | Fields, workflows, permissions, templates |
| 15 | Import / Export / Migration | CSV/Excel/tool-to-tool migration paths |
| 16 | Collaboration & Review | Comments, review/approval workflows, notifications |

---

## 1. Test Design & Authoring

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 1.1 | Step-based test case (action / data / expected result as 3 distinct columns per step) | TR, XR | Steps are structured rows, not a blob; each field independently editable, reorderable by drag, and reportable per-step |
| 1.2 | Multiple test types per case (Manual stepped, BDD/Gherkin, Generic/unstructured, Exploratory) | XR | Type is a first-class field that switches the editor (steps grid vs Gherkin editor vs free text) and drives execution UX |
| 1.3 | Native Gherkin/BDD editor with syntax highlighting and scenario outline support | XR | Feature-file round-trip: author in tool, export .feature to repo, re-import results; scenario outlines expand to iterations |
| 1.4 | Rich text in every step field (tables, code blocks, formatting) | TR, ZS | Full rich-text (not plain text) in action/data/expected; consistent renderer in editor, runner, and PDF export |
| 1.5 | Inline attachments/images per step (paste screenshot into a step) | TR | Paste-from-clipboard into any step; attachments carried into execution view and reports |
| 1.6 | Case-level fields: priority, status (Draft/Ready/Deprecated), owner, component, labels, estimate | All | Fields are filterable, bulk-editable, and admin-configurable; estimate rolls up to cycle-level effort forecasting |
| 1.7 | Test case templates (pre-filled step skeletons per case type) | TR (templates per project) | Admin-defined templates enforce authoring standards; new case starts from template, not blank |
| 1.8 | Clone/copy case (within and across projects, with or without history) | TR, ZS | Cross-project copy preserves steps, attachments, custom fields; option to keep link to origin |
| 1.9 | Exploratory/session-based test charters (timebox, notes, session recording) | XR (Exploratory App), PT | Charter object with timer, note-taking, screenshot capture; session output convertible into scripted cases and defects |
| 1.10 | Markdown/keyboard-first fast authoring (grid-style rapid entry) | AIO (inline grid add), TR (bulk add rows) | Author 20 cases without leaving keyboard; tab-through step grid; no modal-per-step |
| 1.11 | Draft/Ready authoring workflow states with gating (can't add Draft case to a cycle) | ZS, PT | Status machine on the case itself, distinct from execution status; configurable gates |
| 1.12 | Attachments at case level with preview (video, HAR, images) | QT | Inline preview, size quotas, virus-scan hooks at enterprise tier |
| 1.13 | Custom step fields (e.g., "test data ref" column added to the step grid) | TR (step custom fields) | Step schema itself is extensible, not just case-level fields |

## 2. Repository Organization

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 2.1 | Unlimited-depth folder tree with drag-drop move | TR, ZS | Tree handles 50k+ cases; lazy-loaded nodes; drag between folders preserves ordering |
| 2.2 | Folder-level operations (run all in folder, export folder, permissions per folder) | TR | A folder is an actionable scope: create cycle from folder, count rollups per folder |
| 2.3 | Cross-cutting labels/tags orthogonal to folders | XR (Jira labels), PT (filter trees) | Two axes of organization: physical tree + logical tags; saved filters act as virtual folders |
| 2.4 | PractiTest-style dynamic filter trees (hierarchical saved-filter views) | PT | Repository can be re-projected by any field combination without moving anything — the signature PT feature |
| 2.5 | Full-text search across title, steps, expected results, comments | TR, QT | Search hits inside step text at scale, with field-scoped operators and <1s response on 10k cases |
| 2.6 | Saved searches / JQL-like query language for tests | XR (JQL + Xray custom fields) | Power users compose queries (`testType = Manual AND lastRunStatus = FAIL`), save and share them |
| 2.7 | Bulk edit (multi-select → change owner/priority/labels/folder for 500 cases) | TR | Bulk ops are transactional, undo-able or at least previewed, and audit-logged |
| 2.8 | Stable human-readable case keys (e.g., PROJ-T123) that survive moves | ZS, AIO (keys per project) | Key never changes on folder move or rename; key is URL-addressable and referenced in runs/reports |
| 2.9 | Archive (soft-delete) vs hard delete, with archived cases excluded from metrics but retrievable | TR, QT | Deleting a case never corrupts historical run data; archive is the default destructive action |
| 2.10 | Cross-project shared repository or case sharing model | QT (shareable modules), TR Enterprise | Reuse a regression pack across projects without cloning drift; UNKNOWN exact current mechanics per vendor |
| 2.11 | Ordering control (manual sort order inside a folder, persisted) | TR | Execution order in cycles can inherit repository order |
| 2.12 | Repository-level stats (cases per folder, coverage %, last-run health heatmap on the tree) | AIO (folder stats), PT dashboards | The tree itself communicates health, not just structure |

## 3. Parameterization & Datasets

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 3.1 | Named parameters in step text (`${username}`) resolved at execution time | TR Enterprise (parameters), XR (parameterized tests) | Placeholder syntax works in action/data/expected; unresolved params visibly flagged |
| 3.2 | Datasets: tables of parameter value rows attached to a test | XR (datasets at test/plan/execution level) | One case + N data rows = N iterations, each with its own pass/fail verdict |
| 3.3 | Dataset override hierarchy (test-level default, overridden per plan / per test-execution) | XR | Same case runs with prod-like data in one cycle, synthetic in another, without cloning |
| 3.4 | Iteration-level execution results (each data row is a separately recorded run) | XR | Reports can show "passed 9/10 iterations"; defect links attach to the failing iteration |
| 3.5 | Shared/project-level parameter libraries (reusable value sets, e.g., browser list) | TR Enterprise (shared parameter sets) | Central value set updated once, propagates to all referencing cases |
| 3.6 | Combinatorial generation (cartesian or pairwise combination of parameter sets) | XR (combinatorial datasets); pairwise UNKNOWN for most vendors | Tool generates the iteration matrix; tester doesn't hand-author 24 rows |
| 3.7 | Gherkin scenario-outline example tables treated as datasets | XR | Outline examples round-trip to automation and report per-example |
| 3.8 | CSV import/export of datasets | XR, TR | Data teams maintain datasets in spreadsheets; import validates column↔parameter match |
| 3.9 | Environment as an implicit parameter dimension (run same cycle against Chrome/Firefox/staging/prod) | TR (configurations), XR (test environments) | Configurations multiply assigned runs; results are separable per environment in every report |
| 3.10 | Parameter values visible inline during execution (runner substitutes values into step text) | TR, XR | Tester never mentally substitutes; the runner shows the resolved step |

## 4. Preconditions & Shared Steps

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 4.1 | Precondition as a first-class reusable entity (own key, own lifecycle) | XR (Precondition issue type) | Preconditions are linkable, searchable, versioned objects — not free text |
| 4.2 | One precondition attached to many tests; edit once, reflected everywhere | XR | Referential reuse with impact view ("this precondition is used by 43 tests") |
| 4.3 | Shared step groups (a named sequence of steps embedded by reference into many cases) | TR (shared steps), AIO | Editing the shared group updates all consumers; consumers show it expanded in the runner |
| 4.4 | "Call test from test" (modular composition: a case invokes another case's steps) | ZS (Call to Test step type), QT | Nested execution renders inline in the runner; recursion prevented; results roll up |
| 4.5 | Usage/impact report before editing a shared artifact | TR (shared step usage list) | Editor warns "used in N cases, M active runs" before a breaking edit |
| 4.6 | Snapshotting: in-flight runs keep the step text as it was when the run started | TR, ZS (execution snapshots) | Shared-step edits never mutate historical or in-progress execution records |
| 4.7 | Detach/inline-fork a shared step into a local copy | TR | Escape hatch when one consumer needs a divergent variant |
| 4.8 | Preconditions surfaced in the runner before step 1 (checklist-style acknowledgment) | XR | Runner blocks or warns until preconditions acknowledged; recorded in the run log |
| 4.9 | Shared setup at cycle level (cycle-wide preconditions/environment notes) | PT (test-set level fields), TR (run description) | Setup stated once per cycle, not repeated per case |
| 4.10 | Library governance: who may create/edit shared steps (role-gated) | QT, TR Enterprise | Reuse library is curated, not a free-for-all; edits audit-logged |

## 5. Versioning & History

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 5.1 | Full edit history on every case (who changed what field/step, when, diff view) | TR (history tab with diffs), ZS | Field-level and step-level diffs, not just "modified at" timestamps |
| 5.2 | Explicit numbered test-case versions (v1, v2 … selectable) | ZS (test case versions), QT (versioning) | A version is a citable artifact; cycles pin to a specific version |
| 5.3 | Execution records permanently bind to the case version executed | ZS, QT | A 2024 audit shows exactly the steps the tester saw in 2024, regardless of later edits |
| 5.4 | Restore/rollback to a prior version | TR, QT | One-click restore creates a new version (never silent overwrite) |
| 5.5 | Version compare (side-by-side diff of v3 vs v5 including steps) | QT; ZS partial — exact diff granularity UNKNOWN | Diff renders step insertions/deletions/edits distinctly |
| 5.6 | Immutable run/execution records (results can be corrected only via audited amendment) | PT (audit emphasis), QT | Regulated-industry requirement: no silent result mutation; e-signature option at top tier |
| 5.7 | Baselines: freeze an entire repository/plan snapshot for a release | XR (Test Plan snapshot semantics), QT (baselines) — exact vendor support varies, partially UNKNOWN | "What did our regression pack look like at release 2.3?" answerable years later |
| 5.8 | Audit log at project level (all entity CRUD, exportable, retention policy) | PT, QT (compliance tiers) | SOC2/FDA-friendly: filterable by user/entity/date, tamper-evident export |
| 5.9 | Deleted-entity tombstones (runs referencing a deleted case still render its name/steps) | TR, ZS | Referential integrity of history survives repository cleanup |
| 5.10 | Change annotations ("why" comment required on edit of Ready-state cases) | PT (configurable), QT workflows | Change-control gate for validated environments |

## 6. Test Planning

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 6.1 | Test Plan as a container entity above cycles (scope + objective + schedule) | XR (Test Plan issue type), QT (Test Plans) | Plan aggregates many executions/cycles and reports a consolidated verdict |
| 6.2 | Plan ↔ release/fix-version binding | XR (fixVersion), TR (milestones) | Plan progress feeds release-readiness views; one release, many plans, clean rollup |
| 6.3 | Milestones/sub-milestones with dates and completion rollup | TR (milestones) | Nested milestones; overdue highlighting; auto-close options |
| 6.4 | Add tests to plan by query/filter, not just hand-picking (dynamic membership option) | XR (add by JQL/filter), PT (filter-based test sets) | "All P1 regression cases for module X" resolves at plan-build time; re-runnable |
| 6.5 | Plan-level progress bar aggregating all child cycles (by latest run status) | XR, QT | Deduplicated aggregation: a test run in 3 cycles counts once by its latest/worst status per configurable policy |
| 6.6 | Effort estimation & capacity view (sum of case estimates vs tester availability) | TR (estimates + forecast) | Forecast completion date from historical execution pace |
| 6.7 | Entry/exit criteria recorded on the plan (definition of done for testing) | QT, PT (custom fields + workflow) | Criteria are checklist items whose state gates plan closure |
| 6.8 | Plan cloning for the next release (structure without results) | TR (rerun milestone), XR | One click sets up the next regression round; option to carry only failed/blocked |
| 6.9 | Cross-project plans (one plan spanning multiple projects' tests) | PT; others UNKNOWN/limited | Program-level test management for multi-team releases |
| 6.10 | Plan board/calendar view (cycles on a timeline) | QT; TR milestones partial | Visual schedule of who tests what, when |
| 6.11 | Risk-based prioritization fields (risk score driving what's in scope) | PT (custom fields + filter trees); native risk module UNKNOWN elsewhere | Scope can be cut by risk rank when time is short, with a defensible record |

## 7. Cycles / Runs Management

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 7.1 | Test cycle/run entity: an ordered list of case-instances with per-instance status, assignee, environment | All (TR runs, ZS cycles, XR Test Executions, AIO cycles) | The cycle is the atomic unit of "a round of testing"; instances are independent of the library case |
| 7.2 | Create cycle from: folder, filter/query, previous cycle's failures, plan scope | TR ("rerun failed"), XR | "Re-test only what failed or was blocked" is one click, preserving assignments |
| 7.3 | Per-instance assignment + bulk assignment (round-robin, by folder, by component) | TR, QT | Distribute 400 instances across 6 testers in seconds; workload view per tester |
| 7.4 | Environment/configuration on each instance (browser, OS, env) | TR configurations, XR test environments | Same case appears once per configuration; results segregate cleanly |
| 7.5 | Cycle status lifecycle (Not started / In progress / Done) with auto-derivation from instances | ZS, AIO | Cycle state is computed, not hand-maintained; manual override is audit-logged |
| 7.6 | Multiple executions per instance retained (run history per instance within a cycle) | XR (execution history), TR (result history per test-in-run) | A fail-then-pass sequence is fully visible; "latest result wins" for rollups but history persists |
| 7.7 | Instance-level fields: actual time, tested-on build, notes | TR (elapsed), AIO (effort capture) | Actual vs estimated time feeds forecasting reports |
| 7.8 | Ad-hoc unscripted entries in a cycle (add a quick exploratory item without a library case) | PT, XR (generic tests) | Reality-friendly: not everything executed was pre-authored |
| 7.9 | Cycle cloning/re-run with reset results, keep assignments option | TR, ZS | Regression round N+1 setup is trivially repeatable |
| 7.10 | Cycle-level defect and result summary panel (live counts by status) | AIO, TR | Standup-ready view without opening a report |
| 7.11 | Locking a completed cycle (results read-only after close) | QT, PT | Closed means closed; reopening is a permissioned, logged action |
| 7.12 | Parallel cycles against the same plan (e.g., smoke + full regression simultaneously) | XR, ZS | No cross-contamination of statuses between concurrent cycles |

## 8. Execution UX

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 8.1 | Dedicated runner view: one case at a time, step checklist, prominent status buttons | TR (progress-oriented runner), AIO | Zero-navigation execution: everything (steps, history, defects, attachments) on one screen |
| 8.2 | Per-step statuses (pass/fail/skip per step), auto-suggesting case verdict | XR, ZS, AIO | Step fail can auto-set case to Fail (configurable); partial credit visible in reports |
| 8.3 | Actual-result capture per step (text + screenshot paste) | XR, ZS | Failure evidence lives on the exact failing step, flows into the defect description |
| 8.4 | Keyboard-driven execution (P/F/B keys, next/prev case) | TR, AIO | A tester can execute 100 smoke cases without touching the mouse |
| 8.5 | Configurable status set (add "Blocked", "Not Applicable", custom statuses with colors) | TR (custom statuses), PT | Custom statuses flow through all reports and APIs, not just the runner |
| 8.6 | Timer / elapsed-time auto-capture | TR (elapsed), XR exploratory timer | Passive capture; editable afterward; aggregates to actual-effort reporting |
| 8.7 | Inline defect creation pre-filled with case, failing step, actual result, environment, attachments | AIO (one-click Jira bug with context), XR | Bug is raised in <10 seconds with zero retyping; link is bidirectional immediately |
| 8.8 | Assign-next / my-queue flow ("give me my next unexecuted instance") | TR, QT sessions | Testers pull work; leads see queue burn-down |
| 8.9 | Batch statusing (select 30 instances → mark Passed) | TR, AIO | With confirmation + audit; forbidden statuses (e.g., batch-fail without comment) configurable |
| 8.10 | Offline/unstable-network tolerance (draft results not lost on disconnect) | UNKNOWN across vendors; TR autosave partial | At minimum: autosave of in-progress actual results and comments |
| 8.11 | Runner shows previous run's result + last defect for the same case | AIO, TR (history sidebar) | Context prevents re-raising known bugs and speeds regression judgment |
| 8.12 | Mobile/tablet-usable runner | PT, TR responsive; native apps UNKNOWN | Field/device testing can execute without a laptop |
| 8.13 | Session recording hooks (screen capture apps, e.g., Xray Exploratory App) | XR | Evidence-grade capture attached automatically to the run |

## 9. Defect Integration

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 9.1 | Create defect from a failed step with auto-populated repro steps (steps 1..n up to failure) | AIO, XR | The bug description is generated from structured step data, not typed from memory |
| 9.2 | Link existing defect (search-as-you-type) from runner | All | Dedupe-first flow: search suggested before create |
| 9.3 | Bidirectional linking: defect shows which tests/runs found it; test shows its defects | XR (native Jira links), PT | Navigable both directions; link survives case/cycle archival |
| 9.4 | Defect status live-synced into cycle view (see "Open bug" badge on failing instance) | AIO, XR (same-Jira advantage) | Retest decisions made from the cycle screen; no tab-hopping |
| 9.5 | Auto-suggest retest when linked defect transitions to Done | XR (via Jira automation), QT rules engine | Closing the bug queues the failing instance for re-execution |
| 9.6 | Defect density & clustering reports (defects per component/folder/case) | PT dashboards, TR defect reports | Hotspot identification drives risk-based scope for next cycle |
| 9.7 | Multi-tracker support (Jira, Azure DevOps, GitHub Issues) for standalone tools | TR (many integrations), PT | Field mapping configurable per project; tracker outage degrades gracefully |
| 9.8 | Attach execution evidence (screenshots, logs) automatically to the created defect | AIO, XR | Evidence copied or referenced so developers see exactly what the tester saw |
| 9.9 | Defect-per-iteration granularity (data-driven failure links the failing data row) | XR | Repro data values embedded in the defect |
| 9.10 | "Known issue" association (pre-link a defect to a case so expected failures are marked, not re-triaged) | TR (references), PT; formal known-issue state UNKNOWN in some | Expected-fail semantics separate regression noise from new signal |

## 10. Traceability & Coverage

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 10.1 | Requirement/story ↔ test linking as a first-class relation | XR ("covers" link type) | Not generic links: a typed relation the coverage engine computes over |
| 10.2 | Coverage status computed per requirement (OK / NOK / NOT RUN / UNCOVERED) from latest runs | XR (its signature capability) | Verdict logic configurable (by version, by environment, by test plan scope) |
| 10.3 | Coverage scoped by version/plan/environment ("is story X covered for release 2.3 on prod-like env?") | XR | The same story can be green for v2.2 and red for v2.3 simultaneously |
| 10.4 | Traceability matrix report: requirement → tests → runs → defects in one exportable table | XR, PT, QT | Auditor-ready end-to-end chain, exportable to Excel/PDF with filters |
| 10.5 | Uncovered-requirements view (stories in scope with zero linked tests) | XR, ZS (coverage reports) | Gap list drives authoring work; filterable by sprint/epic/component |
| 10.6 | Epic-level rollup (coverage aggregates child stories) | XR (hierarchical coverage); depth configurable, others UNKNOWN | Program-level answer from story-level data |
| 10.7 | Bulk link tests↔stories (from either side, by query) | XR, AIO | Retro-fitting coverage on a legacy backlog is feasible |
| 10.8 | Coverage widget embedded on the story/issue view itself | XR, ZS, AIO (Jira issue panels) | Developers/POs see test status without entering the test tool |
| 10.9 | Impact analysis: story changed → flag linked tests as "needs review" | QT rules, PT; XR partial via status | Requirement churn automatically dirties dependent tests |
| 10.10 | Defect traceability into the chain (requirement → failing test → open defect) | XR, PT | Release gate can enforce "no open P1 defects on covered requirements" |
| 10.11 | Cross-project traceability (test in project A covers story in project B) | XR (cross-project links) | Shared platform teams' reality supported |

## 11. Reporting & Analytics

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 11.1 | Canned report library (execution progress, status by cycle, defect summary, coverage, flakiness, effort) | TR (largest canned set), XR built-in reports | 15–25 maintained reports; each filterable, schedulable, exportable |
| 11.2 | Live dashboards with configurable widget grid per project/team | PT (strong dashboards), QT Insights | Multiple named dashboards, role-scoped sharing, TV/wallboard mode |
| 11.3 | Cross-project / portfolio analytics | QT Insights, PT | Org-level QA health without opening each project |
| 11.4 | Historical trends (pass-rate over time, defect discovery rate, velocity of execution) | TR (activity + comparison reports), QT | Time-series persisted independently of current entity state (deletes don't rewrite history) |
| 11.5 | Flaky-test identification (status flip-rate across recent runs) | QT Launch/Insights, AIO (automation analytics); others UNKNOWN | Flakiness score surfaced on the case; filterable to quarantine candidates |
| 11.6 | Traceability/coverage report exports (PDF/Excel) for auditors | XR (document generator via Xporter), PT | Pixel-acceptable formal documents, templated, with signatures block at top tier |
| 11.7 | Scheduled report email/Slack delivery | TR (scheduled reports), PT | Subscriptions per report with filters baked in |
| 11.8 | Report on custom fields (any admin-added field is a report dimension) | PT, TR | No second-class fields; custom field appears in filters, groupings, exports |
| 11.9 | Burndown / progress-vs-plan forecasting (will the cycle finish by the date?) | TR forecast, QT | Based on actual execution pace and remaining estimates |
| 11.10 | Requirement-coverage gap report per release | XR | The single report a release manager needs before go/no-go |
| 11.11 | API access to all report data (metrics endpoints, not just entity CRUD) | TR API, QT Insights API | BI teams pipe QA metrics into Snowflake/PowerBI without scraping |
| 11.12 | Per-tester productivity views (executed counts, effort) with privacy controls | TR, PT | Useful for capacity planning; permission-gated to leads |

## 12. Automation & CI Ingestion

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 12.1 | JUnit XML result import (API + UI upload) | All; XR & TR most mature | Idempotent import; auto-creates or auto-matches cases by name/key; results land in a designated cycle |
| 12.2 | Multi-format ingestion: TestNG, NUnit, xUnit, Cucumber JSON, Robot Framework, Behave, pytest | XR (broadest format list) | Format adapters maintained by vendor; unknown formats via generic JSON |
| 12.3 | Cucumber/BDD round-trip (export .feature files, import execution results back to the same scenarios) | XR | Scenario in the tool = scenario in the repo; results map without manual reconciliation |
| 12.4 | Stable automation↔case mapping keys (test key annotation in code, e.g., `@TestKey(PROJ-T12)`) | XR, ZS (annotations), TR (case IDs) | Rename-proof mapping; unmapped results quarantined for triage, not silently dropped |
| 12.5 | Auto-create cases from first-seen automated results (with folder/labeling rules) | TR (CLI), AIO importer | Zero-touch onboarding of an existing automated suite |
| 12.6 | Native CI plugins / actions (Jenkins, GitHub Actions, GitLab, Azure Pipelines) | XR (Jenkins plugin, GH action), TR CLI | Pipeline step publishes results with exit-code semantics; secrets-safe auth |
| 12.7 | Full REST API over every entity (cases, cycles, results, plans, defect links) with pagination + rate limits documented | TR (long-stable API), XR GraphQL+REST | API parity with UI: anything clickable is scriptable; versioned API with deprecation policy |
| 12.8 | Webhooks/events (result recorded, cycle closed → outbound event) | QT, TR (webhooks); coverage varies, partially UNKNOWN | Event-driven integration to Slack/data-lake without polling |
| 12.9 | Automated vs manual segregation in all reports (and blended totals) | AIO (automation dashboards), XR | One cycle can mix manual + automated instances with clear provenance per result |
| 12.10 | Build/commit metadata on automated results (build number, git SHA, pipeline URL) | XR, QT Launch | "Which build broke it" answerable from the run record |
| 12.11 | Scheduled/triggered automation orchestration from the tool (kick off a pipeline for a cycle) | QT Launch; others delegate to CI — orchestration depth UNKNOWN | At minimum: deep links from cycle to the pipeline that fed it |
| 12.12 | Result-level artifacts ingestion (screenshots, videos, logs attached via API) | XR, TR | Evidence from CI is attached to the exact instance/step, size-managed |

## 13. AI Assistance

(Fast-moving area — capabilities below reflect vendor state as of assistant knowledge cutoff Jan 2026; verify current marketing claims before citing externally.)

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 13.1 | Generate test cases from a requirement/story (steps included) | TR (TestRail Copilot-class features), XR AI; AIO AI case generation | Grounded in the actual story text + acceptance criteria; outputs structured steps, not prose; user reviews before save. (Catalyst already has this per sibling doc 12 — `ai-generate-story-test-cases`.) |
| 13.2 | Generate BDD/Gherkin scenarios from acceptance criteria | XR AI | Valid Gherkin, scenario outlines where data-driven, mapped to the story |
| 13.3 | Step refinement/rewrite (clarify vague steps, normalize tone, split compound steps) | TR AI assist | One-click improve with visible diff; never silently mutates |
| 13.4 | Duplicate/similar test detection at authoring time | AIO (duplicate detection); embeddings-based | "This looks 92% similar to PROJ-T88" before a new case is saved; repository-wide dedupe report |
| 13.5 | Coverage-gap suggestions (AI reads story + existing tests, proposes missing negative/edge cases) | Emerging across XR/TR — maturity UNKNOWN | Suggestions cite which AC is uncovered; accept-per-suggestion UX |
| 13.6 | Failure summarization (cluster N failed runs into probable root-cause groups) | QT Launch analytics; LLM-based summaries emerging, vendor maturity UNKNOWN | Cycle-close report drafts itself; links every claim to specific runs |
| 13.7 | Flaky-test explanation and quarantine suggestion | Emerging; UNKNOWN best-in-class | Signal is computed (flip-rate) even if narrative is AI |
| 13.8 | Natural-language search/query over the repository ("regression tests for checkout not run this month") | Emerging (Atlassian Rovo direction for XR/Jira); UNKNOWN maturity | NL compiles to the real query language, shown to user for trust |
| 13.9 | Risk-based prioritization suggestions (which tests to run for this changeset) | Test-impact-analysis products (e.g., Launchable-class); within TM suites UNKNOWN | Defensible ranking with the "why" per test |
| 13.10 | Manual-to-automated conversion drafts (generate automation skeleton from stepped case) | Emerging; UNKNOWN | Generates framework-specific stub with mapping key pre-inserted |
| 13.11 | AI governance controls (org toggle, data-residency statement, no-training guarantees, audit of AI actions) | TR/Atlassian enterprise AI terms | Enterprise gate: AI features must be disableable per org and logged; provenance flag on AI-generated content (Catalyst already stores `is_ai_generated` — sibling doc 12) |

## 14. Administration & Custom Fields

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 14.1 | Custom fields on every entity (case, step, cycle, plan, run result) with types: text, select, multiselect, user, date, number, checkbox, URL | TR (rich field types incl. steps), PT | Fields on runs/results, not just cases — that's where competitors differentiate |
| 14.2 | Per-project field configuration (field sets/templates vary by project) | TR (templates per project), QT profiles | Central governance + project flexibility; field reuse across projects with one definition |
| 14.3 | Required/conditional fields (field required when status = Fail) | PT (field dependencies), QT | Data quality enforced at entry, not cleaned later |
| 14.4 | Custom execution statuses (add/re-color/re-order; map to pass/fail semantics for rollups) | TR, PT | New statuses automatically valid in reports, APIs, imports |
| 14.5 | Role-based permissions (author vs executor vs viewer vs admin) with per-project role assignment | QT, PT, TR Enterprise | Granular verbs: create case, edit shared steps, close cycle, delete, export; deny-by-default option |
| 14.6 | Folder/entity-level permission overrides | TR Enterprise (project access), QT | Sensitive suites (security tests) restricted within a shared project — depth varies, partially UNKNOWN |
| 14.7 | Configurable workflows on case lifecycle (Draft→Review→Ready→Deprecated with transition rules) | PT, QT | Transitions permissioned and logged; states drive gating (only Ready cases enter cycles) |
| 14.8 | SSO (SAML/OIDC) + SCIM provisioning | All at enterprise tier | Group-to-role mapping; deprovision revokes sessions |
| 14.9 | Org-wide audit log + admin activity log | PT, QT | Separate from project audit; exportable; retention configurable |
| 14.10 | Notification scheme configuration (who gets emailed/Slacked on what event, per project) | TR, PT | Per-user overrides + admin defaults; digest options to prevent spam |
| 14.11 | API tokens/service accounts with scoped permissions | TR, QT | CI uses a service identity, not a human's token; token rotation and last-used visibility |
| 14.12 | Data retention/archival policies (auto-archive cycles older than N months) | Enterprise tiers; specifics UNKNOWN | Predictable performance at multi-year scale |
| 14.13 | Environment & configuration catalogs administered centrally | TR configurations, XR environments | One canonical browser/OS/env list; no free-text drift |

## 15. Import / Export / Migration

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 15.1 | CSV/Excel test-case import with column-mapping wizard and dry-run preview | TR (mature CSV import), ZS | Multi-row steps per case handled; validation report before commit; re-runnable with dedupe keys |
| 15.2 | CSV/Excel export of any grid/filter result (cases, runs, cycles) | All | Exports respect current filters/columns; step-level export option |
| 15.3 | Tool-to-tool migrators (from TestRail/Zephyr/qTest/Excel into the tool) | XR & ZS (Jira-ecosystem migrators), PT (migration service) | Preserves folders, steps, attachments, history where possible; mapping report of what didn't survive |
| 15.4 | Attachment migration (images/files carried, not just text) | Migrator-dependent; UNKNOWN completeness per vendor | Attachments re-hosted with links rewritten |
| 15.5 | Execution-history migration (past runs, not just the library) | Rare — qTest/PT services; most tools import library only; UNKNOWN exact support | Enterprise buyers demand history for audit continuity; even "read-only archive import" counts |
| 15.6 | Formatted document export (test spec / run report as branded PDF/Word) | XR via Xporter (templated docs — best-in-class), PT | Template language over entities; regulatory submission-grade documents |
| 15.7 | Full-project export/backup (JSON/XML of everything, restorable) | TR (export XML), PT backups | Escape-hatch guarantee against lock-in; scheduled backups at enterprise tier |
| 15.8 | Gherkin .feature file import/export en masse | XR | Repo-of-record can be git, tool stays synchronized |
| 15.9 | API-first migration (documented entity ordering: projects→folders→cases→steps→cycles→results) | TR, XR (community migration scripts ecosystem) | Rate limits and idempotency documented so a 50k-case migration is scriptable |
| 15.10 | Import de-duplication and update-in-place mode (match by key/name, update instead of duplicate) | TR CSV (update via ID), AIO importer | Re-import of a corrected spreadsheet doesn't double the repository |

## 16. Collaboration & Review

| # | Capability | Best-in-class | What "enterprise-grade" means |
|---|---|---|---|
| 16.1 | Comments on cases, cycles, and individual run results with @mentions | XR/ZS/AIO (Jira-native comments), TR | Mention triggers notification; comments render in history and exports |
| 16.2 | Formal review/approval workflow on test cases (submit → reviewer approves → Ready) | PT, QT (workflow states + permissions) | Approval is recorded (who/when), required before cycle inclusion; e-signature at regulated tier |
| 16.3 | Watchers/subscriptions on entities (follow a case, a cycle) | Jira-native for XR/ZS; TR partial | Granular event choice; unsubscribe honored everywhere |
| 16.4 | Activity feed per entity and per project | QT, PT | Human-readable timeline consolidating edits, runs, comments, links |
| 16.5 | Real-time collaborative safety (edit-conflict detection or live presence on a case) | Mostly optimistic-lock warnings; true co-editing UNKNOWN across vendors | Minimum bar: second editor is warned, no silent last-write-wins |
| 16.6 | Slack/Teams integration (cycle closed, run failed, mention → channel message) | TR, PT, QT integrations | Configurable event→channel routing per project |
| 16.7 | Shareable deep links to any entity/filter/report (permission-checked) | All (key-based URLs) | A URL pasted in standup opens the exact filtered view |
| 16.8 | Review checklists/quality gates for authored cases (style rules before Ready) | PT (workflow+required fields); AI-assisted linting emerging, UNKNOWN | Authoring standards enforced systematically, not by convention |
| 16.9 | Assignment notifications with daily digest option ("you have 14 instances to execute") | TR (todos), AIO | Testers' inbox is actionable, not noisy |
| 16.10 | Guest/read-only stakeholder access (PO views coverage without a paid seat) | PT (free reporters model); seat economics vary | Stakeholders consume dashboards without consuming licenses |

---

## Yardstick usage notes for the gap analysis

1. Score each of the ~180 capability rows for Catalyst TestHub as: **HAVE / PARTIAL / MISSING / N/A**, citing file:line evidence for HAVE/PARTIAL.
2. Weight domains for a v1 "production-grade" bar. Suggested table-stakes core (must be substantially HAVE): Domains 1, 2, 7, 8, 9, 10, 11 — no serious tool ships without step authoring, folders, cycles, a real runner, defect links, coverage, and basic reports.
3. Differentiator domains where Catalyst can leapfrog rather than chase: 13 (AI — already has a head start per `12_ai_gateway.md`), 3 (datasets — weak in mid-market tools), 12 (CI ingestion — high-leverage for credibility).
4. Deferred-acceptable for v1: 15 (migration beyond CSV), 5.6–5.8 (regulated-industry audit), 14.8 (SSO/SCIM — org-level concern above TestHub), 6.9/10.11 (cross-project).
5. Rows marked UNKNOWN are uncertain vendor claims — do not cite them as competitor facts externally; they remain valid as capability *ideas* for gap scoring.
