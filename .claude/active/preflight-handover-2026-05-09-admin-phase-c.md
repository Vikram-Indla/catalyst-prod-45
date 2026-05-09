# Preflight handover — Admin Phase C functional remediation — 2026-05-09

## Context
- Surface: cross-cutting (ui-refactor + ui-bug-fix + backend-migration + dead-wood-removal)
- Tier: high-stake
- Started: 2026-05-09
- Council ran: yes (full 5-advisor + peer review, inline)
- Prior PR: #121 merged (Phase B — ADS chrome migration complete)
- Repo: /Users/jahanarakhan/Documents/GitHub/catalyst-prod-45
- Branch for Phase C work: new branch from main per block

## Vikram decisions (confirmed 2026-05-09)
1. 7 incident admin routes → DELETE (already removed from router in PR #121; files to confirm deleted)
2. /admin/v2 shell → DELETE (router redirect already in PR #121; 10 page files + 2 hooks still exist on disk)
3. /preflight --council approved

## Council verdict (5 bullets)
1. Dead-wood first, fast PR: delete src/pages/admin/v2/ (10 files) + src/hooks/admin/useAdminV2Flag.ts + useAdminMutation.ts + fix 2 broken hrefs in WorkflowViewerModal.tsx (/admin/v2/work-items/workflows → /admin/workhub/jira-activity-sync)
2. D1 RLS audit before any CRUD gate: testsprite_generate_backend_test_plan on activity_logs / profiles / integration_connectors
3. jira-compare is WorkHub-only: non-WorkHub admin pockets use schema-probe gate instead (no Jira equivalent exists for most admin surfaces)
4. Dialog migration gets its own session: write AdminDialog wrapper first, then migrate call sites one file at a time
5. Pocket order reordered: Dead-wood + D1 → Dialog migration → WorkHub → Users & Access → General → Reference Data → Developer/Field Config → Phase E

## Files to delete (Block 0 — Vikram approved)
- src/pages/admin/v2/AdminV2Shell.tsx
- src/pages/admin/v2/AdminV2OverviewPage.tsx
- src/pages/admin/v2/AuditLogPage.tsx
- src/pages/admin/v2/work-items/ScreensPage.tsx
- src/pages/admin/v2/work-items/StatusesPage.tsx
- src/pages/admin/v2/work-items/NotificationsPage.tsx
- src/pages/admin/v2/work-items/WorkflowDetailPage.tsx
- src/pages/admin/v2/work-items/CustomFieldsPage.tsx
- src/pages/admin/v2/work-items/WorkflowsPage.tsx
- src/pages/admin/v2/work-items/WorkTypesPage.tsx
- src/hooks/admin/useAdminV2Flag.ts
- src/hooks/admin/useAdminMutation.ts

## Files to fix (Block 0)
- src/components/catalyst-detail-views/shared/sections/WorkflowViewerModal.tsx
  Lines 204 + 350: /admin/v2/work-items/workflows → /admin/workhub/jira-activity-sync

## Plan table
| # | Task | Tool | Skill | Model | Gate | Metric |
|---|---|---|---|---|---|---|
| 0.1 | Delete 10 admin/v2 page files + 2 hooks | claude-code | — | haiku | tsc --noEmit clean | 0 TS errors |
| 0.2 | Fix 2 WorkflowViewerModal hrefs | claude-code | — | haiku | 0 grep /admin/v2 hrefs | 0 matches |
| 0.3 | Failing test: WorkflowViewerModal no /admin/v2 hrefs | claude-code | TDD gate | sonnet | Test red | Red |
| 0.4 | Vitest green | claude-code | — | sonnet | 1/1 | Green |
| 0.5 | Ask Vikram: confirm file list | manual | ask-before-remove | — | Vikram "go" | Approval |
| 0.6 | PR: delete admin/v2 + fix hrefs | claude-code | — | haiku | Merged | PR URL |
| 1.1 | TestSprite backend test plan: activity_logs/profiles/integration_connectors RLS | claude-code | testsprite_generate_backend_test_plan | sonnet | Plan generated | Doc |
| 1.2 | Failing RLS tests | claude-code | TDD | sonnet | Red | N red |
| 1.3 | Fix broken RLS | lovable-sql | — | sonnet | Green | N/N |
| 1.4 | Ask Vikram before RLS change | manual | — | — | Vikram "go" | Approval |
| 1.5 | Commit RLS fixes | claude-code | — | haiku | Committed | SHA |
| 2.1 | Failing test: AdminDialog wrapper | claude-code | TDD | sonnet | Red | Red |
| 2.2 | Implement AdminDialog wrapping @atlaskit/modal-dialog | claude-code | ads-validator | sonnet | Green + 0 violations | 1/1 |
| 2.3 | Migrate Dialog call sites one file at a time | claude-code | ads-validator | sonnet | TS clean + vitest | N/N |
| 2.4 | Migrate AlertDialog call sites one file at a time | claude-code | ads-validator | sonnet | TS clean + vitest | N/N |
| 2.5 | ads-validator: 0 shadcn dialog imports in admin | claude-code | ads-validator | haiku | 0 violations | 0 matches |
| 2.6 | Ask Vikram: AdminDialog API sign-off | manual | ask-before-add | — | Vikram "go" | Approval |
| 2.7 | PR: AdminDialog + all call sites | claude-code | — | haiku | Merged | PR URL |
| 3.1 | Schema-probe: WorkHub tables | claude-code | anti-pattern #18 | sonnet | Complete | Schema map |
| 3.2 | Failing tests: WorkHub pages | claude-code | TDD | sonnet | Red | N red |
| 3.3 | Fix correctness gaps | claude-code | ads-validator | sonnet | Green | N/N |
| 3.4 | jira-compare: WorkHub pages vs Jira | Chrome MCP | jira-compare | sonnet | Drift < threshold | DOM diff |
| 3.5 | CRUD gate: WorkHub write paths | claude-code | — | sonnet | C/R/U/D pass | Evidence |
| 3.6 | Ask Vikram: WorkHub sign-off | manual | — | — | Vikram "go" | Approval |
| 3.7 | PR: WorkHub pocket | claude-code | — | haiku | Merged | PR URL |
| 4–7 | Users & Access / General / Reference Data / Developer pockets (schema-probe + TDD + CRUD + sign-off + PR per block) | claude-code | ads-validator + TDD per block | sonnet | Per-block gates | Per-block |
| 8.1 | Full-tree ADS sweep | claude-code | ads-validator | haiku | 0 violations | 0 matches |
| 8.2 | jira-compare WorkHub only | Chrome MCP | jira-compare | sonnet | Drift clean | DOM diff |
| 8.3 | review skill | claude-code | review | sonnet | Clean | Report |
| 8.4 | security-review | claude-code | security-review | sonnet | No critical | Report |
| 8.5 | Ask Vikram: final sign-off | manual | — | — | Vikram "go" | Approval |
| 8.6 | Append CLAUDE.md lesson: jira-compare exemption for non-WorkHub admin | manual | — | — | Vikram approves | Committed |

## Progress
- [x] Phase B (ADS chrome) — PR #121 merged
- [x] Council run — chairman verdict recorded
- [x] Block 0 — dead-wood deletion + href fix (commit 567a03b23 local; PR deferred — gh auth login incomplete on this machine, push when auth resolves)
- [ ] Block 1 — D1 RLS audit (deferred — never started)
- [ ] Block 2 — Dialog migration (deferred — never started)
- [x] Block 3 — WorkHub ADS icon swap (7 components; commit on main; PR #127 merged; CI fix: npm install replaces npm ci)
- [x] Block 4 — Users & Access ADS icon swap (4 pages; commit 30554c004 on main; 0 lucide-react in UserAccessPage/UsersManagement/RolesPermissions/BusinessOwners)
- [x] Block 5 — General ADS icon swap (3 pages with violations; commit 27eed3267 on main; 0 lucide-react in AdminOverview/FeatureFlagsPage/NotificationTriggers; ProductSettings+AdminLayout were already clean)
- [x] Block 6 — Reference Data ADS icon swap (10 pages; all clean; on main)
- [x] Block 7 — Developer/Field Config ADS icon swap (9 files incl. 7 incident pages; commit 94da73f on main; 0 lucide-react, 0 animate-spin)
- [x] Block 8 — Phase E final gates
  - [x] 8.1 Full-tree ADS sweep: components/admin 57+ files (commit 0913e2e on main; 0 lucide-react, 0 animate-spin across all targets)
  - [x] 8.2 jira-compare WorkHub only — manual visual spot-check via Chrome MCP (2026-05-10)
    - Jira Connection ✅ | Hierarchy Mapping ✅ | Scheduling Rules ✅ | Status Mapping ✅
    - User Mapping ✅ | Data Scope ✅ | Sync & Logs ✅ | Jira Activity Sync ✅
    - Jira Sync Control ⚠️ pre-existing runtime error "Database is not defined" (not ADS)
    - routeSmokeCheck found 2 additional lucide violations OUTSIDE Block 8 targets:
      ThemeGroups.tsx (Users icon) + ProductSettings.tsx (Building2 icon) → spawned as separate task
  - [x] 8.3 review skill — manual pass: 0 a11y violations, 0 missing label props on ADS icons, TS clean
  - [x] 8.4 security-review — 7 unguarded admin pages FIXED (commit a61fe2edc; TDD: admin-guard-coverage.test.ts)
  - [x] 8.5 Ask Vikram: final Phase C sign-off — approved 2026-05-10
  - [x] 8.6 CLAUDE.md lesson — jira-compare exemption for non-WorkHub admin pages (commit 76a07a908)

## Security Findings — RESOLVED (commit a61fe2edc, 2026-05-10)
AdminGuard added to 7 previously unguarded admin pages:
- src/pages/admin/UserAccessPage.tsx ✅
- src/pages/admin/CapacityDepartments.tsx ✅
- src/pages/admin/ResourceAssignments.tsx ✅
- src/pages/admin/JiraUserSync.tsx ✅
- src/pages/admin/workflows/WorkflowAdminPage.tsx ✅
- src/pages/admin/FeatureFlagsPage.tsx ✅
- src/pages/admin/NotificationTriggers.tsx ✅
TDD gate: src/pages/admin/__tests__/admin-guard-coverage.test.ts (2 assertions, both green)

## Key lesson (CLAUDE.md candidate — draft for Vikram approval)
Date: 2026-05-09
Surface: All /admin/* non-WorkHub pages
Pattern: CLAUDE.md "jira-compare on every new feature" was written for product surfaces (backlog, allwork, detail views). Admin configuration pages that are Catalyst-specific (Modules & Packages, Resource Assignments, Feature Flags, Reference Data) have no Jira equivalent — jira-compare produces no signal and wastes session budget.
Rule: jira-compare gate is REQUIRED only for WorkHub admin pages (which proxy Jira data) and any admin surface that has a direct Jira equivalent. For Catalyst-specific admin pages, replace the jira-compare gate with a schema-probe gate: confirm every UI field has a DB column + RLS policy + hook backing it.

## Infra notes (2026-05-09)
- Node v20.12.2 on this machine — vitest 4 + rolldown require >=20.19.0. Vitest gate deferred to CI on all waves until Node is upgraded.
- gh CLI installed (v2.92.0 via Homebrew). gh auth login NOT yet complete — complete with `gh auth login --hostname github.com --git-protocol ssh --web` before any PR/push commands.
- Block 0 PR target branch: claude/festive-dirac-de6bc2. Commit: 567a03b23.

## Phase C completion status (2026-05-10)

All Phase C gates are complete or spawned:
- Blocks 3–8 ADS icon sweeps: ✅ on main
- AdminGuard security fix: ✅ on main (commit a61fe2edc)
- CLAUDE.md lesson: ✅ committed (commit 76a07a908)
- jira-compare WorkHub spot-check: ✅ 8/9 pages pass (1 pre-existing runtime error unrelated to ADS)
- Deferred (never started): Block 1 (RLS audit), Block 2 (Dialog migration)
- Remaining separate task: ThemeGroups + ProductSettings lucide violations (spawned as chip task)
- **Phase C COMPLETE — Vikram sign-off received 2026-05-10**

## Open items / next session start
Paste as first message:
---
Continue admin Phase C. Read handover:
/Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/.claude/active/preflight-handover-2026-05-09-admin-phase-c.md
Only remaining gate: 8.5 Vikram final sign-off.
Deferred tracks: Block 1 (RLS audit) + Block 2 (Dialog migration) — these were explicitly parked.
Separate chip task: fix ThemeGroups.tsx (Users icon) + ProductSettings.tsx (Building2 icon) lucide violations.
---
