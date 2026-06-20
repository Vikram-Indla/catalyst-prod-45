# Phase -1 Deprecation Plan

**Status:** APPROVED 2026-06-20  
**Scope:** Safe removal of obsolete code + data owners finalized  
**Timeline:** 1 release grace period + hard removal  

---

## Deprecation Wave 1 — Soft (Current)

### Routes (Soft redirect, keep 1 release)

**Deprecated Routes → `/admin/access`:**
```
/admin/overview
/admin/user-access
/admin/roles-permissions
/admin/feature-flags
/admin/resource-assignments
/admin/settings/notifications
/admin/notification-triggers
/admin/components
/admin/departments
/admin/business-owners
/admin/v2/*
```

**Action:**
- Keep router redirects (no UI breakage)
- Add deprecation warning in browser console
- Document in CHANGELOG

**Removal Timeline:** After 2 releases (2026-08-20)

---

### Pages (Remove redirects, consolidate into UserAccessPage)

**Deprecated Page Files (4 pages marked for hard removal after 1-release grace period):**
```
src/pages/admin/RolesPermissions.tsx ⚠️ DEPRECATED 2026-06-20
src/pages/admin/FeatureFlagsPage.tsx ⚠️ DEPRECATED 2026-06-20
src/pages/admin/NotificationTriggers.tsx ⚠️ DEPRECATED 2026-06-20
src/pages/admin/BusinessOwners.tsx ⚠️ DEPRECATED 2026-06-20
```

**Reexported as components (safe to keep indefinitely):**
```
RolesPermissionsContent from @/components/admin/RolesPermissionsContent
FeatureFlagsContent from @/components/admin/FeatureFlagsContent
NotificationTriggersContent from @/components/admin/NotificationTriggersContent
BusinessOwnersContent from @/components/admin/BusinessOwnersContent
```

**Unused pages (can delete immediately):**
```
src/pages/admin/ResourceAssignments.tsx (0 imports — dead code)
src/pages/admin/ReleaseOpsAdminPage.tsx (1 import — needs audit)
src/pages/admin/ModuleAccessAdminPage.tsx (keep — active, uses FeatureFlagsContent)
src/pages/admin/Departments.tsx (26 imports — heavily used, do NOT delete)
src/pages/admin/CapacityDepartments.tsx (12 imports — heavily used, do NOT delete)
```

**Current State:** All content is in UserAccessPage (these files are dead code or thin wrappers)

**Action:**
1. Confirm all 9 pages' logic is in UserAccessPage
2. Remove dead page files
3. Remove lazy imports from FullAppRoutes
4. Keep router redirects for 1 release

---

### Database Tables (Audit before deprecation)

**Workflow Table Conflict:**
- `catalyst_workflow_*` ← KEEP (Catalyst-native)
- `injira_workflow_*` ← AUDIT for usage, then deprecate

**Search for usage:**
```bash
grep -r "injira_workflow" src/ supabase/
```

**If unused:** Mark for deprecation after migration complete

---

## Deprecation Wave 2 — Hard (After 1 release)

### Remove Dead Code

After users migrate to new URLs:

1. Delete 9 deprecated page files
2. Remove redirects from FullAppRoutes
3. Update sidebar navigation
4. Remove lazy imports

**Estimated impact:** ~500 lines deleted, no functional change (redirects hide the change)

---

## Audit Before Deprecation

**Run these checks before any removal:**

### 1. Find all inbound links to deprecated routes

```bash
grep -r "/admin/roles-permissions\|/admin/feature-flags\|/admin/resource-assignments" src/ --include="*.tsx" --include="*.ts"
grep -r "/admin/overview\|/admin/user-access\|/admin/departments" src/ --include="*.tsx" --include="*.ts"
grep -r "injira_workflow" src/ supabase/ --include="*.tsx" --include="*.ts" --include="*.sql"
```

**Action:** Update all links to point to new destinations

### 2. Confirm UserAccessPage contains all 9 page features

Spot-check UserAccessPage.tsx for:
- ✅ Roles & Permissions UI
- ✅ User Access controls
- ✅ Feature Flags toggles
- ✅ Resource Assignments
- ✅ Notification Triggers config
- ✅ Release Ops panel
- ✅ Module Access matrix
- ✅ Department management
- ✅ Business Owner assignment

**If any missing:** Block deprecation until restored

### 3. Database row counts (ensure cleanup is safe)

```sql
SELECT count(*) FROM public.gadget_settings;
SELECT count(*) FROM public.es_strategy_roles;
SELECT count(*) FROM public.injira_workflow_schemes;
SELECT count(*) FROM public.injira_workflow_scheme_mappings;
```

**Action:** If count > 0 and usage unclear, audit before deprecation

---

## Jira Table Deprecation Strategy

**Tables to deprecate (not delete):**
- `injira_issue_types` ← Migrate data to Catalyst; keep for 1 release
- `injira_issue_type_schemes` ← Read-only reference only
- `injira_workflow_schemes` ← Audit usage; consolidate to `catalyst_workflow_*`
- `injira_role_assignments` ← Migrate to Catalyst users; keep for reference

**Timeline:**
1. **Phase -1 (now):** Mark tables as deprecated in migration comments
2. **Phase 0:** Build Catalyst-native equivalents
3. **Phase 1 (2026-08):** Run bulk migration from Jira tables to Catalyst
4. **Phase 2 (2026-10):** Drop Jira tables (after 90-day backup retention)

**Safety:** Never hard-drop until:
- All data migrated to Catalyst equivalents
- No UI reads from Jira tables
- 90-day backup retention complete
- Explicit approval from user

---

## Audit Log Retention Policy (NEW)

**Problem:** 10+ audit tables growing unbounded

**Solution:** 90-day retention policy

**Implementation:**
```sql
-- Add retention_deleted_at to all audit tables
ALTER TABLE public.admin_permission_audit
ADD COLUMN retention_deleted_at timestamptz;

-- Create cron job (run daily at 2 AM UTC)
SELECT cron.schedule(
  'audit_cleanup_90_days',
  '0 2 * * *',
  'DELETE FROM public.admin_permission_audit WHERE created_at < now() - interval ''90 days'';'
);
```

**Applies to:**
- `admin_permission_audit`
- `business_request_audit_logs`
- `defect_audit_log`
- `ai_governance_audit_log`
- `feature_flag_audit`
- `governance_sync_skip_log`
- `data_access_audit`
- `dependency_audit_log`
- `execution_run_audit_logs`
- `auth_audit_log`
- `ai_assist_audit_events`

---

## Consolidation Checklist

- [ ] Confirm all 9 pages' features in UserAccessPage
- [ ] Grep for inbound links to deprecated routes
- [ ] Audit `injira_workflow_*` usage
- [ ] Audit `gadget_settings` usage
- [ ] Audit `es_strategy_roles` usage
- [ ] Update navigation sidebars
- [ ] Add 90-day audit log retention cron
- [ ] Create backup of Jira tables (before hard drop)
- [ ] Hard-remove deprecated pages (after 1 release)
- [ ] Hard-drop Jira tables (after Phase 1 migration + 90-day retention)

---

## Risk Mitigation

**High Risk:**
- Removing UserAccessPage entries before consolidation complete
- Hard-dropping Jira tables before migration finalized

**Medium Risk:**
- Removing sidebar redirects if users bookmark old URLs
- Deprecating `injira_*` tables before Catalyst equivalents exist

**Low Risk:**
- Removing dead page files
- Adding deprecation warnings
- Adding audit log retention policy

**Mitigation:**
- Keep redirects for 1 full release minimum
- Do not hard-drop data without 90-day backup
- Test all UserAccessPage features before page removal
- Communicate deprecation in CHANGELOG + admin warning banner
