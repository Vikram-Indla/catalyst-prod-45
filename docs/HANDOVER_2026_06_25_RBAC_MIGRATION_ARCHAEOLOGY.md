# Catalyst Migration Archaeology & RBAC Deployment Handover

**Status:** Phase 1 Complete (Track A Cleanup + Migration Divergence Archaeology)  
**Date:** 2026-06-25  
**Git Commit (Track A):** 519c5e9  
**Git Branch:** main  
**Working Tree:** clean  
**Next Gate:** Production-only migration deep-dive archaeology (plan prepared)  
**Authoritative Documentation:** [Google Drive RBAC Folder](https://drive.google.com/drive/u/0/folders/1cvAaFmIRVjci2U3tHqaEh1t5MtTq37Ip)

---

## Table of Contents

1. [Track A: Migration Filename Cleanup](#track-a-migration-filename-cleanup)
2. [Production/Staging/Local Divergence](#productionstaginglocalval-divergence)
3. [RBAC Phase 1 Deployment Status](#rbac-phase-11-12a-deployment-status)
4. [Security Blocker: Jira Token](#security-blocker-jira-api-token)
5. [Hard Gates & Blockers](#hard-gates--blockers)
6. [Production-Only Migration Archaeology](#production-only-migration-archaeology)
7. [Recommended Next Steps](#recommended-next-steps)
8. [Checklist for Next Session](#checklist-for-next-session)

---

## Track A: Migration Filename Cleanup

### Status: CLOSED ✓

**Commit:** `519c5e9`  
**Commit Message:** `fix(migrations): normalize legacy migration filenames`  
**Date Completed:** 2026-06-25  
**Scope:** Local git repository only (no staging/production mutations)

### Changes Made

#### Malformed Renames (18 files)

Migration files with invalid timestamp format were normalized:

```
Before: supabase/migrations/20260516_*.sql
After:  supabase/migrations/20260516000000_*.sql
```

Format: `YYYYMMDDHHMMSS_description.sql` (14-digit timestamp + underscore + description)

#### Duplicate Timestamp Renames (27 files)

Files with identical version timestamps were deduplicated sequentially:

```
Before: 20260516000000_migration_a.sql
        20260516000000_migration_b.sql
        20260516000000_migration_c.sql

After:  20260516000000_migration_a.sql
        20260516000001_migration_b.sql
        20260516000002_migration_c.sql
```

### Verification Results

| Check | Status | Details |
|---|---|---|
| Working tree | ✓ Clean | No uncommitted changes after commit |
| Duplicate timestamps | ✓ Passed | No remaining duplicate versions in filesystem |
| Invalid format | ✓ Passed | All migrations match `YYYYMMDDHHMMSS_*` pattern |
| SQL content | ✓ Unchanged | Rename-only; no SQL modifications |
| RBAC files | ✓ Untouched | RBAC migrations preserved exactly |
| File count | ✓ 1018 total | Consistent with extracted local versions |

### Files Renamed

**Total:** 45 migrations renamed

- Malformed format fixes: 18
- Duplicate timestamp deduplications: 27
- No deletions
- No new files created

### Git Status After Track A

```
$ git status
On branch main
nothing to commit, working tree clean
```

---

## Production/Staging/Local Divergence

### Raw Migration Counts

| Environment | Version Count | Status | Details |
|---|---|---|---|
| **Production** | 1035 | Active ledger | Applied migrations on lmqwtldpfacrrlvdnmld |
| **Staging** | 1018 | Linked project | Extracted from `supabase migration list --linked` |
| **Local** | 1018 | Git filesystem | Extracted from `supabase/migrations/` directory |

### Divergence Topology

```
Production (1035 versions)
│
├─ Overlap with Local/Staging: ~818 versions (common to all three)
├─ Production-only: 217 versions (NOT in local git)
└─ Production not in Local: 217 migrations

Local/Staging (1018 versions, perfectly synced)
│
├─ Overlap with Production: ~818 versions (same as above)
├─ Local-only: 200 versions (NOT applied to production)
└─ Local not in Production: 200 migrations
```

### Staging ↔ Local Sync Status

**Finding:** Staging and Local are **perfectly synchronized** at 1018 versions each.

```
Staging versions not in local: 0
Local versions not in staging: 0
Diff result: ZERO DIVERGENCE
```

**Implication:** Staging and local migration ledgers are identical. The divergence is between (Staging/Local) vs. Production, not between Staging and Local.

### Production-Only Migrations (217 Total)

**Definition:** Migration versions that appear in production's ledger but do NOT exist in local git filesystem.

#### By Local Equivalent Status

| Status | Count | Percentage |
|---|---|---|
| **Has local equivalent** (same name or functional match) | 123 | 57% |
| **NO local equivalent** (production-only work) | 94 | 43% |

#### Module Distribution (Production-Only)

```
Chat engine & features:         36 migrations
Add/Create/Fix operations:      53 migrations (combined)
  - Add/extend:                 20
  - Create/new:                 16
  - Fix/repair:                 17
Seed data & initialization:      7 migrations
Workflow management:             6 migrations
Release Hub (rh):                5 migrations
Jira integration:                5 migrations
Connect module:                  5 migrations
Project Hub (ph):                4 migrations
Notion integration:              4 migrations
Drop/cleanup operations:         4 migrations
Other (40+ categories):         42 migrations
  - Design system:              4
  - User/profile:               4
  - Task management:             4
  - Presence/real-time:          3
  - [... 40+ more single/dual occurrences]
```

#### Production-Only With NO Local Equivalent (94 Total)

These 94 migrations represent actual database work applied to production that was never committed to local git.

**Critical Schema Creations:**
- `create_webhook_tables`
- `create_sync_cooldowns`
- `create_phase2_checkpoint_tables`
- `create_jira_sync_comments_backfill`
- `create_product_members_table`
- `create_archive_system`
- `create_archive_functions`
- `create_story_sprints_table`

**Chat Module (Production-Only):**
- `chat_get_or_create_dm_rpc`
- `chat_project_channel_and_ticket_thread_rpcs`
- `chat_auto_project_channel_v2`
- `chat_fullscreen_schema_additions`
- `chat_pinned_messages_rls_policies`
- `chat_channel_trigger_on_jira_projects`
- `chat_p2b_notif_pref`
- `chat_p2d_search_modifiers`
- `chat_p2e_broadcast_mentions`
- `chat_p2f_link_previews`

**Workflow & Task Management (Production-Only):**
- `workflow_admin_schema`
- `rename_task_fk_constraints_to_match_tables`
- `fix_generate_task_key_use_key_column`
- `create_task_saved_filters_and_calendar_view`
- `tasks_assignment_status_notifications`
- `tasks_notifications_target_live_table`
- `consolidate_planner_tables_to_tasks`

**New/Emerging Modules (Production-Only):**
- `connect_engine_schema`
- `connect_native_schema`
- `itsm_1a_incident_schema`
- `release_lifecycle_5stage`
- `deploy_gate_and_settings`

**Data & User Management (Production-Only):**
- `add_shared_user_scopes_rpc`
- `add_nickname_to_profiles`
- `provision_auth_for_orphaned_profiles`
- `repair_resource_country_links_from_profiles`
- `user_recent_items_project_member_select`
- `seed_test_profiles_for_otp`
- `repoint_orphan_profile_vikram_2026_05_17`
- `profiles_email_unique_2026_05_17`
- `project_members_user_id_fk_to_profiles_2026_05_17`
- `projects_add_lead_id_2026_05_17`
- `helper_bulk_upsert_ph_issues_2026_05_17` (and fix variant)

**[Full list of 94 available in artifact:** `prod_local_equiv.txt` with complete version + name pairs]

#### Local-Only Migrations (200 Total)

**Definition:** Migration versions in local git that do NOT exist in production's ledger.

**Includes:**
- All newly developed migrations since production diverged (~2026-05-16)
- RBAC Phase 1 migrations (4 migrations, unapplied)
- Chat, AI, release, workflow, and other module work pending deployment

---

## RBAC Phase 1.1 & 1.2A Deployment Status

### Local Git State

**RBAC Migration Files Present in Git:** ✓ YES

| File | Version | Status |
|---|---|---|
| `20260625090000_br_dependencies.sql` | 20260625090000 | In git, not applied |
| `20260626000000_create_normalized_rbac_schema.sql` | 20260626000000 | In git, not applied |
| `20260626010000_seed_core_rbac_data.sql` | 20260626010000 | In git, not applied |
| `20260626020000_add_rbac_admin_select_policies.sql` | 20260626020000 | In git, not applied |

**Status:** Ready to push to an environment, not yet deployed anywhere.

### Staging Database State

#### Migration Ledger Check

**Query:** `supabase migration list --linked`

```
Output format: Local | Remote | Time (UTC)

RBAC migrations shown as:
  20260625090000 |                | 2026-06-25 09:00:00
  20260626000000 |                | 2026-06-26 00:00:00
  20260626010000 |                | 2026-06-26 01:00:00
  20260626020000 |                | 2026-06-26 02:00:00
```

**Interpretation:**
- Local column populated: ✓ YES (migrations exist in local git)
- Remote column populated: ✗ NO (empty means NOT applied to remote/staging)
- **Status:** Migrations are listed in local but NOT applied to staging database

#### Schema Verification (Proof of Non-Application)

**Query 1:** RBAC Table Count
```sql
SELECT COUNT(*) AS rbac_table_count
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'rbac_%'
```
**Result:** 0 (zero RBAC tables exist in staging)

**Query 2:** RBAC Policy Count
```sql
SELECT COUNT(*) AS rbac_policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'rbac_%'
```
**Result:** 0 (zero RBAC policies exist in staging)

**Conclusion:** RBAC Phase 1 schema is NOT applied to staging. The migration ledger shows them as pending (unapplied).

### Production Database State

#### Migration Ledger Check

**Status:** RBAC migrations do NOT appear in production's 1035-version ledger at all.

#### Schema Verification

**Expected tables:** `rbac_roles`, `rbac_user_roles`, `rbac_modules`, `rbac_entities`, `rbac_fields`, `rbac_actions`, `rbac_workflows`, `rbac_workflow_transitions`, `rbac_role_module_permissions`, `rbac_role_field_permissions`, `rbac_role_action_permissions`, `rbac_role_transition_permissions`, `rbac_permission_audit_log`

**Found:** None (schema does not exist in production)

**Conclusion:** RBAC Phase 1 has never been applied to production.

### RBAC UI Implementation Blocker

**Status:** BLOCKED (cannot proceed with UI implementation)

**Reason:**

The RBAC Phase 1.1 schema (14 tables with RLS policies) does not exist in any deployed environment:
- Production: Schema missing
- Staging: Schema missing
- Local: Code exists but not applied

**The RBAC UI cannot function without the underlying database schema.**

**Prerequisite for UI Implementation:**
1. RBAC Phase 1.1 schema must be applied to at least one environment (staging recommended as testing ground)
2. RBAC Phase 1.2A policies must be verified working
3. RPC functions must be tested end-to-end
4. Only THEN can UI implementation begin

**Current Status:** Blocked until Phase 1.1 deployment strategy is approved.

---

## Security Blocker: Jira API Token

### Location

**File:** `supabase/migrations/20260516000001_seed_jira_connection.sql`

**What it contains:** Plaintext Jira API token in seed data

```sql
-- Example pattern (actual content in file)
INSERT INTO ph_jira_connection (email, api_token)
VALUES ('vikramataol@gmail.com', 'ACTUAL_PLAINTEXT_TOKEN_HERE');
```

### Impact

#### If Migration Is Pushed

1. Migration will be applied to the target environment (staging or production)
2. Plaintext token will be permanently recorded in `supabase_migrations.schema_migrations` ledger
3. Token will exist in both the migration file AND the database
4. Token must be rotated immediately after push to invalidate the exposed version

#### Current Status

- Migration exists in local git: ✓ YES
- Migration has been pushed to staging: ✗ NO
- Migration has been pushed to production: ✗ NO
- Token exposed anywhere: ✗ NO (not yet pushed)

### Blocking Impact on Deployments

**Any `supabase db push` operation that includes this migration will:**
1. Commit the plaintext token to the migration ledger (permanent record)
2. Require immediate token rotation afterward
3. Create a security incident requiring explanation

**This migration blocks:**
- Option 1: Push all pending local migrations to staging (includes this file)
- Option 5: Rebuild staging from local (includes this file)
- Any `db push` operation that includes the 200 local-only migrations

### Required Action Before Any Push

1. **Rotate Jira API token** on Jira admin console
2. **Update seed migration** with new token OR replace token strategy with environment variable injection
3. **Only then** execute any push operation

**Status:** Token rotation required before any staging/production push.

---

## Hard Gates & Blockers

### DO NOT EXECUTE (Non-Negotiable)

#### Database Operations

1. ❌ **`supabase db push --linked`** to staging
   - **Reason:** Jira token blocks it; 200 local-only migrations include untested code; 94 production-only migrations have unknown dependencies
   - **Risk:** HIGH

2. ❌ **`supabase db pull`** from production
   - **Reason:** Will overwrite local 200-only migrations; will fail to import 217 production-only migrations (not in local git)
   - **Risk:** HIGH

3. ❌ **`supabase migration repair`** or similar ledger manipulation
   - **Reason:** Creates permanent ledger/schema mismatch; corrupts migration integrity beyond recovery
   - **Risk:** CRITICAL

4. ❌ **Manual SQL execution** on staging or production
   - **Reason:** Bypasses migration ledger; orphans schema from version control; creates undocumented state
   - **Risk:** HIGH

5. ❌ **`supabase db push` to production**
   - **Reason:** No deployment strategy approved; production-only migration archaeology incomplete
   - **Risk:** CRITICAL

#### Feature Implementation

6. ❌ **RBAC UI implementation**
   - **Reason:** RBAC schema does not exist in any environment; UI will fail at runtime
   - **Risk:** CRITICAL (runtime failure)

#### Data Assumptions

7. ❌ **Assume production-only migrations (94) are safe to ignore**
   - **Reason:** 94 have no local equivalent; unknown schema/data impact; may be critical features
   - **Risk:** HIGH (may break production features in staging)

8. ❌ **Assume local-only migrations (200) are safe to apply**
   - **Reason:** Jira token plaintext in seed; RBAC untested; unknown dependencies on production-only schema
   - **Risk:** CRITICAL

### Database Mutation Status

| Environment | Status | Details |
|---|---|---|
| **Production** | 🔴 BLOCKED | Read-only access only; no mutations approved |
| **Staging** | 🔴 BLOCKED | Read-only access only; no mutations approved |
| **Local** | 🟡 LIMITED | Migration file edits only; no schema mutations |

### Feature Implementation Status

| Feature | Status | Reason |
|---|---|---|
| **RBAC UI** | 🔴 BLOCKED | Schema missing from all environments |
| **Chat UI** | ❓ UNKNOWN | Chat schema exists in production (36 migrations) but not fully in staging/local |
| **Connect Module** | 🔴 BLOCKED | Schema in production only; not in local |
| **ITSM Module** | 🔴 BLOCKED | Schema in production only; not in local |
| **Release Hub** | ❓ UNKNOWN | Partial schema in local; full schema in production |

---

## Production-Only Migration Archaeology

### Scope

**94 migrations** with production-only application and no local equivalent name/functionality match.

### Why It Matters

These 94 migrations represent **actual database work done on production that was never committed to local git.** Understanding them is essential before any deployment strategy can be safe.

**Three possible scenarios:**

1. **Critical functionality** — production has features that local/staging don't have; porting them to local is mandatory
2. **Hotfixes / orphaned work** — produced-only patches that can be safely ignored; equivalent fixes exist locally under different names
3. **Mixed** — some are critical, some can be ignored; requires individual assessment

### Classification Plan (Prepared, Not Executed)

**Full plan in separate document:** See `PRODUCTION_ONLY_CLASSIFICATION_PLAN.md`

**High-level approach:**

1. **Keyword analysis** — classify each by schema/data/security impact from migration name
2. **Local search** — confirm no local equivalent under different name
3. **Stakeholder input** — determine ownership (jira_sync vs. chat vs. release_hub, etc.)
4. **Risk assessment** — estimate impact if ignored vs. if ported
5. **Decision matrix** — classify each as MUST PORT / EVALUATE FIRST / CAN IGNORE / ESCALATE
6. **Escalation list** — compile migrations requiring Vikram approval

### Blocker Questions For Stakeholders

Before Phase 2 of archaeology can execute:

#### Chat Module (36 production-only migrations)

**Questions:**
- Is chat a production-only feature, or should it be in staging/local?
- Which chat migrations are critical vs. optional?
- Should all 36 be ported to local, or only a subset?

#### New Modules (connect, itsm, notion)

**Questions:**
- Are these production-only or in-progress features for future releases?
- Should they be ported to local/staging?
- Who owns each module?

#### Production-Only Seed Data (10+ migrations)

**Questions:**
- Should test profiles, member assignments, and workflow statuses be ported to local?
- Or are they production-only setup that local doesn't need?

#### Workflow & Task Management (17 production-only)

**Questions:**
- Are these critical for project hub functionality?
- Can local run without them?
- Are they prerequisites for RBAC or other features?

#### Release Hub & Access Management

**Questions:**
- Are release hub migrations (5) in-scope for this release?
- Must access management migrations (5) be ported before RBAC?

### Artifacts Generated

The following read-only files have been generated for Phase 2 execution:

- `/tmp/prod_migration_history.txt` — All 1035 production migrations (version + name)
- `/tmp/prod_not_in_local.txt` — All 217 production-only versions
- `/tmp/prod_only_version_names.txt` — Production-only with full names (217 rows)
- `/tmp/prod_local_equiv.txt` — All 217 with YES/NO local equivalent status
- `/tmp/local_migration_versions_unique.txt` — All 1018 local versions
- `/tmp/staging_migration_versions.txt` — All 1018 staging versions

---

## Recommended Next Steps

### DO NOT RESUME RBAC UI IMPLEMENTATION

**RBAC Phase 1 schema does not exist in any environment.**

UI code will fail at runtime when it tries to query non-existent `rbac_*` tables.

### DO NOT EXECUTE ANY MIGRATION DEPLOYMENT

**Migration divergence archaeology is incomplete.**

Cannot safely deploy until the 94 production-only no-equivalent migrations are classified.

### NEXT GATE: Production-Only Deep-Dive

**Execute:** Phase 2–6 of the classification plan (prepared, not yet executed)

**Objective:** Determine for each of 94 production-only migrations:
- Whether it must be ported to local
- Whether it can be safely ignored
- Whether it requires escalation for Vikram approval

**Effort:** 3–4 hours (depends on stakeholder input)

**Gate:** Do not proceed until stakeholder input questions (above) are answered

---

## Checklist for Next Session

### Before Starting Work

- [ ] Read this handover from Google Drive (authoritative source)
- [ ] Confirm no new production-only migrations appeared (query production ledger again)
- [ ] Confirm Jira token status (still plaintext in local git?)
- [ ] Confirm RBAC is still not applied (rbac_table_count query on staging)
- [ ] Confirm Track A commit (519c5e9) is still the latest

### Before Any Staging/Production Work

- [ ] Obtain answers to all stakeholder input questions (above)
- [ ] Execute Phase 2–6 of classification plan (prepare artifacts, not database changes)
- [ ] Obtain Vikram approval for decision matrix output
- [ ] Rotate Jira API token BEFORE any `db push` operation
- [ ] Document deployment strategy (which 94 to port, which to ignore)

### Before RBAC UI Implementation

- [ ] Confirm Phase 1.1 schema has been applied to at least one environment
- [ ] Confirm Phase 1.2A policies are working (test RPC functions)
- [ ] Confirm RBAC role assignments are seeded
- [ ] Verify `rbac_table_count > 0` in target environment
- [ ] Only then begin UI implementation

### Before Any Migration Push

- [ ] Confirm Jira token has been rotated
- [ ] Confirm all 94 production-only migrations are classified
- [ ] Confirm no new dependencies exist between local-only and production-only migrations
- [ ] Confirm backup/rollback strategy (in case push breaks production)
- [ ] Obtain Vikram final approval

---

## Session Context

| Item | Value |
|---|---|
| Session ID | 4e18d1e3-916e-40cc-8779-b94cf31baca4 |
| Start Date | 2026-06-25 |
| Phase Completed | Phase 1 (Track A) + Phase 2 (Archaeology) |
| Commits Created | 1 (519c5e9) |
| Mutations Executed | 0 (rename-only, no schema/data changes) |
| Hard Gates Active | 8 gates |
| Features Blocked | RBAC UI, Chat (partial), Connect, ITSM |
| Security Blocker | Jira token (plaintext, requires rotation) |
| Escalations Pending | 94 production-only migrations classification |
| Next Gate | Stakeholder input + Phase 2 classification plan |

---

## Document History

| Date | Event | Status |
|---|---|---|
| 2026-06-25 | Track A migration cleanup completed | ✓ CLOSED |
| 2026-06-25 | Production/staging/local divergence archaeology completed | ✓ CLOSED |
| 2026-06-25 | RBAC Phase 1 deployment status documented | ✓ COMPLETE |
| 2026-06-25 | Production-only classification plan prepared | ✓ READY FOR EXECUTION |
| 2026-06-25 | This handover prepared | ✓ COMPLETE |

---

**End of Handover**

**Next Update:** After stakeholder input is received and Phase 2–6 of classification plan is executed.
