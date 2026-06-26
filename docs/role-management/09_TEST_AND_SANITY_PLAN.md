# 09. Sanity Test Plan — 25 Mandatory Tests

**Status:** Approved  
**Last Updated:** 2026-06-24

All 25 tests must pass before claiming each cycle done. Do not mark passed without evidence.

---

## Sanity Tests (Cycle 1)

### 1. Admin can access all seeded modules and actions
**Test:** Log in as Admin role. Verify Project Hub / Product Hub / Release Hub / Test Hub / Task Hub / Home all show in sidebar. Verify no "Access denied" errors.
**Evidence:** Screenshot of sidebar + navigation to each module succeeds.

### 2. Guest cannot create/update/delete/export/bulk/transition
**Test:** Log in as Guest role. Try to create issue, update field, delete item, export CSV, bulk edit, change status. All should fail or show disabled buttons.
**Evidence:** 403 errors or disabled UI elements.

### 3. User role has only default permissions
**Test:** Log in as User role. Verify only Home Hub visible. All other modules blocked. No write actions available.
**Evidence:** Sidebar shows only Home, other modules redirect or 403.

### 4. A user cannot have more than one active role
**Test:** Assign User role A. Assign role B. Verify role A becomes inactive. DB check: SELECT * FROM user_roles WHERE user_id = X AND is_active = true; should return 1 row.
**Evidence:** DB query shows exactly 1 active role.

### 5. Banned fields are not visible to non-admin roles
**Test:** Log in as QA Tester. Open an issue detail. assessment_feature and service_now_ref should not appear anywhere.
**Evidence:** Screenshot showing field list, no banned fields rendered.

### 6. Hidden fields are not exported
**Test:** Role A has field X with can_view = false. Export CSV from that role. Column X missing. Admin exports same, sees column X.
**Evidence:** CSV diff showing field excluded for role, included for admin.

### 7. Read-only fields cannot be edited
**Test:** Role A has field X with can_update = false. Detail view shows field (if can_view = true) but no edit input. Field value is text/read-only.
**Evidence:** Screenshot showing non-editable field state.

### 8. Unauthorized status transitions are blocked
**Test:** Role A has status transition todo → in_progress disabled. Try to transition. Should fail (403 or dropdown locked).
**Evidence:** Error or disabled dropdown.

### 9. Bulk delete is separate from delete
**Test:** Role A has can_delete = true, can_bulk_delete = false. Single delete works, bulk delete fails/disabled.
**Evidence:** Single delete succeeds, bulk fails or UI disabled.

### 10. Incident Hub is read-only in Catalyst
**Test:** Open Incident Hub item. All edit buttons disabled. Status dropdown locked. "Managed in Jira" overlay visible.
**Evidence:** Screenshot of read-only incident detail.

### 11. Incident Hub add_comment/add_watcher/add_attachment/transition blocked
**Test:** Try to add comment, watcher, attachment, or change status on incident. All should be blocked.
**Evidence:** Disabled UI or 403 errors.

### 12. Permission audit log records every permission change
**Test:** Create role, update role, change permissions, assign user. Check permission_audit_log table has entries. SELECT count(*) FROM permission_audit_log; should be > 0.
**Evidence:** DB query showing audit entries with correct action_type values.

### 13. Access Management uses roles table
**Test:** Go to Admin > Access > Create Access. Open role dropdown. Verify it loads active roles from roles table (not hardcoded list).
**Evidence:** Dropdown shows all seeded roles. Try adding new role to DB, refresh page, new role appears in dropdown.

### 14. Create Access dropdown reads active roles from roles table
**Test:** Deactivate a role. Create Access dropdown should no longer show it. Activate role. Should reappear.
**Evidence:** Screenshots before/after deactivation showing dropdown change.

### 15. Deactivated roles cannot be assigned
**Test:** Try to assign a deactivated role to a user. Should fail at API or UI level.
**Evidence:** Error message or disabled option.

---

## Sanity Tests (Cycle 2)

### 16. Guest expires after 48 hours
**Test:** Create guest access. Check guest_access.expires_at = NOW() + 48 hours. Wait past expiry (or manually set expires_at to past). Guest access should no longer be usable.
**Evidence:** DB query showing expiry timestamp, then guest login fails after expiry time.

### 17. Sticky save bar appears only when dirty
**Test:** Open role detail. No sticky bar visible. Change one permission. Sticky bar appears with count. Discard changes. Bar disappears.
**Evidence:** Screenshots showing bar appear/disappear based on change state.

### 18. Module matrix summary tiles update live
**Test:** Open role detail, Modules tab. Summary tiles show counts. Toggle a checkbox. Tile count updates immediately.
**Evidence:** Screenshot showing count change in real-time.

### 19. Field groups auto-expand on search
**Test:** Grouped field grid. Collapse all groups. Search for "priority". The group containing priority field auto-expands.
**Evidence:** Screenshot showing collapsed grid becoming expanded on search.

### 20. Permission Preview accurately reflects role permissions
**Test:** Preview role A with module B. Check sidebar shows correct access level. Check toolbar buttons match role permissions. Columns/fields match can_view state.
**Evidence:** Screenshot of preview matching role's actual permissions.

### 21. Exports only include can_export fields
**Test:** Export CSV from role A. Fields with can_export = false missing. Admin exports same, sees all fields.
**Evidence:** CSV column count differs between role and admin.

### 22. No "coming soon" pages exist
**Test:** Navigate all admin pages. Search codebase for "coming soon", "under construction", "TODO UI", "placeholder". Should find zero.
**Evidence:** Bash grep result showing 0 matches.

### 23. No placeholder tabs exist
**Test:** Open each detail page (role, access, audit). Every tab should have real content (not empty panel, not "Coming in Phase 2").
**Evidence:** Screenshot of each tab showing content.

### 24. No hardcoded ROLE_GROUPS in Create Access modal
**Test:** Grep codebase: `grep -r "ROLE_GROUPS" src/ | grep -i "access\|create"`. Should be zero. Role dropdown must load from roles table.
**Evidence:** Grep result showing 0 matches.

### 25. No UI regression in Admin shell
**Test:** Open all existing admin pages (not role management new pages). Verify no visual or functional regressions. Sidebar still works. Navigation intact.
**Evidence:** Screenshots of each existing admin page showing no changes.

---

## Evidence Rules

For each test, evidence must be:
- **Screenshot** — for visual verification (UI state, no errors)
- **Bash output** — for code checks (grep, git, test results)
- **DB query result** — for database state checks
- **Test output** — for automated tests (npm test)
- **Error message** — for permission checks (403, validation errors)

**Do not mark tests passed without at least one form of evidence per test.**

---

## Test Automation

Create test file `src/__tests__/role-management/sanity.test.ts`:
```typescript
describe('Role Management Sanity Tests', () => {
  it('test 1: Admin can access all modules', () => { ... });
  it('test 2: Guest cannot create/update/delete', () => { ... });
  // ... tests 3-25 ...
});

// Run: npm test -- role-management/sanity
```

---

**All 25 tests must pass before declaring the cycle complete.**
