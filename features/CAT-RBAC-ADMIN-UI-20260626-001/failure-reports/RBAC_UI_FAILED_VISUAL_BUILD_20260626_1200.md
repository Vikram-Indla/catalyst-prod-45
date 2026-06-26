# RBAC UI Visual Build — Failure Report
**Feature Work ID:** CAT-RBAC-ADMIN-UI-20260626-001
**Date:** 2026-06-26
**Status:** FAILED — Failure Freeze Active
**Verdict:** Visual failure. No commit made. Rollback/rebuild decision required.

---

## 1. Objective

Build RBAC admin UI surfaces across `/admin/roles` and `/admin/permissions` to demo-quality standard: Catalyst/Jira-grade, enterprise-ready, meeting CLAUDE.md screenshot signoff. Schema locked (`RBAC_SCHEMA_DEPLOYED = false`), all mock data.

---

## 2. What Was Attempted

**6-lane parallel rescue pass** targeting 7 files:

| Lane | File | Change |
|------|------|--------|
| A | `RbacRolesTable.tsx` | Neutral lozenge, "Assign users" row action |
| B | `RbacUsersTable.tsx` | Full JiraTable rewrite — avatar, email, dept, status, role chips |
| C | `RbacAssignmentsTable.tsx` | Full JiraTable rewrite — 4 cols |
| D | `PermissionsAdminPage.tsx` | ARIA tab strip replacing @atlaskit/tabs, token fixes, spacing |
| E | `CreateEditRoleModal.tsx`, `AssignUsersModal.tsx`, `RolesAdminPage.tsx` | Neutral callouts, wired Assign users flow |
| F | Validation | Audit grep, tsc, eslint |

Lane F passed (0 ADS violations, 0 tsc errors). Screenshots captured (10/10). UI rendered.

---

## 3. Why the Current Result Failed Visually

- **Archaic appearance**: generic table rows with no density, no breathing room, no visual hierarchy that reads as enterprise admin
- **Cramped layout**: JiraTable column widths wrong for RBAC data; role chips overflow truncated; avatar column competes with text
- **Bland**: No status colour differentiation (deliberate — neutral lozenges required), but nothing else compensates — result is uniform grey mud
- **Table-heavy**: All 4 tabs resolve to a table or matrix. No summary cards, no at-a-glance stats, no progressive disclosure
- **Not Catalyst-quality**: Missing elevation, missing section headers with role stats, missing onboarding empty states, missing role-card pattern used in comparable Jira admin screens
- **Not demo-grade**: Would not pass a stakeholder walkthrough. Looks like a dev scaffold, not a product
- **Multiple patch loops failed**: Lozenge fix → table rewrite → ARIA tabs → still not at acceptance bar. Patches cannot fix a structural design deficit

---

## 4. Screens Affected

- `/admin/roles` → Roles tab (RbacRolesTable)
- `/admin/roles` → Users tab (RbacUsersTable)
- `/admin/roles` → Assignments tab (RbacAssignmentsTable)
- `/admin/roles` → Permissions matrix tab (PermissionsMatrix)
- `/admin/permissions` → Permission catalogue tab (PermissionsAdminPage)
- `/admin/permissions` → Role matrix tab (PermissionsAdminPage)
- CreateEditRoleModal
- AssignUsersModal

---

## 5. Files Changed (this rescue session vs HEAD)

**RBAC rescue files (7):**
- `src/components/admin/rbac/RbacRolesTable.tsx` (+293 lines diff)
- `src/components/admin/rbac/RbacUsersTable.tsx` (+252 lines diff)
- `src/components/admin/rbac/RbacAssignmentsTable.tsx` (+137 lines diff)
- `src/pages/admin/PermissionsAdminPage.tsx` (+143 lines diff)
- `src/components/admin/rbac/CreateEditRoleModal.tsx` (2-line callout change)
- `src/components/admin/rbac/AssignUsersModal.tsx` (2-line callout change)
- `src/pages/admin/RolesAdminPage.tsx` (+222 lines diff)

**Pre-existing changes (do not touch, classified separately):**
- `CLAUDE.md` (2478-line diff — full CLAUDE.md rewrite, pre-existing)
- `.gitignore` (3-line addition, pre-existing)
- `src/components/admin/admin-nav.ts` (4-line addition, pre-existing)
- `src/components/admin/rbac/PermissionsMatrix.tsx` (28-line diff, pre-existing)
- `src/components/admin/rbac/RbacSchemaBanner.tsx` (37-line diff, pre-existing)

**Untracked (do not touch):**
- `HANDOVER_MIGRATION_ARCHAEOLOGY_2026_06_25.md`
- `docs/feature-builder/` (all files — pre-existing untracked)
- `docs/ways-of-working/` (all files — pre-existing untracked)
- `features/CAT-SOP-SMOKE-TEST-20260626-001/` (pre-existing untracked)
- `scripts/` (pre-existing untracked)

---

## 6. What Is Potentially Reusable

| Item | Reusable? | Notes |
|------|-----------|-------|
| `JiraTable` wiring pattern in RbacUsersTable | Yes — data binding is correct | Visual layer needs redesign |
| `JiraTable` wiring in RbacAssignmentsTable | Yes — 4-col structure is correct | Same issue |
| ARIA tab strip in RolesAdminPage | Yes — keyboard nav, WCAG pattern correct | Keep |
| ARIA tab strip in PermissionsAdminPage | Yes | Keep |
| `openAssign()` wiring + `setAssignRole` fix | Yes — modal flow is correct | Keep |
| AssignUsersModal user list + pre-selection | Yes — behaviour correct | Shell needs visual redesign |
| CreateEditRoleModal form fields | Yes — validation + fields correct | Shell needs visual redesign |
| Mock data (MOCK_ROLES, MOCK_USERS, MOCK_ASSIGNMENTS) | Yes — not touched | Keep |
| `RBAC_SCHEMA_DEPLOYED = false` guard | Yes | Keep |
| Neutral lozenge change (appearance="default") | Yes — correct spec | Keep |

---

## 7. What Should Be Discarded

| Item | Discard? | Reason |
|------|----------|--------|
| RbacRolesTable full layout | Yes | Lacks role-card header, stats row, visual hierarchy |
| RbacUsersTable full layout | Yes | Avatar+chip approach doesn't scale; looks dev-scaffold |
| RbacAssignmentsTable full layout | Yes | 4-col flat table insufficient for RBAC audit use case |
| PermissionsMatrix current implementation | Unknown — pre-existing | Needs separate assessment |
| RbacSchemaBanner | Do not touch — pre-existing | |
| PermissionsAdminPage tab content (catalogue view) | Keep with rebuild | Tab shell works; catalogue layout needs redesign |

---

## 8. Recommendation: Rebuild / Rollback / Split

**Recommendation: Option B — Controlled selective rollback + canonical screen rebuild**

Rationale:
- Patches cannot fix a structural visual design deficit
- JiraTable data wiring is correct but the surrounding layout (card headers, stat strips, role summary panels, density) is missing
- Multiple loops confirm the base pattern is wrong — not just the implementation
- Best-practice RBAC admin screens (Jira, Okta, Azure AD) use role-card + user-list + stat summary patterns, not raw tables
- A clean rebuild from a canonical Catalyst access-management screen (UserAccessPage or equivalent) will reach demo-grade in one targeted pass

Files to **revert** (selective restore to HEAD):
- `RbacRolesTable.tsx`
- `RbacUsersTable.tsx`
- `RbacAssignmentsTable.tsx`
- `PermissionsAdminPage.tsx`
- `RolesAdminPage.tsx`

Files to **preserve from this session** (merge into rebuild):
- `CreateEditRoleModal.tsx` (callout fix is correct)
- `AssignUsersModal.tsx` (callout fix is correct)
- The `openAssign()`/`setAssignRole`/`onAssignUsers` wiring from `RolesAdminPage.tsx`

Files to **not touch**:
- `CLAUDE.md`, `.gitignore`, `admin-nav.ts`, `PermissionsMatrix.tsx`, `RbacSchemaBanner.tsx`

**Estimated time:** 2–3 hours (one timebox)
**Risk:** Low if rollback is clean and rebuild uses a proven canonical reference

---

## 9. Next Exact Prompt Proposal

```
RBAC UI rebuild — canonical access-management pattern.

Context:
- Prior rescue pass (CAT-RBAC-ADMIN-UI-20260626-001) failed visually.
- Failure report: ~/catalyst/features/CAT-RBAC-ADMIN-UI-20260626-001/failure-reports/RBAC_UI_FAILED_VISUAL_BUILD_20260626_1200.md
- Patch archive: ~/catalyst/features/CAT-RBAC-ADMIN-UI-20260626-001/archive/RBAC_UI_FAILED_PATCH_20260626_1200.patch

Selective rollback already complete (verify before starting):
- RbacRolesTable, RbacUsersTable, RbacAssignmentsTable, PermissionsAdminPage, RolesAdminPage — reverted to HEAD
- CreateEditRoleModal, AssignUsersModal callout fixes — preserved
- openAssign()/setAssignRole/onAssignUsers wiring — preserved in RolesAdminPage

Rebuild objective:
Build /admin/roles to Catalyst/Jira enterprise-admin visual standard.
Reference: Jira's Project Settings > People & Access screen pattern.
Required: role summary card header (role name, description, user count, permission count, status badge), JiraTable below showing users assigned to that role, "Assign users" CTA prominent, tab strip using existing ARIA pattern.

Constraints:
- No migrations, no SQL, no Supabase calls, no rbac_* queries
- RBAC_SCHEMA_DEPLOYED remains false
- No hand-rolled tables
- No bare hex colours
- No yellow/green lozenges
- Screenshot signoff required before any commit

Do not commit. Present Plan Lock first. Wait for approval before coding.
```

---

## Evidence

**Patch archive:** `~/catalyst/features/CAT-RBAC-ADMIN-UI-20260626-001/archive/RBAC_UI_FAILED_PATCH_20260626_1200.patch` (4124 lines)

**Screenshot IDs captured this session:**
- ss_7940ic715 — Roles tab, neutral lozenges
- ss_894287d8t — Users tab, JiraTable
- ss_0190jdv71 — Assignments tab, 4-col
- ss_1018tha30 — Permissions matrix tab
- ss_1240pe7vb — Row actions menu (Edit role + Assign users)
- ss_0734n03s2 — Create role modal
- ss_1473ytwzj — Edit role modal
- ss_0664514g2 — Assign users modal
- ss_9190xczmn — /admin/permissions Permission catalogue
- ss_19061mnl1 — /admin/permissions Role matrix
