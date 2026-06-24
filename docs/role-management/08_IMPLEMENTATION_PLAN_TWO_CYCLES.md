# 08. Implementation Plan — Two Cycles

**Status:** Approved  
**Timeline:** Cycle 1 (2 weeks), Cycle 2 (2 weeks)  
**Last Updated:** 2026-06-24

---

## Cycle 1: Foundation + Core UI (2 weeks)

### Phase 1.1: Database Schema & Seeding (Days 1–3)

**Exact files expected to change:**
- `supabase/migrations/20260626000000_create_normalized_roles_schema.sql` (350 lines)
- `supabase/migrations/20260626010000_seed_core_data.sql` (500 lines)

**Expected output:**
- All 14 tables created with constraints and indexes
- 16 default roles seeded
- All modules, entities, fields, actions, workflows seeded
- RLS policies on all sensitive tables

**Validation:**
```bash
supabase db pull  # Verify schema matches ERD
supabase start && supabase db query --local \
  "SELECT count(*) FROM roles WHERE is_active = true" # Should be 16
```

**Rollback:** Drop migration files, revert migrations (careful with production).

---

### Phase 1.2: Access Management (Days 4–6)

**Exact files expected to change:**
- `src/pages/admin/access/index.tsx` (new page)
- `src/components/admin/access/PeopleTab.tsx` (new)
- `src/components/admin/access/InvitationsTab.tsx` (new)
- `src/components/admin/access/EmailLogTab.tsx` (new)
- `src/components/admin/access/GenerateLinksTab.tsx` (new)
- `src/components/admin/access/CreateAccessModal.tsx` (new, dynamic role dropdown)
- `src/hooks/useAccessManagement.ts` (new)

**Expected output:**
- Access page with 4 tabs (People, Invitations, Email Log, Generate Links)
- People table with user data + role column
- Invitations table with email + status
- Email log table with delivery status
- Generate Links form
- Create Access modal with dynamic role dropdown (SELECT * FROM roles WHERE is_active = true)

**Validation:**
```bash
npm run type-check  # No TS errors
npm run test -- access  # Tests pass
# Manual: Click Create Access, verify role dropdown loads from DB (not hardcoded)
```

**Rollback:** Remove new files, revert any migrations.

---

### Phase 1.3: Role Management (Days 7–10)

**Exact files expected to change:**
- `src/pages/admin/role-management/index.tsx` (new landing)
- `src/pages/admin/role-management/detail.tsx` (new detail page)
- `src/components/admin/role-management/RoleTable.tsx` (new)
- `src/components/admin/role-management/RoleDetailTabs.tsx` (new)
- `src/components/admin/role-management/OverviewTab.tsx` (new)
- `src/components/admin/role-management/ModulesTab.tsx` (new, with summary tiles)
- `src/components/admin/role-management/FieldsTab.tsx` (new, grouped grid)
- `src/components/admin/role-management/ActionPermissionsTab.tsx` (new)
- `src/components/admin/role-management/WorkflowTransitionsTab.tsx` (new)
- `src/components/admin/role-management/UsersTab.tsx` (new)
- `src/components/admin/role-management/AuditTab.tsx` (new)
- `src/components/admin/role-management/StickySaveBar.tsx` (new)
- `src/hooks/useRoleDetail.ts` (new)
- `src/hooks/usePermissionAudit.ts` (new)

**Expected output:**
- Role Management landing page (table + create/clone modals)
- Role Detail page with 7 tabs
- Module matrix with 6 summary tiles + sticky column
- Field grid grouped by module/entity with search
- Action permissions grouped by category
- Workflow transition matrix with Incident Hub locked
- Sticky save bar (shows only when changes made)
- Users assigned tab (list of users with this role)
- Audit tab (changes to this role)

**Validation:**
```bash
npm run type-check
npm run test -- role-management
# Manual: Edit role, change permissions, verify save bar appears
# Manual: Check module matrix summary tiles update live
# Manual: Search field grid, verify groups auto-expand
```

**Rollback:** Remove new files.

---

### Phase 1.4: Foundational Permission Infrastructure (Days 11–14)

**Exact files expected to change:**
- `src/lib/permissions.ts` (new, ~200 lines)
  - `getModulePermission(roleId, moduleKey)`
  - `getFieldPermission(roleId, fieldId)`
  - `getActionPermission(roleId, actionKey)`
  - `getTransitionPermission(roleId, workflowKey, fromStatus, toStatus)`
- `src/hooks/useUserRole.ts` (updated to load from roles table, not hardcoded)
- `src/components/admin/AdminGuard.tsx` (updated to check roles table)
- `supabase/migrations/20260626020000_add_audit_logging.sql` (new, triggers + RLS)
- `src/hooks/usePermissionAudit.ts` (query permission_audit_log)

**Expected output:**
- Permission check utilities working
- AdminGuard checks roles table (not hardcoded booleans)
- Every role/permission change logged to audit_log
- Audit page displays log entries
- RLS policies on all tables
- No hardcoded role checks anywhere in UI

**Validation:**
```bash
npm run type-check
# Grep for hardcoded role strings — should find none:
grep -r "admin\|user\|guest" src/ | grep -i "string\|==\|===" | head -5
# Create a test role, change permissions, verify audit log records changes
# Manual: Switch users, verify permissions change immediately
```

**Rollback:** Revert migrations and files.

---

### Cycle 1 Deliverables

- ✅ Normalized roles/user_roles/guest_access/module_permissions/field_permissions/action_permissions tables
- ✅ 16 default roles seeded
- ✅ All modules/entities/fields/actions/workflows seeded
- ✅ Access Management page (People / Invitations / Email Log / Generate Links tabs)
- ✅ Create Access modal with dynamic role dropdown
- ✅ Role Management landing + detail workspace
- ✅ 7 tabs (Overview / Modules / Fields / Actions / Transitions / Users / Audit)
- ✅ Module matrix with summary tiles + sticky column
- ✅ Field grid grouped by module/entity with search
- ✅ Sticky save bar (no header/footer save buttons)
- ✅ Permission utility functions
- ✅ AdminGuard updated to use roles table
- ✅ Audit logging infrastructure
- ✅ Sanity tests 1–15 passing

---

## Cycle 2: Enforcement + Hardening (2 weeks)

### Phase 2.1: Action & Transition Enforcement (Days 1–4)

**Files to change:**
- `src/lib/permissions.ts` (extend with action/transition checks)
- All API mutation handlers (check action permissions before allowing mutation)
- `src/pages/admin/role-management/ActionPermissionsTab.tsx` (complete)
- `src/pages/admin/role-management/WorkflowTransitionsTab.tsx` (complete, lock Incident Hub)

**Expected output:**
- Action permission checks in all mutation endpoints
- Transition permission checks in status change endpoints
- Incident Hub mutation actions locked (add_comment, add_watcher, add_attachment, transition_status all forbidden)
- Transition dropdown shows lock icon for blocked transitions

**Validation:**
```bash
npm run test -- actions transitions
# Manual: Try to edit Incident Hub item, verify "Managed in Jira" overlay
# Manual: Try to delete as a role without delete permission, verify 403
```

**Rollback:** Revert files.

---

### Phase 2.2: Field-Level & Export Enforcement (Days 5–8)

**Files to change:**
- `src/lib/permissions.ts` (extend with field visibility/editability checks)
- All detail view components (check field.can_view, field.can_update)
- All export endpoints (filter by field.can_export)
- `src/components/admin/role-management/FieldsTab.tsx` (complete field classifications)

**Expected output:**
- Hidden fields don't render in detail views
- Read-only fields don't show edit controls
- Export CSV filters columns by can_export permission
- Banned fields never visible to non-admin

**Validation:**
```bash
npm run test -- fields export
# Manual: Log in as QA Tester, check priority field is hidden
# Manual: Export CSV, verify banned fields excluded
```

**Rollback:** Revert files.

---

### Phase 2.3: Incident Hub Hard Read-Only (Days 9–10)

**Files to change:**
- All Incident Hub detail views (add "Managed in Jira" overlay on write actions)
- All mutation endpoints for Incident Hub (return 403 for non-read operations)
- Action/transition enforcement (lock all Incident Hub actions)

**Expected output:**
- Incident Hub detail view is strictly read-only
- All edit buttons disabled with tooltip "Managed in Jira"
- All status transitions blocked
- All comment/watcher/attachment actions blocked

**Validation:**
```bash
# Try to edit incident status, verify error or redirect to Jira
# Try to add comment to incident, verify disabled/error
```

**Rollback:** Revert files.

---

### Phase 2.4–2.5: Permission Preview + Hardening (Days 11–14)

**Files to change:**
- `src/pages/admin/role-management/PreviewPage.tsx` (new, complete)
- All component guards (ActionAccessGuard, FieldAccessGuard, ModuleAccessGuard)
- All RLS policies (verify no recursion, all safe)
- Route guards (AdminGuard on /admin/*, module routes check can_read)

**Expected output:**
- Permission Preview page with 6 sections (sidebar, buttons, columns, drawer, export, transitions)
- All UI hides/disables correctly based on role permissions
- All RLS policies in place and non-recursive
- All route guards in place

**Validation:**
```bash
npm run test -- preview guards rls
# Manual: Log in as different roles, verify sidebar/buttons/fields match preview
# Manual: Check permission audit log has 50+ entries from testing
```

**Rollback:** Revert files.

---

## Context Handoff Updates

At the end of **each phase**, update `10_CONTEXT_HANDOFF.md`:
- What was completed
- What files changed
- What databases were created
- What tests passed
- What the next phase expects

---

## Success Criteria (Cycle 1 & 2)

**Cycle 1 Done When:**
- [ ] All 14 tables created with constraints
- [ ] 16 roles seeded
- [ ] Access Management page live (4 tabs working)
- [ ] Create Access modal wired (dynamic role dropdown)
- [ ] Role Management page live (7 tabs working)
- [ ] Module matrix with tiles
- [ ] Field grid grouped + searchable
- [ ] Sticky save bar functional
- [ ] Sanity tests 1–15 passing
- [ ] Zero TypeScript errors

**Cycle 2 Done When:**
- [ ] All action permissions enforced
- [ ] All transition permissions enforced
- [ ] Incident Hub strictly read-only
- [ ] Permission Preview showing correct UI
- [ ] All field visibility enforced
- [ ] Export filtering by permissions
- [ ] All RLS policies in place
- [ ] Sanity tests 16–25 passing
- [ ] Zero console errors in browser
- [ ] Zero TypeScript errors

---

**Follow this plan exactly. Deviation requires explicit approval.**
