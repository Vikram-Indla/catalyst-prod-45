# Karpathy Loop Log — CAT-RBAC-LIVE-DATA-20260626-002

## Loop 1 — Discovery: Real data architecture

**Hypothesis:** RBAC pages need new hooks querying new tables.  
**Experiment:** Ran 4 parallel discovery agents: DB schema audit, AdminAccessPage audit, RBAC page audit, enterprise UI pattern audit.  
**Measure:** Found `useProductRoles.ts` already exists with `useProductRoles()`, `useUsersWithRole()`, `useAllRolePermissions()`. Found `product_role_permissions` table with real data. No new tables needed.  
**Keep:** Use existing hooks. No new hook files.  
**Discard:** Plan to create `useRbacUsers.ts`, `useModulePermissions.ts` — not needed.  
**Log:** Option A confirmed as lowest-risk path. All hooks already exist. Pure wiring job.

## Loop 2 — Discovery: fontWeight typo scope

**Hypothesis:** fontWeight:653 is in PermissionsAdminPage only.  
**Experiment:** Discovery agent found it in 3 files: PermissionsAdminPage.tsx (×2), PermissionsMatrix.tsx (×3), AssignUsersModal.tsx (×1).  
**Measure:** 6 occurrences total. All must be fixed to 600.  
**Keep:** Fix all 6 as part of Slice 1.  
**Discard:** Hypothesis that it was isolated.
