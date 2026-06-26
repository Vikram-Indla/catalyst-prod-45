# External Benchmark Research: test-hub

**Date:** 2026-06-26
**Experiment:** test-01 (deep discovery)
**Benchmark:** AIO Tests — complete capability model extraction

---

## 1. AIO ENTITY MODEL

### Test Case
- Fields: case_key, title, objective (ADF rich text), precondition, status (Draft/Ready/Approved/Deprecated), priority (Critical/High/Medium/Low), type (Functional/Regression/Smoke/Integration/E2E/Performance/Security/Usability), automation_status, owner, assignee, component, labels, estimated_effort, folder_id, version, ai_generated
- Relationships: 1:M steps, M:M sets, M:M cycles (version-locked), M:M requirements, 1:M comments, 1:M attachments, 1:M versions
- Lifecycle: Draft → Ready → Approved → Deprecated → Archived

### Test Step
- Fields: step_number, action, expected_result, test_data, attachments, is_shared
- Relationships: N:1 case, 0:1 shared_step_library_entry, 1:M execution results (captured at runtime)

### Test Folder
- Recursive hierarchy; max 10 levels; separate trees for cases / sets / cycles
- Virtual folders: "All" (root), "Not Assigned" (NULL parent)
- Unique constraint: UNIQUE(project_id, parent_id, entity_type, name)

### Test Set
- Fields: set_key, name, description, folder_id, status, owner
- Static collection of cases; M:M to cases via join table
- Relationships: 1:M plans, 1:M cycles
- Quick actions: "Create Cycle from Set", "Run Set", clone

### Test Cycle
- Fields: cycle_key, name, status (Active/Completed/Paused/Archived), start_date, end_date, owner, folder_id
- VERSION LOCKING: when case scoped into cycle, current case version frozen; case edits don't affect in-progress cycle
- Relationships: M:M cases (via tm_cycle_scope + locked_version), 1:M plans, 1:M test_runs, 1:M defects

### Test Plan
- Fields: plan_key, name, description, owner, status, start_date, end_date, release_id
- Container for organizing multiple cycles across releases/phases
- Relationships: 1:M cycles, M:M requirements

### Test Execution / Test Run
- Fields: execution_id, execution_number (per-cycle auto-increment), cycle_id, case_id, case_version (immutable snapshot), status (Passed/Failed/Blocked/Not Executed/Skipped), executed_by, executed_at, duration (seconds), notes, defects_linked
- Immutable: once created, execution record is audit trail
- Relationships: N:1 cycle, N:1 case, N:1 case_version (immutable), 1:M step_results, 1:M defects, 1:M comments

### Defect
- Fields: defect_key, title, description, status (Open/In Review/In Progress/Fixed/Closed/Duplicate), priority, severity, component, assignee, linked_execution, linked_case, created_by, created_at
- Bidirectional Jira sync (create Jira bug from defect; status updates percolate both ways)
- Relationships: M:1 execution, M:1 case, M:M requirements, 1:M comments, 1:M attachments

### Requirement
- Fields: req_id, title, status, coverage_status (Not Covered/Partially Covered/Covered/Over-Tested), source (Jira/manual/import)
- Auto-percolation: if all linked cases pass → Covered; partial pass → Partially Covered; any fail → Under Review
- Relationships: M:M test_cases (via tm_requirement_tests), M:M test_plans, M:M defects

---

## 2. COMPLETE CAPABILITY CATALOGUE

### Test Case Management (14 capabilities)
- Inline row creation (quick add: title, priority, folder)
- Full modal creation (multi-tab: Details / Steps / Data / Attachments / Additional)
- Rich text editing (ADF — Atlassian Document Format)
- Bulk import (CSV/Excel with field mapping, validation, duplicate detection)
- Case cloning (clone with/without steps, selectable fields)
- Field configurations (per-entity mandatory/optional toggle)
- Custom fields (11+ types: Text, Dropdown, Checkbox, Date, Number, User, Attachment)
- Templating (pre-built case templates for common scenarios)
- AI generation (Claude-powered from requirement text; confidence scoring)
- Case versioning (auto-snapshot on edit; restore to any prior version; diff viewer)
- Shared steps library (reusable step sequences linkable into multiple cases)
- Bulk operations (multi-select: status change, priority update, delete, reassign)
- Case linking (duplicate, related, prerequisite relationships between cases)
- Bulk reassignment (change owner/folder across multiple cases)

### Test Organization (11 capabilities)
- Create/rename/move/delete/reorder folders (full CRUD; drag-drop reorder; gap-based sort_order)
- Recursive case count (badge = cases in folder + all descendants)
- Case filtering by folder (click folder → filter to self + descendants)
- Entity-specific folder trees (separate trees for cases, sets, cycles)
- Test set creation (modal; multi-select cases; folder assignment)
- Add/remove cases to set dynamically
- Set cloning (clone with full or subset of cases)
- Release assignment on sets (link set to release for readiness tracking)
- Suite rollup (aggregate execution results up to suite level)
- Suite reports (case distribution, execution trend per suite)
- Bulk set operations (clone, move, delete)

### Test Planning (10 capabilities)
- Cycle creation (modal: name, dates, folder, owner, status)
- Add cases to cycle from case grid (checkbox select; version lock applied on scope)
- Bulk add from set ("Add Set to Cycle" → all set cases scoped with version lock)
- Case removal from cycle (unscopes; preserves other cycles)
- Assignee management (assign cases to testers; bulk reassign)
- Cycle planning view (grid: case key / title / owner / status / assignee; reorder cases)
- Version locking (case edits don't affect in-progress cycle — execution consistency guarantee)
- Cycle copying (clone cycle with same or filtered subset of cases)
- Archive cycle (mark completed; readonly but searchable)
- Test plan creation (name, description, release, dates, owner; group cycles into plan)

### Test Execution (12 capabilities)
- Case-by-case execution (one case at a time; step-by-step interface)
- Step navigation (prev/next; highlight current step)
- Step execution (per-step: Pass/Fail/Blocked dropdown; optional result message)
- Step attachments (upload screenshots, logs, evidence per step)
- Timer (visual countdown during execution; optional)
- Bulk step assign (assign Pass/Fail to multiple steps at once)
- Case notes (overall execution notes; threaded comments on case)
- Defect linking (link defect from execution; auto-creates with context: case, step, cycle)
- Evidence attachment (screenshot/log capture at step or case level)
- Execution overview dashboard (KPIs: total, passed, failed, blocked, in-progress)
- Offline mode (download cycle; native iOS/Android app; sync on reconnect) [AIO Premium]
- Mobile app (native app for field/remote testing) [AIO Premium]

### Defect Management (8 capabilities)
- Create defect from execution (modal pre-filled: case, step, cycle context)
- Link to Jira (create Jira issue; auto-sync issue key bidirectionally)
- Bulk defect creation (from multiple failed cases)
- Defect attachment (link execution evidence to defect)
- Defect lifecycle (Open → In Review → In Progress → Fixed → Closed → Duplicate)
- Defect traceability (linked to execution, case, requirements)
- Defect history (all state changes: who, when, what)
- Defect metrics (count by priority, by component, by assignee)

### Traceability (7 capabilities)
- Link case to requirement (M:M via join table)
- Bulk link cases to requirement
- Automatic coverage percolation (all-pass → Covered; any-fail → Under Review)
- Coverage matrix (visual: Requirements × Test Cases showing coverage + test result)
- Uncovered requirements dashboard (requirements with 0 linked cases)
- Traceability reports (summary + detail; Excel/PDF export)
- Requirement import (Jira bulk import, CSV, API)

### Reporting (16+ report types)
See Section 5 for full report model.

### Import/Export (7 capabilities)
- CSV/Excel case import (field mapping, validation, duplicate detection, conflict resolution)
- Full case export (ZIP: case details + steps + attachments)
- Grid export (current filtered grid → CSV/Excel; column selection)
- Execution results export
- Defect export
- Custom template export
- API import (programmatic upload via REST API)

### Automation Integration (6 capabilities)
- Automation status field (Manual / Automated / In Progress / Null)
- Automation owner field
- CI/CD integration (trigger automation tests on cycle; import results back)
- Automation Activity Report (created vs automated; pending pipeline)
- Automation Coverage (% automated by component, priority, type)
- Automation Maintenance (flaky test detection)

### BDD/Gherkin (5 capabilities)
- Given-When-Then syntax for case authoring
- Step definitions (link Gherkin steps to automation test steps)
- Feature file import (.feature files from Cucumber/BDD projects)
- Scenario outline (data-driven Gherkin scenarios)
- Step library (reusable Given/When/Then steps)

### AI Features (6 capabilities — see Section 4 for deep-dive)
- AI case generation from requirement text (Claude/OpenAI; confidence scoring)
- AI step generation from case objective
- AI defect analysis (smart linking; root cause detection)
- Token tracking (per-project, per-user, per-model; monthly budget alerts)
- Multi-provider (OpenAI, Azure OpenAI, Claude; toggle per user or project)
- AI trust card (transparency: prompt used, model, confidence, provenance)

### Permissions & Configuration (8 capabilities)
- Role-based access (Admin / User / Guest per project)
- Entity-level permissions (folder/case visibility by role)
- Workflow permissions (only certain users can approve, archive, execute)
- Field-level permissions (hide/show custom fields by role)
- Custom fields (11+ types; admin-configurable)
- Custom statuses (rename/add status values; define workflow transitions)
- Custom priorities and types (admin manages)
- Audit log (30-day retention; delete operations; searchable by activity/user/entity)

---

## 3. USER JOURNEY MODEL

| Journey | Steps | Key Screens |
|---|---|---|
| Create & Organize Cases | Setup folders → Author cases → Tag/link → Review lifecycle → Reuse via shared steps → Bulk import | Repository, Case Create Modal |
| Plan a Test Cycle | Create cycle → Scope cases (version-lock) → Assign testers → Review coverage → Activate | Cycles, Cycle Detail |
| Execute Tests | Pick cycle → Pick case → Step-by-step execution → Pass/Fail/Blocked → Attach evidence → Save | Execution Workbench |
| Log Defects | Failed step → Create/link defect → Context auto-populated → Jira issue created → Bidirectional sync | Execution → Defect Modal |
| Review Results & Reports | Execution dashboard → Drill into failures → Generate reports → Export PDF/Excel | Reports, Cycle Results |
| Release Readiness | Regression cycle → Baseline comparison → Release readiness report → Go/No-Go decision | Reports, Release Dashboard |

---

## 4. AI FEATURES DEEP-DIVE

| Feature | Input | Output | Guardrails |
|---|---|---|---|
| Case generation from requirement | Requirement text, case type | 5-10 cases: title, steps, preconditions, type | Confidence scoring; mandatory human review for <85 confidence |
| Step generation from objective | Case objective text | Ordered action + expected result pairs | User can regenerate; alternative step variations |
| Defect smart linking | Defect text | Related cases/requirements suggestions | Advisory only; never auto-link |
| Token tracking | Usage per project/user/model | Monthly dashboard; budget alerts | Admin sets limits per project/user |
| Provider selection | Admin config | Toggle Claude / OpenAI / Azure per project | Rate limiting per provider |
| AI trust card | Every AI action | Prompt used, model, confidence, provenance | Always shown; cannot be hidden |

**AIO AI Limitations:**
- Generic Claude/OpenAI; no domain-specific training
- No real-time execution intelligence (reports only, not in-cycle)
- No conversational layer; transactional only
- Step quality thin for security/a11y cases

---

## 5. REPORTING MODEL

| Report | What It Shows | Who Needs It | Format |
|---|---|---|---|
| Execution Summary | Total/Passed/Failed/Blocked; duration; top failers | QA Lead, PM | Per cycle; drill-down |
| Execution History | Time-series; completion % over days | QA Lead, Stakeholder | Line chart |
| Execution Burndown | Planned vs actual execution completion | QA Lead, Scrum Master | Per release; weekly |
| Execution Distribution | Pie/bar by status, assignee, component, priority | QA Lead, Team | Per cycle; interactive |
| Execution Trend | Cases executed per week; acceleration/deceleration | QA Lead, PM | Multi-week |
| Automation Activity | Created vs Automated vs Pending; rate | QA Lead, Automation Owner | Date range |
| Automation Coverage | % automated by component, priority, type | QA Lead, Engineering Manager | Per release |
| Case Distribution | Primary + secondary grouping (e.g., by type + release) | QA Lead, Team | Aggregators: Count, Presence, Effort |
| Case Usage | Execution frequency per case; dormant cases | QA Lead | Identifies stale/unused |
| Traceability Summary | Requirements coverage; uncovered/under-tested | PM, QA Lead | Requirement-focused |
| Traceability Detail | Which cases cover which requirements; result rollup | QA Lead, Requirements Owner | Case-by-requirement matrix |
| Coverage Matrix | Visual: Req × Case coverage | PM, Stakeholder | Interactive; exportable |
| Defect Trend | Defects created/closed over time; open count; age | QA Lead, Dev Lead | Time-series |
| Defect Distribution | Pie/bar by severity, component, assignee, status | QA Lead, Dev Manager | Drill-down to defect list |
| Release Readiness | Exec brief: Req coverage%, Critical tests passed%, Defect metrics; Go/No-Go | Executive, Release Manager | Consolidated; traffic-light |
| Multi-Cycle Comparison | Side-by-side execution metrics across cycles | QA Lead, Stakeholder | Regression/improvement |

**Report Features:** save/schedule, dynamic input (filter-based auto-refresh), PDF/Excel/CSV export, share link, drill-down, custom fields as dimensions, dashboard gadgets.

---

## 6. STRENGTHS AIO DOES WELL (Catalyst Must Match)

1. Jira-native integration (bidirectional defect sync, issue-to-case creation)
2. Enterprise-grade version locking (case edits don't break in-progress cycles)
3. Recursive folder hierarchy (max 10 levels; drag-drop; auto-count badges)
4. Dynamic reporting (filter-based; auto-refreshes when new data matches)
5. Multi-dimensional case analytics (Case Distribution with primary+secondary grouping)
6. Automation tracking (integrated case automation status; clear pipeline)
7. AI-assisted case generation with confidence scoring + regeneration
8. Bidirectional defect sync (Jira status updates percolate to AioTests)
9. Audit logging (30-day retention; searchable; delete tracking)
10. Role-based permissions with field-level visibility
11. Custom fields & statuses (admin-tailored to org terminology)
12. Requirement traceability with automatic status percolation

---

## 7. AIO LIMITATIONS (Catalyst Opportunity to Win)

1. Heavy Jira dependency — cannot exist standalone
2. Generic AI — no domain-specific training (Arabic/regulatory context)
3. No native requirements engine — Jira-only import
4. Step editor UX cumbersome (ADF in every field; limited step templates)
5. No built-in test data repository or parameterization engine
6. BDD support thin (feature import exists but not first-class)
7. No real-time execution intelligence (reports only; no in-cycle AI)
8. Limited team collaboration (no @mentions in comments; no co-execution)
9. No built-in API/automation native bridges (webhook-only CI/CD)
10. No release rollback workflow or regression profiles
11. Execution dashboard no predictive analytics (no cycle completion forecast)
12. Folder drag-reorder sluggish at large scale (no virtual scroll)

---

## 8. TOP 10 CATALYST OPPORTUNITY AREAS

1. **Ministry-native AI** — Arabic-first, regulatory context, Saudi compliance awareness
2. **Native requirements engine** — First-class requirements (not Jira-import-only)
3. **Test data repository** — Built-in library with parameterization, PII encryption
4. **Predictive analytics** — ML-powered cycle completion forecast; defect burn forecast
5. **Collaborative real-time execution** — Co-execution mode; live team progress; @mentions
6. **Rich step editor** — Templates by case type; BDD-first; reusable with parameter substitution
7. **Intelligent test maintenance** — Flaky test detection; stale case alerts; AI automaton recommendations
8. **Release rollback & regression profiles** — One-click regression setup; baseline comparison
9. **API-native automation sync** — Native bridges to Selenium/Cypress/Jest (not webhook-only)
10. **Compliance-grade audit** — Every action logged; folder/case/execution-level RLS; data residency
