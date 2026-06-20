# Admin Module Component Audit

**Scan Date:** 2026-06-20  
**Total Components:** 43 in `src/components/admin/`, 19 pages in `src/pages/admin/`, 22 in `src/modules/workhub/admin/`  
**Total:** ~84 admin-related files  

---

## Summary by Category

### Core Admin Shell (KEEP)
- `AdminLayout.tsx` — Root container
- `AdminSidebar.tsx` / `AdminSidebarV2.tsx` — Navigation
- `AdminGuard.tsx` / `SuperAdminGuard.tsx` — RBAC guards

### Admin Pages (Current)

**Pages that redirect to `/admin/access`:**
- `RolesPermissions.tsx`
- `UserAccessPage.tsx`
- `FeatureFlagsPage.tsx`
- `ResourceAssignments.tsx`
- `NotificationTriggers.tsx`
- `ReleaseOpsAdminPage.tsx`
- `ComponentsAdminPage.tsx` (design system preview)
- `GovernanceSettings.tsx` (ADS audit)
- `ModuleAccessAdminPage.tsx`
- `RoutingTaxonomyPage.tsx`
- `Departments.tsx`
- `BusinessOwners.tsx`
- `CapacityDepartments.tsx`
- `UsersManagement.tsx` (variant)
- `AdminAccessPage.tsx` (primary)
- `AdminIconsPage.tsx` (icon management)
- `AdminAvatarsPage.tsx` (avatar management)
- `AdminStorybookPage.tsx` (Storybook reference)
- `AiTranslationsAuditPage.tsx` (i18n audit)

### WorkHub Admin Components (NEW)
Located in `src/modules/workhub/admin/`:
- `JiraConnection.tsx` — Jira connection config
- `HierarchyMapping.tsx` — Hierarchy level + type mapping (NEW — partial)
- `UserMapping.tsx` — Jira user→Catalyst user mapping
- `StatusMapping.tsx` — Status mappings
- `SyncConfigPanel.tsx` — Sync scheduling
- `SyncLogs.tsx` — Sync run history
- `DataScope.tsx` — Data scope filters
- `ReadOnlyBanner.tsx` — Connection status
- `TestConnectionModal.tsx` — Jira test
- `SchedulingRules.tsx` — Cron config
- Plus hooks: `useAdminConfig`, `useJiraConnection`, `useSyncEngine`

---

## Design System Compliance Issues

**P0 Violations (HALT on new builds):**
- Hand-rolled button components in `HierarchyMapping.tsx` (no @atlaskit/button)
- Missing keyboard navigation on tabs
- No ARIA labels on button groups

**P1 Issues:**
- 11px typography on type-mapping tabs (ADS min is 12px)
- No canonical color tokens (raw RGB values observed)
- Inconsistent spacing (no 4/8/16/24/32px grid)

---

## Deprecation Candidates

**DEPRECATE (redirect only, keep for 1-2 releases):**
- `RolesPermissions.tsx` — merged into UserAccessPage
- `FeatureFlagsPage.tsx` — merged into UserAccessPage
- `ResourceAssignments.tsx` — merged into UserAccessPage
- `NotificationTriggers.tsx` — merged into UserAccessPage
- `ReleaseOpsAdminPage.tsx` — integrated elsewhere
- `ModuleAccessAdminPage.tsx` — merged into UserAccessPage
- `Departments.tsx` / `CapacityDepartments.tsx` / `BusinessOwners.tsx` — unclear usage

**STATUS:** These pages all redirect to `/admin/access` in the router. Actual UI is in UserAccessPage component.

---

## Classification

| Component | Status | Action |
|-----------|--------|--------|
| `AdminLayout` + Sidebar | ✅ KEEP | Core shell |
| `AdminAccessPage` | ✅ KEEP | Primary hub |
| `ComponentsAdminPage` | ✅ KEEP | Design ref |
| `GovernanceSettings` | ✅ KEEP | ADS audit |
| Admin icon/avatar pages | ✅ KEEP | Content mgmt |
| WorkHub suite | ⚠️ AUDIT | Partial impl, needs design review |
| `HierarchyMapping` | ⚠️ REWRITE | Phase 0 — backend driven |
| All 9 redirect pages | ✅ DEPRECATE | All logic in UserAccessPage |
| Old workflow pages | ✅ DELETE | Unused after consolidation |

---

## Next Steps

1. **Merge audit:** Confirm which 9 pages are 100% replaceable by UserAccessPage
2. **HierarchyMapping rewrite:** Replace hand-rolled UI with canonical components
3. **Design compliance:** Review all remaining pages for ADS token/component violations
4. **Deprecation timeline:** Schedule removal of redirect pages after grace period

---

## Notes

- WorkHub admin suite is new (partial implementation)
- HierarchyMapping component exists but UI needs rewrite (no backend schema finalized yet)
- No design review has been done on new components (design-critique blocked by architecture changes)
- All old pages are soft-deprecated via router redirects — hardcoding all business logic in UserAccessPage
