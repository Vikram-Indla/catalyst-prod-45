# CLAUDE ROLE MANAGEMENT HANDOFF

**Status:** Design Approved, Documentation Corrected, Implementation Pending Approval  
**Last Updated:** 2026-06-24 (corrected)  
**Location:** `/Users/jahanarakhan/catalyst/docs/role-management/`  
**Critical Files:** 14 total (01–12 + root handoff + context handoff)

---

## ⚠️ START HERE

**Before implementing ANY code for Catalyst Enterprise Role Management:**

1. **Read this file** (you are here)
2. **Read `docs/role-management/00_READ_ME_FIRST.md`** (mandatory entry point)
3. **Read all numbered files 01–12** in sequential order (`docs/role-management/`)
4. **Do not write code until all docs are read and file 12 is understood**

---

## Design Status

✅ **Complete and Approved**

- Product decisions finalized
- Architecture & ERD documented
- Database schema specified
- Permission model defined
- Module/field/action inventory complete
- UI design approved (flat sidebar, sticky save bar, grouped fields)
- UI guardrails documented
- Two-cycle implementation plan ready
- 25 sanity tests defined
- Risk register with 25 failure modes

---

## ✅ PHASE 1.1 ISOLATED RUNTIME VALIDATION PASSED — DISPOSABLE POSTGRES (2026-06-25 02:15 AM)

**Validation Method:** Isolated disposable PostgreSQL container (bypassed repo-wide migration conflicts)

**Evidence:**
- ✅ Schema migration executed successfully (14 tables created)
- ✅ Seed migration executed successfully (4,443 rows inserted)
- ✅ RBAC tables created: 14/14
- ✅ RLS enabled: 14/14 tables
- ✅ RLS policies: 0 (correct — Phase 1.2)
- ✅ Seed row counts: 4,443 total (all sub-totals match specification)
- ✅ Route prefixes: 0 mismatches (all 10 routes correct)
- ✅ Entity field distribution: correct across 10 entities
- ✅ Action matrix: 53 actions across 7 modules (correct counts)
- ✅ Banned field locks: 0 violations + 34 permissions (correct)
- ✅ Incident mutations locked: 0 unlocked (correct)
- ✅ One-active-role index: present with WHERE clause (correct)
- ✅ Staging not accessed (no db push/pull/reset)
- ✅ Production not accessed (no db push/reset)
- ✅ Phase 1.2 not started (no UI/hooks/routes/components)
- ✅ Disposable container removed

**What was NOT changed:**
- Bootstrap migration NOT edited
- No migration files renamed or moved
- No repo-wide migration cleanup attempted
- No staging accessed
- No production accessed
- No Phase 1.2 work started

---

## Non-Negotiable Rules

| Rule | Why | Violation = Stop |
|---|---|---|
| One active role per user | Partial unique index on user_roles(user_id) WHERE is_active = true | Multi-role users exist |
| No hardcoded roles | All roles from roles table | ROLE_GROUPS found in code |
| Flat Admin sidebar | Design decision 06 | Nested detail pages in nav |
| Sticky save bar only | Design spec, no header/footer buttons | Save buttons anywhere else |
| Incident Hub read-only | Policy + RLS | Any mutation succeeds |
| Dynamic role dropdown | Create Access modal spec | Hardcoded role list |
| Module matrix with tiles | Design spec + summary counts | Flat matrix without summary |
| Grouped field grid | Design spec + auto-expand search | Flat 120+ field list |
| 25 sanity tests | Mandatory, all pass | Test marked done without evidence |

---

## Two Cycles

### Cycle 1 (2 weeks) — Foundation + Core UI
- Normalized database schema
- 16 default roles seeded
- Access Management page (4 tabs)
- Role Management landing + detail workspace
- Permission utilities
- Sticky save bar

**Deliverables:** Complete with all 14 files visible (no placeholders).  
**Tests 1–15 must pass.**

### Cycle 2 (2 weeks) — Enforcement + Hardening
- Action/transition enforcement
- Field-level enforcement
- Incident Hub hard read-only
- Permission Preview with "as user" mode
- All RLS policies verified
- Route/component/API guards wired

**Deliverables:** Full enforcement across all 4 layers.  
**Tests 16–25 must pass.**

---

## Absolute Bans

- ❌ "Coming soon" or "Under construction" pages
- ❌ Empty tabs or disabled shells
- ❌ Placeholder UI marked complete
- ❌ Hardcoded ROLE_GROUPS
- ❌ Hardcoded colors (must use ADS tokens)
- ❌ Incident Hub mutations
- ❌ Banned fields visible to non-admin
- ❌ TODOs left in code
- ❌ Tests claimed passed without evidence

---

## Implementation Status

**✅ PHASE 1.1 COMPLETE (2026-06-26)**

Implemented:
- Created `supabase/migrations/20260626000000_create_normalized_rbac_schema.sql`
  - 14 normalized RBAC tables with RLS enabled (no policies in Phase 1.1)
  - Partial unique index: `one_active_role_per_user` on `rbac_user_roles`
  - All constraints, indexes, and triggers in place
  
- Created `supabase/migrations/20260626010000_seed_core_rbac_data.sql`
  - Exact seed counts: 4,443 rows across all tables
  - 17 roles (Admin, User, + 15 approved)
  - 10 modules (7 active + 3 dormant)
  - 10 entities
  - 162 fields with classifications
  - 53 actions (per-module)
  - 6 workflows, 20 transitions
  - 170 role_module_perms, 2,754 role_field_perms, 901 role_action_perms, 340 role_transition_perms
  - Incident Hub mutations locked (all is_allowed=false)

**Next Steps:**
1. Run validation queries (see 10_CONTEXT_HANDOFF.md)
2. Approve Phase 1.2+ implementation (Access Management UI, Role Management UI, etc.)
3. Update handoff files after each phase

---

## Key Files (Read in This Order)

```
01. Product Decisions     (what's non-negotiable)
02. Architecture & ERD    (the system model)
03. Database Schema       (all 14 tables)
04. Permission Model      (all rules + dependencies)
05. Module/Field/Action   (complete inventory)
06. Design Specification  (approved wireframes)
07. UI Guardrails         (must/must-not rules)
08. Implementation Plan   (exact phases + deliverables)
09. Sanity Tests          (25 tests, all must pass)
10. Context Handoff       (status tracker)
11. Risk Register         (25 failure modes + stops)
12. Delivery Contract     (implementation gates + acceptance criteria)
```

---

## Handoff Update Loop

**At the end of EVERY phase:**
1. Update `docs/role-management/10_CONTEXT_HANDOFF.md`
2. Record what was completed
3. Record what failed (if anything)
4. Record what the next phase expects
5. Next Claude reads the updated handoff first

---

## Stop Immediately If

1. You find hardcoded ROLE_GROUPS in code
2. You create a "Coming soon" page
3. You allow Incident Hub mutations
4. You see empty tabs in role detail
5. You store permissions as JSON blobs
6. A test is marked passed without evidence
7. You modify files outside role-management scope
8. You find hardcoded colors instead of ADS tokens
9. Banned fields are visible to non-admin users
10. A user has more than one active role

**If any of these happen, STOP and ask before proceeding.**

---

## Before You Start Coding

**Mandatory checklist:**

- [ ] I have read `00_READ_ME_FIRST.md` completely
- [ ] I have read files `01_PRODUCT_DECISIONS.md` through `12_DELIVERY_CONTRACT.md`
- [ ] I understand the permission chain (Role → Module → Entity → Field → Action → Workflow)
- [ ] I understand the four enforcement layers (Route, UI, API, RLS)
- [ ] I know the 16 default roles
- [ ] I know which 2 fields are banned (assessment_feature, service_now_ref)
- [ ] I understand why Incident Hub is read-only
- [ ] I understand the sticky save bar design (no header/footer save buttons)
- [ ] I have the implementation plan (phases 1.1–1.4 for Cycle 1)
- [ ] I know all 25 sanity tests I must pass
- [ ] I understand all implementation gates in file 12
- [ ] I understand all stop conditions in file 12

**If ANY of these is false, go back and re-read the relevant file.**

---

## Questions to Answer (Without Re-Reading)

If you cannot answer all of these from memory, **STOP and re-read the docs**:

1. What are the 16 default roles?
2. What is the permission chain?
3. What are the four enforcement layers?
4. What are the 10 active modules?
5. Which 2 fields are banned?
6. Why is Incident Hub read-only?
7. What does the sticky save bar do?
8. Why must role dropdown be dynamic (not hardcoded)?
9. How many fields are in the field grid?
10. What is the two-cycle implementation timeline?

**If you cannot answer all 10, go back to the relevant docs now.**

---

## Key Decisions (Not to Be Re-Interpreted)

- ✅ **One active role per user** — enforced by DB constraint
- ✅ **Normalized schema** — 14 tables, not JSON blobs
- ✅ **Four enforcement layers** — all required
- ✅ **Flat Admin sidebar** — no nested pages
- ✅ **Sticky save bar** — no header/footer duplication
- ✅ **Dynamic role dropdown** — loads from roles table
- ✅ **Incident Hub read-only** — all mutations blocked
- ✅ **Grouped field grid** — searchable, auto-expands on match
- ✅ **25 mandatory sanity tests** — all must pass before cycle done
- ✅ **Two-cycle plan** — foundation first, enforcement second

**These are NON-NEGOTIABLE. Do not re-interpret, redesign, or suggest alternatives.**

---

## Documentation Pack Corrections (2026-06-24)

✅ **All corrections applied. Documentation is now governance-ready.**

- ✅ Created missing `12_DELIVERY_CONTRACT.md` (implementation gates, stop conditions, evidence requirements)
- ✅ Fixed PostgreSQL schema syntax: Changed invalid `CONSTRAINT ... UNIQUE ... WHERE` to proper partial unique index
- ✅ Removed invalid CHECK constraint with subquery; documented service-layer + trigger alternatives
- ✅ Fixed permission model contradiction: `can_export` now requires `can_read = true`
- ✅ Updated `00_READ_ME_FIRST.md` to include file 12 in reading order
- ✅ Added explicit warning: "Do not implement until file 12 is read"
- ✅ Updated `10_CONTEXT_HANDOFF.md` with correction summary
- ✅ No implementation code changed (documentation only)

---

## Next Claude: Your First Command

```bash
echo "READ THIS FIRST:"
cat docs/role-management/00_READ_ME_FIRST.md

# Then read all numbered files 01-12 (includes the new delivery contract)
# DO NOT CODE until all 12 files + this handoff are read
```

**Critical:** File 12 (`12_DELIVERY_CONTRACT.md`) contains implementation gates and stop conditions. You cannot claim a phase complete without understanding and meeting every requirement in that file.

**Do not run any other command until you have read all docs.**

---

**Last Updated:** 2026-06-25  
**Status:** Documentation Approved. Cycle 1 Phase 1 Approved (Schema + Seeding Only).

All documentation is in: `/Users/jahanarakhan/catalyst/docs/role-management/`

---

## CURRENT APPROVAL STATUS

Documentation gate: APPROVED
Implementation approval: APPROVED FOR CYCLE 1 PHASE 1 ONLY

Approved now:
- database schema migration
- seed data migration

Not approved:
- UI
- Access Management page
- Role Management page
- hooks
- routes
- Admin shell changes
- permission utility implementation
- export enforcement
- Incident Hub hardening
- Cycle 1 Phase 1.2 or later

Next action:
New Claude conversation must read the full documentation pack and produce a pre-flight report before writing migrations.

---

## SCHEMA COMPATIBILITY DECISION — 2026-06-25

**CRITICAL DECISION:** Existing schema discovered during pre-flight inspection.

Catalyst has live tables:
- `public.user_roles` (simple: user_id, role:text)
- `public.admin_role_module_permissions` (flat: role_code:text, module_key:text, access_level:enum)
- `public.admin_nav_modules` (navigation registry)

These are incompatible with the normalized RBAC schema in file 03.

**PRODUCT OWNER DECISION: Use Option A (Additive Schema)**

**Migration approach:**
- Create NEW normalized RBAC tables alongside existing (non-destructive)
- Use `rbac_*` prefix to avoid conflicts
- Do NOT replace, rename, or drop existing tables
- Do NOT migrate live user data in Phase 1.1
- Keep existing `admin_nav_modules` unchanged (navigation, not permissions)

**Normalized RBAC tables to create (with prefix):**
- `rbac_roles`
- `rbac_user_roles`
- `rbac_guest_access`
- `rbac_modules`
- `rbac_entities`
- `rbac_fields`
- `rbac_actions`
- `rbac_workflows`
- `rbac_workflow_transitions`
- `rbac_role_module_permissions`
- `rbac_role_field_permissions`
- `rbac_role_action_permissions`
- `rbac_role_transition_permissions`
- `rbac_permission_audit_log`

**Final approved role seed list (17 roles, NOT 16):**
1. Admin — `admin` (system)
2. User — `user` (system, fallback default)
3. Product Owner — `product_owner`
4. Product Manager — `product_manager`
5. Business Owner — `business_owner`
6. Project Manager — `project_manager`
7. Project Coordinator — `project_coordinator`
8. Release Manager — `release_manager`
9. Architect — `architect`
10. Developer — `developer`
11. QA Tester — `qa_tester`
12. Operations Engineer — `operations_engineer`
13. Technical Support — `technical_support`
14. Support — `support`
15. Governance — `governance`
16. PMO — `pmo`
17. Guest — `guest` (time-limited)

**BANNED (do not seed):** program_manager, super_admin, enterprise_architect, capacity_planner, finance, analyst, service_owner

**Final approved module seed list (10 modules total):**

Active (7):
1. Project Hub — `project_hub`
2. Product Hub — `product_hub`
3. Release Hub — `release_hub`
4. Test Hub — `test_hub`
5. Task Hub — `task_hub`
6. Incident Hub — `incident_hub`
7. Home Hub — `home_hub`

Dormant (3):
8. Strategy Hub — `strategy_hub`
9. Plan Hub — `plan_hub`
10. Wiki Hub — `wiki_hub`

**Access-level mapping (documentation only, NOT executed in Phase 1.1):**
- `none` → all 7 module permissions = false
- `view` → can_read=true, all others false
- `full` → can_read/create/update/export/bulk_update=true, delete/bulk_delete=false (by default)

**CONTEXT HEALTH: CRITICAL**
- Budget consumed: ~170K / 200K tokens (85%)
- Remaining: ~30K tokens (15%)
- **NEW CONVERSATION REQUIRED** before Phase 1.1 implementation starts

---

## CONVERSATION CHECKPOINT (2026-06-25 DECISION LOCKED)

**For NEXT Claude conversation:**

1. Read `CLAUDE_ROLE_MANAGEMENT_HANDOFF.md` FIRST (this file, including this section)
2. Read `docs/role-management/10_CONTEXT_HANDOFF.md` (updated 2026-06-25)
3. Read `docs/role-management/00_READ_ME_FIRST.md` through `12_DELIVERY_CONTRACT.md`
4. Produce revised pre-flight report that:
   - Confirms understanding of additive schema strategy
   - Uses `rbac_*` table names (NOT conflicting `roles`, `user_roles`)
   - Lists final 17 roles to seed (User + 16 approved roles, NO banned roles)
   - Lists final 10 modules to seed (7 active + 3 dormant)
   - Confirms no live-user migration in Phase 1.1
   - Confirms no replacement/dropping of existing tables
   - Confirms `admin_nav_modules` stays unchanged
5. After revised pre-flight is approved, proceed with Cycle 1 Phase 1 implementation ONLY

**What is NOT approved:**
- Do not create Access Management page
- Do not create Role Management page
- Do not create any UI components
- Do not create any hooks or routes for admin pages
- Do not modify AdminGuard or AdminLayout
- Do not implement permission utilities
- Do not implement export enforcement
- Do not implement Incident Hub hardening
- Do not proceed to Cycle 1 Phase 1.2 or later

**What is approved (with RBAC prefix):**
- Create 14 new normalized RBAC tables with `rbac_*` prefix
- Create seed migration for 17 approved default roles
- Create seed migration for 10 modules, 15+ entities, 120+ fields, 40+ actions, 8 workflows
- Create RLS policies on all `rbac_*` tables
- Create audit logging trigger infrastructure for `rbac_*` tables

**NO implementation code written. NO migrations created. Schema decision locked. New context required.**

---

## PHASE 1.1 VALIDATION BLOCKED — STAGING MIGRATION DRIFT (2026-06-26)

**Status:** Phase 1.1 RBAC migrations are statically approved. Runtime validation is blocked.

### What Happened

- Phase 1.1 schema + corrected seed migrations are ready (static review passed)
- Staging project (cyijbdeuehohvhnsywig) discovered to have 200+ pending local migrations from April-June 2026 that predate Phase 1.1
- These migrations must be applied to staging before Phase 1.1 can push
- All mutation commands (`--include-all`, migration repair, db pull) are explicitly prohibited

### Current State

- 2 RBAC Phase 1.1 migrations ready: `20260626000000_create_normalized_rbac_schema.sql`, `20260626010000_seed_core_rbac_data.sql`
- 2 recovered migration files restored to local git for parity: `20260624014941_create_ph_issue_dependencies.sql`, `20260624130421_reindex_business_requests_mdt_5digit.sql`
- 200+ additional local migrations from April-June not in staging
- Git working tree clean (7 unrelated src files stashed)
- No `rbac_*` tables exist in staging (0 rows confirmed)

### Blocked Operations

- `supabase db push --linked` — blocked by pending migrations
- `supabase db push --linked --include-all` — explicitly prohibited
- `supabase migration repair` — explicitly prohibited
- `supabase db pull` — explicitly prohibited
- Production use — explicitly prohibited
- Phase 1.2 work — explicitly prohibited

### Valid Next Validation Path

1. User starts Docker Desktop manually on development machine
2. New Claude conversation reads this handoff
3. Claude runs local Supabase: `supabase start` → `supabase db push --local`
4. Claude runs RBAC validation query pack against local Supabase
5. Results reviewed by user
6. Only after runtime validation passes can Phase 1.1 be accepted for Phase 1.2 start

### Optional Alternative (Dry-Run, Requires Approval)

If Docker cannot be started, propose isolated transactional dry-run:
- Use a transaction to execute schema + seed SQL
- Run validation queries
- Rollback
- No migration history mutations, no `rbac_*` tables left behind, no production use
- Requires explicit user approval before execution
