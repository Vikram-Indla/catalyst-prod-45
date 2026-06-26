# Handover — Migration Archaeology + Option F Local Chain Test
Date: 2026-06-25 (session end ~16:32 +03)
Branch: main
Git HEAD: 043dd7297

---

## Session Work Summary

Three parallel research lanes completed. One execution lane (Option F) partially executed and blocked.

---

## LANE 1 — OPTION F LOCAL CHAIN TEST: BLOCKED (known exceptions found)

### What happened

Four `supabase db reset --local` attempts. File `supabase/migrations/20260516000000_admin_data_migration.sql` is a Lovable-era pg_dump seed that cannot apply in a non-superuser local reset chain.

| Attempt | Error | Fix attempted |
|---|---|---|
| 1 | `syntax error at \restrict` | ✅ stripped wrapper lines |
| 2 | `permission denied RI_ConstraintTrigger DISABLE TRIGGER ALL` | ✅ stripped 42 TRIGGER ALL lines |
| 3 | `duplicate key admin_nav_modules.module_key = home` | HARD STOP — Option A rejected |
| 4 (Option B, excluded 000000) | `duplicate key wh_jira_connection_singleton` (in 20260516000001) | New artifact found |

### Current file state

Both files RESTORED TO HEAD. Working tree CLEAN.

```
git status --short → (clean)
supabase/migrations/20260516000000_admin_data_migration.sql → 3895 lines, 1.2MB (original)
supabase/migrations/20260516000001_seed_jira_connection.sql → 524B (original, NEVER READ per gate)
```

### Classification of blocked files

| File | Classification | Why blocked |
|---|---|---|
| `20260516000000_admin_data_migration.sql` | Lovable pg_dump seed artifact | Requires superuser (DISABLE TRIGGER ALL), assumes empty tables, contains \restrict wrapper |
| `20260516000001_seed_jira_connection.sql` | Lovable Jira connection seed | `wh_jira_connection_singleton` constraint violated by earlier migration's seed row |

### Gate: NEVER read or print content of 20260516000001_seed_jira_connection.sql (contains Jira API token)

### Option F finding

Local `db reset --local` cannot validate the full chain because two Lovable-era artifacts fail for structural reasons unrelated to migration correctness. They were designed as one-shot Supabase platform seeds, not migration-chain members.

**Next decision needed:**
- **Option B-extended**: Exclude both `000000` and `000001`, run reset, validate remaining 1013 migrations
- **Option C**: Close Option F. Accept finding. Proceed to staging as validation surface.

### If continuing Option B-extended in next session

```bash
mkdir -p /tmp/catalyst_migration_hold
mv supabase/migrations/20260516000000_admin_data_migration.sql /tmp/catalyst_migration_hold/
mv supabase/migrations/20260516000001_seed_jira_connection.sql /tmp/catalyst_migration_hold/
supabase db reset --local 2>&1 | tee /tmp/reset_out5.txt
# Check result, then always restore:
mv /tmp/catalyst_migration_hold/*.sql supabase/migrations/
```

Hard stops remain: do not mutate staging/prod, no db push --linked, no migration repair.

---

## LANE 2 — RBAC MIGRATION PLAN: COMPLETE (read-only)

Source: `/Users/vikramindla/Downloads/role-management/` files 00–12

### Migration files to create (gate: NOT YET APPROVED)

```
supabase/migrations/20260626000000_create_normalized_rbac_schema.sql
supabase/migrations/20260626010000_seed_core_rbac_data.sql
supabase/migrations/20260626020000_rbac_audit_logging_triggers.sql
```

### 14 new tables (all rbac_ prefixed, additive)

rbac_roles, rbac_user_roles, rbac_guest_access, rbac_modules, rbac_entities,
rbac_fields, rbac_actions, rbac_workflows, rbac_workflow_transitions,
rbac_role_module_permissions, rbac_role_field_permissions,
rbac_role_action_permissions, rbac_role_transition_permissions,
rbac_permission_audit_log

### Key schema decisions

- No new Postgres ENUMs — all categoricals use `text CHECK(IN ...)` to avoid ALTER TYPE complications
- One-active-role-per-user enforced via partial unique index: `UNIQUE ON rbac_user_roles(user_id) WHERE is_active = true`
- Guest 48h window: `CHECK (expires_at = created_at + INTERVAL '48 hours')` — must pass `created_at` explicitly at insert time
- SECURITY DEFINER helper required before RLS: `public.rbac_is_admin(uid uuid)` — avoids recursive RLS (see CLAUDE.md 2026-06-03 lesson)
- Audit log: INSERT only via SECURITY DEFINER triggers, no direct client INSERT policy
- All RLS: no `auth.jwt()->>'role'` (Catalyst doesn't populate JWT roles — CLAUDE.md 2026-05-19)

### Seed data order (FK deps)

1. rbac_roles (17 rows — confirm 17th role, likely `team_lead`)
2. rbac_modules (10 rows: 7 active, 3 dormant)
3. rbac_entities (one per module)
4. rbac_fields (120+ rows; `assessment_feature` + `service_now_ref` → classification=`banned`)
5. rbac_actions (CRUD/BULK/EXPORT/COLLABORATION/AI/INCIDENT per module)
6. rbac_workflows + rbac_workflow_transitions
7. rbac_role_*_permissions (full matrix)

### P0 BLOCKER — app_role enum conflict

Prod-only migration `20260620115137` (`add_new_app_role_values`) extended `public.app_role` ENUM.
Unknown values. Local still has 4 values: `admin, program_manager, team_lead, user`.
Must query prod before applying RBAC locally:

```sql
-- Run via Supabase MCP (mcp__42209857__execute_sql) on project lmqwtldpfacrrlvdnmld:
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'app_role'
ORDER BY enumsortorder;
```

RBAC tables do NOT use app_role directly, but RLS helpers that call has_role() may behave differently.

---

## LANE 3 — RBAC UI PLAN: COMPLETE (read-only)

### New routes (register in FullAppRoutes.tsx existing /admin block)

```
/admin/roles        → src/pages/admin/RolesAdminPage.tsx (master-detail)
/admin/permissions  → src/pages/admin/PermissionsAdminPage.tsx (read-only catalogue)
```

Add to admin-nav.ts under existing `Users` pocket (alongside Access + Departments).

### Salvageable existing components (src/components/admin/roles-permissions/)

RolesList.tsx → refactor
RoleDetails.tsx → refactor to RoleDetailPanel.tsx
AddEditRoleModal.tsx → adapt
AddUserToRoleModal.tsx → refactor to AssignUsersToRoleModal.tsx

New files needed: PermissionsMatrix.tsx, PermissionsBadge.tsx

### New hooks (all blocked on rbac_* schema)

useRbacRoles, useRbacPermissions, useRolePermissions, useRoleUsers

### Schema discrepancy to resolve

Lane 3 agent used simplified flat table names (rbac_permissions, rbac_role_permissions).
Lane 2 actual schema has normalized permission tables:
  rbac_role_module_permissions, rbac_role_field_permissions,
  rbac_role_action_permissions, rbac_role_transition_permissions
PermissionsMatrix must be designed against Lane 2 schema, not the flat version.

### What can be built before schema lands

- Route registrations (lazy imports)
- Sidebar nav entry
- Shell components with empty/loading states
- AddEditRoleModal form (name + description only)
- Page layout + ADS token CSS

### Hard blocked until schema lands

All hooks, PermissionsMatrix, RoleDetailPanel permissions section, TypeScript types,
AdminGuard auth-gate transition (user_roles → rbac_user_roles is separate approved task)

---

## LANE 4 — ARCHAEOLOGY SUMMARY: COMPLETE (read-only)

### Counts

| Metric | Value |
|---|---|
| Prod migrations total | 1035 |
| Local migrations total | 1015 |
| Prod-only no-local-equivalent | 98 (current machine observed) |
| Accepted handover baseline | 94 (old machine) |
| Delta | +4 (not yet closed) |

### 94 vs 98 delta items

| Item | Version | Name | Direction | Confidence |
|---|---|---|---|---|
| A | 20260617201718 | provision_auth_for_orphaned_profiles | HANDOVER-ONLY | HIGH — current has local file |
| B | 20260518213107 | add_scheduled_design_audit (dupe) | CURRENT-ONLY | HIGH — version duplicate |
| C | 20260521205222 | cleanup_legacy_wh_filter_rls_policies | UNRESOLVED | LOW |
| D | 20260528200416 | fix_ph_comments_select_rls_allow_own_comments | LIKELY CURRENT-ONLY | MED |
| E | 20260529164627 | fix_ph_comments_select_allow_all_authenticated | LIKELY CURRENT-ONLY | MED |
| F | 20260610195652 | jira_filter_id_unique_nonpartial | NOT CURRENT-ONLY (correction) | HIGH |
| ?4 | unknown | unknown | CURRENT-ONLY | — |
| ?5 | unknown | unknown | CURRENT-ONLY | — |

98-count baseline NOT accepted as final. Unknown_4 and Unknown_5 unresolved.

### Module distribution (98 total)

project_hub=26, chat=14, infrastructure=11, workflow=8, design_system=8,
jira_sync=8, access_mgmt=5, connect=5, release_hub=4, boards=2, ai=2,
itsm=1, notion=1, unknown=3

### Top risks

1. RBAC: `add_new_app_role_values` (20260620115137) — enum values unknown (P0)
2. Schema drift: `consolidate_planner_tables_to_tasks` — local may reference planner_* tables (P1)
3. Security: `fix_ph_jira_connection_rls_use_user_roles` (20260621031731) — Jira connection RLS fix prod-only (P1)
4. Entirely prod-only modules: connect (5 migrations), itsm (1 migration) — unknown intent (P1)
5. Lovable seed artifacts: 20260516000000 + 20260516000001 — block local chain test (P1)

### Stakeholder questions (15 total — AWAITING INPUT)

Stored at: ~/catalyst/stakeholder_questions_refined.txt
Q1 (P1 BLOCKER): app_role enum values added by add_new_app_role_values
Q2: user_invitations dept FK conflict with planned pre_assigned_role_id column
Q3: CONNECT module — shipped or abandoned?
Q4: ITSM module — phase 1b+ planned?
Q5: Notion sync — active or dormant?
Q6: planner→tasks rename — does local src still reference planner_* ?
Q7–Q15: see stakeholder_questions_refined.txt

---

## MCP Scoping (critical — do not confuse)

| MCP prefix | Project | Purpose |
|---|---|---|
| mcp__42209857__* | lmqwtldpfacrrlvdnmld | PRODUCTION |
| mcp__supabase__* | cyijbdeuehohvhnsywig | STAGING |

STAGING reads via CLI only: `supabase db query --linked "SELECT ..."` (MCP is prod-org scoped)

---

## Active Gate Status

| Gate | Status |
|---|---|
| Option F local chain test | ACTIVE — blocked at two Lovable seed artifacts |
| Staging mutation | BLOCKED |
| Production mutation | BLOCKED |
| RBAC migration authoring | BLOCKED (gate: no approval yet) |
| RBAC UI implementation | BLOCKED (schema doesn't exist) |
| db push --linked | BLOCKED |
| db pull | BLOCKED |
| Migration repair | BLOCKED |
| Commit anything | BLOCKED |
| Read 20260516000001 content | PERMANENTLY BLOCKED (contains Jira token) |

---

## Local Artifact Paths

```
~/catalyst/stakeholder_questions_refined.txt          — 15 stakeholder questions
~/catalyst/prod_only_94_source_reference_summary.txt  — 98 migrations by module + risk notes
~/catalyst/prod_only_94_classified.csv               — 98 rows with provisional module/op-type
~/catalyst/prod_only_94_local_search.csv             — 98 rows NO_LOCAL_EQUIVALENT
~/catalyst/no_equiv_current_98.txt                   — clean 98-line version|name list (accurate)
~/catalyst/no_equiv_accepted_handover_94.txt         — 94-line reconstruction (IMPRECISE — F error)
/Users/vikramindla/Downloads/role-management/        — RBAC source docs 00–14

```

---

## Next Session First Steps

1. Gate decision: Option B-extended (exclude both 000000 + 000001, run reset) or Option C (close Option F, go to staging)?
2. If Option C: staging path requires resolving Q1 (app_role enum) and Q6 (planner table refs) first
3. Query prod for app_role enum values (read-only, MCP safe):
   `SELECT enumlabel FROM pg_enum JOIN pg_type ON ...` via mcp__42209857__execute_sql
4. Stakeholder input on Q1–Q6 needed before any RBAC or staging work
