# Discovery 09 — CRE, Permissions & Routing Constraints for TestHub

Feature: CAT-TESTHUB-PROD-20260703-001 · Agent: rules-engine/permission/routing discovery · Date: 2026-07-03
Evidence rule: every claim cites file:line or command output. UNKNOWN stated where not verified.

---

## 1. CRE — Catalyst Rules Engine

### 1.1 Location & structure

| Artifact | Path | Evidence |
|---|---|---|
| Engine implementation | `src/lib/catalyst-rules/CatalystRules.ts` (725 lines) | `wc -l` output |
| Locked rule truth | `src/lib/catalyst-rules/RULE_TABLE.md` (388 lines) — "If code and RULE_TABLE.md diverge, RULE_TABLE.md wins" | CatalystRules.ts:4-5 |
| Barrel | `src/lib/catalyst-rules/index.ts` | ls output |
| Enforcement gate | `scripts/cre-chokepoint-gate.cjs`, run via `npm run lint:cre` | package.json:20 |
| Gate wiring | `.husky/pre-commit` (blocking) | cre-chokepoint-gate.cjs:11 |
| Management skill | `.claude/skills/cre/SKILL.md` (referenced by gate error text) | cre-chokepoint-gate.cjs:3, :79 |

### 1.2 Module ownership (Grid A) — TESTHUB owns 3 types

`CatalystRules.ts:67-74` — `MODULE_OWNED_TYPES.TESTHUB = ['QA Bug', 'Test Case', 'Test Cycle']`.
RULE_TABLE.md:21,28,29 — A4 (QA Bug → TESTHUB, migrated from TEAM 2026-07-01), A11 (Test Case), A12 (Test Cycle).
`CREModule` union includes `'TESTHUB'` (CatalystRules.ts:34-40).

### 1.3 Creation rights (Grid D)

RULE_TABLE.md:102 — **D4: TESTHUB may create QA Bug, Test Case, Test Cycle + subtask family.**
`EXTRA_CREATE_RIGHTS` map (CatalystRules.ts:170-172) currently holds ONLY `TEAM: ['Epic']` (D7). **There is no TESTHUB entry.** Any plan needing TestHub surfaces to create a non-owned type (e.g. Story from traceability) must extend `EXTRA_CREATE_RIGHTS` — per project memory: "extend that map for future exceptions, never bypass filter".
Chokepoint API: `filterCreatableTypes(types, moduleCode)` (CatalystRules.ts:218-223) — "Every type picker on a create surface MUST run its catalogue through this before render".

### 1.4 Link restrictions (Grid C) relevant to TestHub

- C1 BAN: Business Request ↔ QA Bug (CatalystRules.ts:98-101; RULE_TABLE.md:74)
- C3 BAN: Production Incident ↔ QA Bug (RULE_TABLE.md:75)
- C10 BAN: same type ↔ same type, universal (CatalystRules.ts:324-325)
- C9 ALLOW: QA Bug ↔ Test Case (defect↔test-case traceability, RULE_TABLE.md:88)
- C4/C5 ALLOW: Story↔QA Bug, Epic↔QA Bug (RULE_TABLE.md:83-84)
- API: `canLinkTo(source, target)` / `validateLink()` (CatalystRules.ts:320-333, 388-407)

### 1.5 Hierarchy (Grid B) relevant to TestHub

- B2: QA Bug is a valid child of Epic (RULE_TABLE.md:45)
- B6: QA Bug's only children are subtask family (RULE_TABLE.md:49)
- Test Case / Test Cycle appear in NO Grid B row — they have no `parent_key` hierarchy in CRE. Test-entity structure lives in tm_* join tables, not ph_issues hierarchy.
- API: `canBeChildOf()` (CatalystRules.ts:243-250), registry-aware `getAllowedChildTypesWithRegistry()` (283-310) for Studio custom types.

### 1.6 Backlog/All-Work eligibility (Grid I)

`BACKLOG_VIEW_EXCLUDED_TYPES = ['QA Bug', 'Production Incident']` (CatalystRules.ts:714) — QA Bugs must never render as standalone Backlog/All-Work rows (RULE_TABLE.md:361-362); they remain reachable via TestHub.

### 1.7 Type alias normalisation

`TYPE_ALIAS_MAP` (CatalystRules.ts:110-149) folds `defect`/`bug`/`qabug` → `QA Bug`, `test case`/`test_case` → `Test Case`, `test cycle`/`test_cycle` → `Test Cycle`. Any new TestHub type strings must round-trip through `normalizeType()`.

### 1.8 lint:cre gate — current chokepoint registry (7 checks)

`scripts/cre-chokepoint-gate.cjs:16-53` CHECKS: CreateStoryModal.tsx, kanban/InlineCreateCard.tsx, features/kanban-board/InlineCreate.tsx (optional/dead), BacklogPage.atlaskit.tsx, WorkListPanel/IssueTypeSelector.tsx, SubtasksPanel/hierarchy.ts, linked-work-items/LinkToolbar.tsx.
**No TestHub-specific file is registered.** Any NEW TestHub create/link/parent surface must (a) call the CRE API and (b) be appended to CHECKS so the wiring can't regress.

---

## 2. Module gating — ModuleGate vs ModuleGuard for TestHub

### 2.1 The two components

| Component | Path | Layer | Backing store |
|---|---|---|---|
| `ModuleGate` | `src/components/common/ModuleGate.tsx:15` | Org availability (feature flag) | `useModuleEnabled` / FeatureFlagContext |
| `ModuleGuard` | `src/components/guards/ModuleGuard.tsx:55` | Role-based access (full/view/hidden) | `useModuleAccess` → `admin_role_module_permissions` + `profiles.module_access` override |
| `MG` combo | `src/routes/FullAppRoutes.tsx:376-380` | Outer Gate + inner Guard | `MG_ROLE_KEY` map (365-370) |

### 2.2 Key vocabulary for TestHub

- Feature-flag key: `testhub` → flag `test_hub` (FeatureFlagContext.tsx:26); `test_hub` → `test_hub` (:41).
- Role-permission canonical key: `testhub` — in `CORE_NAV_MODULES` (useModuleAccess.ts:170), so it **bypasses org_modules** and is governed purely by `admin_role_module_permissions`.
- Admin-UI per-user override key: `test_hub` → canonical `testhub` via `OVERRIDE_KEY_TO_CANONICAL` (useModuleAccess.ts:33).
- Hub nav: HubSwitcher.tsx:76 gates the Test hub entry on `moduleKey: 'testhub'` (also MobileNavigationMenu.tsx per grep).

### 2.3 VIOLATION — TestHub routes have NO route-level gate

All TestHub routes in `src/routes/FullAppRoutes.tsx:666-699` are wrapped only in `<S>` (ErrorBoundary + Suspense, FullAppRoutes.tsx:357-361). **No `MG`, no `ModuleGate`, no `ModuleGuard`.** Compare: incident-hub uses `<MG k="incidenthub" t="IncidentHub">` (FullAppRoutes.tsx:708), tasks uses `<ModuleGuard moduleCode="planner">` (:647), release-hub overview uses `<ModuleGuard moduleCode="releases">` (:753).
Additionally `MG_ROLE_KEY` (FullAppRoutes.tsx:365-370) has **no `testhub` entry** — even wrapping TestHub in `MG` today would gate only the feature flag, not the role matrix.
Consequence: a user whose role sets testhub = hidden loses the nav item (HubSwitcher) but can still open any `/testhub/*` URL directly. Read-only ("view") enforcement via `useModuleReadOnly()` (ModuleGuard.tsx:35-42) is also unavailable because the context provider is never mounted.

### 2.4 Guard visual debt (secondary)

ModuleGuard.tsx:97-98 uses Tailwind color utilities (`bg-amber-100 dark:bg-amber-900/30`, `text-amber-600 dark:text-amber-400`) — pre-existing color-law debt in the file the plan will likely touch; the ratchet gates (`lint:colors:gate`, `audit:ads:gate`) forbid increases.

---

## 3. Permission RPC — check_permission

- Single consumer hook: `src/hooks/usePermission.ts:26` — `supabase.rpc('check_permission', { _user_id, _entity_type, _action, _scope_type, _scope_id })`. Actions: view/create/edit/delete/link/move/configure; scopes: global/portfolio/program/team (usePermission.ts:6-7). Admin short-circuits to true (:24).
- RPC exists in generated types (src/integrations/supabase/types.ts:58516).
- UI consumers: `ListScreenToolbar.tsx`, `AttachmentsSection.tsx`, `InJiraLayout.tsx` (grep). **No TestHub page calls usePermission** (no hits under src/pages/testhub or src/components/testhub).
- Memory note (rbac-split-brain): check_permission reads super_admin product role; granular entity→permission_group matrix (Phase 3) is BLOCKED. Plan must not assume per-entity granular permissions exist for test entities — UNKNOWN whether `_entity_type` values for 'test_case'/'test_cycle' are seeded; verify on staging cyij before relying on it.

---

## 4. Slug contract (Grid F + CLAUDE.md SLUG CONTRACT)

### 4.1 Contract

- F1: route params must end Slug/Key (or be display-key params); `id`, `*Id`, `*_id`, `uuid` banned — enforced by `isValidRouteParam()` (CatalystRules.ts:452-463).
- F2 checklist (CatalystRules.ts:514-519): slug column + `catalyst_slugify()` trigger + typed builder in `src/lib/routes.ts` + dual-mode `useXBySlug()` hook.
- F3: no raw string-concat URL building — `containsUuidNavigation()` helper (CatalystRules.ts:505-508); CLAUDE.md: import from `Routes` only.

### 4.2 Declared builders (src/lib/routes.ts:114-133) — all compliant on their face

`testHubRoutes`: root, dashboard, myWork, board, repository, cycles, `cycle(cycleSlug)`, `cycleExecute(cycleSlug)`, sets, `set(setSlug)`, reports, `report(slug)` (REPORT_REGISTRY id), filters, filterCreate, `filter(filterSlug)`, timeline, defects, traceability. Registered as `Routes.testHub` (routes.ts:244).

### 4.3 Mounted routes (src/routes/FullAppRoutes.tsx:666-699) — violations found

| Route | Line | Param | Verdict |
|---|---|---|---|
| `/testhub/:projectKey/cycles/:cycleKey` (+ `/execute`) | 672-673 | projectKey, cycleKey | PASS (Key suffix) |
| `/testhub/cycles/:cycleKey` (+ `/execute`) legacy | 675-676 | cycleKey | PASS |
| **`/testhub/sets/:id`** | **680** | **`:id`** | **FAIL — F1 hard-ban (`BANNED_PARAM_NAMES` includes `id`, CatalystRules.ts:427)** |
| **`/testhub/filters/:filterId`** | **699** | **`:filterId`** | **FAIL — F1 (`Id` suffix banned, CatalystRules.ts:415-421)** |
| `/testhub/reports/:reportSlug` | 694 | reportSlug | PASS |
| `/testhub/dependencies` | 678 | — | Route mounted but NOT in `testHubRoutes` builders — builder gap |

`SetDetailPage.tsx:367` confirms `:id` is a raw UUID: `const { id: setId } = useParams()` → `.from('tm_test_sets').eq('id', setId!)` (:383-385). Note `:filterId` is a repo-wide pattern (also `/tasks/filters/:filterId` FullAppRoutes.tsx:646 and release-hub) — fixing it is cross-hub scope.

### 4.4 Builder ↔ route mismatches (naming lies)

- `testHubRoutes.set(setSlug)` (routes.ts:124) produces `/testhub/sets/<x>` but the page resolves `<x>` strictly as UUID `id` (SetDetailPage.tsx:385). The param name `setSlug` is false — no slug exists.
- `testHubRoutes.cycle(cycleSlug)` (routes.ts:121) — mounted param is `:cycleKey`, resolved by dual-mode hook (see 4.6). Param should be named `cycleKey`.

### 4.5 F3 violations — raw string-concat TestHub URLs (no Routes.testHub usage)

grep found **zero** call sites using `Routes.testHub.*` / `testHubRoutes.*` outside routes.ts; instead 18+ hand-built template literals, many with UUID fallbacks and a hardcoded `BAU` project key:

- `src/components/releases/test-cycles/CycleCard.tsx:53,60,63` — `` navigate(`/testhub/BAU/cycles/${cycle.cycleKey ?? cycle.id}`) `` (UUID fallback + hardcoded BAU)
- `CycleCardEnhanced.tsx:104,111,114` — line 114 is pure UUID: `` `${cycle.id}/execute` ``
- `CycleTableView.tsx:115,225`, `CycleCalendarView.tsx:141` — same pattern
- `TestCaseExecutionHistory.tsx:148` — `` `/testhub/BAU/cycles/${exec.cycleId}/execute` ``
- `src/pages/releases/CommandCenter.tsx:200` — `` `/testhub/cycles/${cycleId}` `` (UUID)
- `src/pages/releases/TestCyclesPage.tsx:538` — `` `${cycle._originalId || cycle.id}` `` (UUID)
- `src/pages/testhub/cycles/ExecutionPage.tsx:183`, `CycleDetailPage.tsx:212`, `CyclesPage.tsx:182` — hub's own pages concat too; CycleDetailPage:212 and SetDetailPage:700 navigate with `cycle.id` (UUID)
- **`src/pages/testhub/sets/TestSetsPage.tsx:435`** — `` navigate(`/testhub/${projectKey}/sets/${set.id}`) `` → **BROKEN: no `/testhub/:projectKey/sets/:id` route exists (only `/testhub/sets/:id`, FullAppRoutes.tsx:680) → 404 today.** Same for `SetDetailPage.tsx:522` back-nav to `` `/testhub/${projectKey}/sets` `` (no such route).

### 4.6 useXBySlug hooks for test entities

- Exists: `src/hooks/useTestCycleByKey.ts:6` — dual-mode (`isValidUUID` → `id`, else `cycle_key`) against `tm_test_cycles`. Complies with the F2 dual-mode hook shape, but note it destructures `{ data }` only (line 21) — swallows query errors (known silent-error landmine pattern).
- **Missing:** no `useTestSetByKey`/`BySlug`, no `useTestCaseByKey`/`BySlug` (only useBoardBySlug, useReleaseBySlug, useTeamBySlug, useSprintBySlug exist in src/hooks — ls/grep output). SetDetailPage does inline UUID-only lookup.
- Table columns (src/integrations/supabase/types.ts): `tm_test_cycles.cycle_key` present, **no `slug` column** (awk grep: 0 slug matches); `tm_test_sets.set_key` present, no slug; `tm_test_cases.case_key` present, no slug. Display keys exist for all three → key-based routing is achievable without new columns; a `slug` column would need migration if human-readable-name URLs are wanted.

### 4.7 UuidToSlugRedirect

**Does not exist as a component.** Only `src/routes/BoardUuidRedirect.tsx` implements the pattern (board-specific). No TestHub UUID→key redirect exists; legacy UUID cycle URLs are instead absorbed by the dual-mode `useTestCycleByKey`. If the plan renames set/filter params, CLAUDE.md requires UUID-legacy handling (redirect mounted outside CatalystShell) or dual-mode hooks.

---

## 5. CRE wiring status of TestHub surfaces

- `/testhub/defects` mounts canonical `BacklogPage` via `useDefectsSource` adapter (src/pages/testhub/DefectsPage.tsx:10-11,38-44). BacklogPage IS a lint:cre chokepoint — but its `CREATABLE_TYPES` is a **module-level const hardcoded to `'TEAM'`** (BacklogPage.atlaskit.tsx:6985-6997). On the TestHub mount this means inline create offers TEAM types and `filterCreatableTypes` **strips QA Bug** (TESTHUB-owned) — the exact type this surface exists for. UNKNOWN whether inline create is reachable on this mount (adapter may disable it) — verify before planning; if reachable, it is a live Grid D violation.
- Canonical defect creation is `CreateStoryModal` with `defaultWorkType` QA Bug → `tm_defects` isDefect branch (project memory `defect-creation-canonical-qabug`); CreateStoryModal is CRE-gated (cre-chokepoint-gate.cjs:18-21).
- Only other CRE import under testhub trees: `ReportCanvas.tsx:23` imports `CANONICAL_ROW_TYPOGRAPHY` (Grid H).
- Grid E4 (RULE_TABLE.md:158): global hub pages must use `ProjectPageHeader hubType` **without** projectKey — `DefectsPage.tsx:27` passes `projectKey="TESTHUB"` with `hubType="test"` → E4 deviation to confirm/fix.

---

## 6. CONSTRAINT LIST the plan must obey

1. **Grid A/D:** TestHub create surfaces may offer only QA Bug, Test Case, Test Cycle + subtask family; every type catalogue must pass `filterCreatableTypes(types, 'TESTHUB')`. Cross-module needs go through `EXTRA_CREATE_RIGHTS` (CatalystRules.ts:170), never around the filter.
2. **lint:cre:** every new create/link/parent surface must import `@/lib/catalyst-rules` and be registered in `scripts/cre-chokepoint-gate.cjs` CHECKS.
3. **Grid C:** any linking UI (traceability, defect↔test-case) must filter candidates via `canLinkTo()`; QA Bug↔BR and QA Bug↔Incident are banned; same-type links banned.
4. **Grid B:** Test Case/Test Cycle have no ph_issues hierarchy — do not invent parent_key semantics for them; QA Bug children = subtask family only.
5. **Grid I:** QA Bug must not leak into Backlog/All-Work standalone rows (`isEligibleForBacklogView`).
6. **Grid F/slug contract:** new routes use `:xSlug`/`:xKey` only; register builders in `src/lib/routes.ts`; navigate via `Routes.testHub.*`; ship dual-mode `useXByKey` hooks; UUID-legacy URLs need redirect handling.
7. **Module gating:** role vocabulary key is `testhub` (admin_role_module_permissions), flag key `test_hub`; if the plan adds route gating it must add `testhub` to `MG_ROLE_KEY` and wrap routes in `MG`, matching incident-hub's pattern, and honour `useModuleReadOnly()` for view-level access.
8. **check_permission:** granular per-entity permissions for test entities are unproven (RBAC Phase 3 blocked) — verify `_entity_type` seeding on cyij before designing permission-dependent UI.
9. **Grid E4:** hub-level pages use `ProjectPageHeader hubType="test"` without projectKey.
10. **Grid H:** any new row/table surface uses `CANONICAL_ROW_TYPOGRAPHY`; no hardcoded line-heights (`containsHardcodedLineHeight`).

## 7. CURRENT VIOLATIONS found (fix candidates for the plan)

| # | Violation | Evidence | Severity |
|---|---|---|---|
| V1 | `/testhub/sets/:id` — banned `:id` UUID param (F1) | FullAppRoutes.tsx:680; SetDetailPage.tsx:367,385 | High |
| V2 | `/testhub/filters/:filterId` — banned `Id` suffix (F1); repo-wide pattern shared with tasks/release | FullAppRoutes.tsx:699 | Medium (cross-hub) |
| V3 | TestSetsPage navigates to non-existent `/testhub/:projectKey/sets/:id` → 404 | TestSetsPage.tsx:435 vs FullAppRoutes.tsx:680; also SetDetailPage.tsx:522 | High (live bug) |
| V4 | Zero `Routes.testHub.*` call sites; 18+ raw template-literal URLs, many UUID fallbacks + hardcoded `BAU` (F3) | §4.5 list | High |
| V5 | No route-level ModuleGate/ModuleGuard on any `/testhub/*` route; `testhub` missing from MG_ROLE_KEY — role matrix bypassable by direct URL | FullAppRoutes.tsx:666-699, 365-370 | High |
| V6 | BacklogPage CREATABLE_TYPES hardcoded to `'TEAM'` while mounted at /testhub/defects — QA Bug stripped on its own surface (Grid D) | BacklogPage.atlaskit.tsx:6985-6997; DefectsPage.tsx:38 | Medium (verify reachability) |
| V7 | `set(setSlug)`/`cycle(cycleSlug)` builder param names lie (actual: UUID id / cycle_key) | routes.ts:121,124 | Low |
| V8 | Missing dual-mode hooks: useTestSetByKey, useTestCaseByKey; useTestCycleByKey swallows errors ({data}-only destructure) | src/hooks ls; useTestCycleByKey.ts:21 | Medium |
| V9 | `/testhub/dependencies` route has no builder in testHubRoutes | FullAppRoutes.tsx:678 vs routes.ts:114-133 | Low |
| V10 | DefectsPage passes projectKey="TESTHUB" to ProjectPageHeader on a global hub page (E4) | DefectsPage.tsx:27 vs RULE_TABLE.md:158 | Low |
| V11 | ModuleGuard.tsx contains Tailwind amber color utilities (color-law debt in a file the plan may touch) | ModuleGuard.tsx:97-98 | Low (ratchet-gated) |

UNKNOWNs: whether inline create is enabled on the /testhub/defects BacklogPage mount (V6); whether check_permission `_entity_type` rows exist for test entities on cyij; whether `catalyst_slugify()` trigger infra applies to tm_* tables (no slug columns today).
