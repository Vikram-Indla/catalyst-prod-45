# PLAN LOCK — RBAC CLEAN REBUILD
**Feature Work ID:** CAT-RBAC-ADMIN-UI-20260626-001
**Status:** AWAITING APPROVAL — do not code until approved
**Date:** 2026-06-26
**Timebox:** 2 hours (Slice 1); deferred Slice 2 defined below

---

## 1. Pre-flight Raw Output

```
pwd:              /Users/vikramindla/Documents/GitHub/catalyst-prod-45
branch:           main
modified (pre-existing, do not touch):
  .gitignore
  CLAUDE.md
  src/components/admin/admin-nav.ts
  src/components/admin/rbac/PermissionsMatrix.tsx   ← has 28-line pre-existing diff
  src/components/admin/rbac/RbacSchemaBanner.tsx    ← has 37-line pre-existing diff
stash[0]:         pre-switch from feature/catalyst-replay-react
last commit:      58dfd41a7 fix(notifications): insert is_jira_sync placeholder
```

---

## 2. Feature Work ID

`CAT-RBAC-ADMIN-UI-20260626-001`

---

## 3. Current State After Rollback

- 7 rescue files reverted to HEAD (zero diff confirmed)
- 5 pre-existing modified files remain untouched
- `RBAC_SCHEMA_DEPLOYED = false` confirmed in `src/lib/rbac-mock.ts`
- Both routes wired: `/admin/roles` and `/admin/permissions`
- Both in admin nav under "Users > Roles / Permissions"
- All modal launchers intact in `RolesAdminPage.tsx`
- 3-layer write-disable gate intact
- Zero Supabase imports in any RBAC file
- No RBAC migrations exist
- SAFE TO REBUILD

---

## 4. Objective

Build `/admin/roles` and `/admin/permissions` to Catalyst/Jira enterprise-admin visual standard. Demo-quality. Not a table dump. Not a spreadsheet. Enterprise access management UI that would pass a stakeholder walkthrough.

Specific failures to avoid:
- No flat table-over-table composition
- No uniform grey mud (lack of visual hierarchy)
- No "spreadsheet" column feel
- No archaic row heights
- No bland table dump without summary or navigation anchor

---

## 5. Non-Scope

**Forbidden:**
- No migrations
- No SQL
- No Supabase calls
- No `rbac_*` queries
- `RBAC_SCHEMA_DEPLOYED` remains `false`
- No backend writes
- No live data — all mock
- No changes to `.gitignore`, `CLAUDE.md`, `admin-nav.ts`
- No changes to `HANDOVER_MIGRATION_ARCHAEOLOGY_2026_06_25.md`
- No changes to `docs/feature-builder/`, `features/`, `scripts/`
- No changes outside the 7 allowed files

**Also non-scope:**
- Editable permission matrix (future)
- Role delete flow (future)
- Bulk user operations (future)
- Real-time search (mock filter only)

---

## 6. 2-Hour Scope Decision

**Slice 1 (this timebox — 2 hours):** High visual impact surfaces
- `src/pages/admin/RolesAdminPage.tsx` — sidebar layout + main panel
- `src/components/admin/rbac/RbacRolesTable.tsx` — role card row design
- `src/components/admin/rbac/RbacUsersTable.tsx` — JiraTable rebuild
- `src/components/admin/rbac/CreateEditRoleModal.tsx` — neutral callout fix
- `src/components/admin/rbac/AssignUsersModal.tsx` — neutral callout fix

**Slice 2 (deferred — separate timebox):** Secondary surfaces
- `src/components/admin/rbac/RbacAssignmentsTable.tsx` — audit table enhancement
- `src/pages/admin/PermissionsAdminPage.tsx` — catalogue layout improvements
- `src/components/admin/rbac/PermissionsMatrix.tsx` — check icon color + module borders (if pre-existing diff doesn't already cover this)

**Why:** RolesAdminPage + RbacRolesTable + RbacUsersTable carry 80% of visual impact. PermissionsAdminPage and AssignmentsTable are lower-traffic screens that can be improved in a separate bounded pass after Slice 1 is accepted.

---

## 7. Canonical Access Surfaces Discovered

| Surface | Route | Copy From |
|---------|-------|-----------|
| `AdminAccessPage.tsx` | `/admin/access` | Tab layout, modal patterns, avatar+status rows |
| `UserAccessPage.tsx` | `/admin/access/user-access` | Table toolbar (search + count + CTA), lozenge badges |
| `ModuleAccessMatrix.tsx` | `/admin/module-access` | Editable matrix pattern (future reference) |
| `AdminSidebar.tsx` | (nav component) | Sidebar item structure: icon + label + selected state |

**What to copy for RBAC:**
- Sidebar navigation item pattern: name, description truncated, stat chips, selected left border
- Table toolbar: search input + result count chip + primary CTA button
- Status lozenge: `appearance="success"` (active), `appearance="default"` (inactive/pending)
- Modal structure: `admin-dialog` wrapper, form fields, footer with Cancel + primary

---

## 8. Canonical Components Selected

| Component | Path | Use in RBAC | Decision |
|-----------|------|-------------|----------|
| `JiraTable<TRow>` | `src/components/shared/JiraTable/` | RbacUsersTable | ✅ USE — density="comfortable" |
| `admin-dialog` | `src/components/admin/admin-dialog.tsx` | Both modals | ✅ KEEP (already in use) |
| ADS `Lozenge` | `src/components/ads/` | Status badges | ✅ USE — appearance="default"/"success" |
| ADS `Avatar` | `src/components/ads/` | User avatars in UsersTable | ✅ USE |
| ADS `EmptyState` | `src/components/ads/` | Empty tabs | ✅ USE size="compact" |
| ADS `Tooltip` | `src/components/ads/` | Disabled button reason | ✅ USE (already in modals) |
| ARIA tab strip | (custom, in RolesAdminPage HEAD) | PermissionsAdminPage tabs | ✅ KEEP existing ARIA pattern |

**Not using:**
- `CatalystListPageLayout` — too heavyweight for Slice 1 sidebar pattern; revisit in Slice 2
- `@atlaskit/tabs` — BANNED due to 560px width constraint
- `DangerConfirmModal` — not needed in Slice 1 (no delete flow)

---

## 9. Canonical Components Rejected

| Component | Reason |
|-----------|--------|
| `@atlaskit/tabs` | 560px width constraint breaks admin layout |
| `CatalystListPageLayout` | Slice 1 uses sidebar pattern, not tab-page shell. Revisit Slice 2 |
| `JiraTable` for RolesTable | Role card list uses flex rows, not JiraTable — role cards need custom spacing, sidebar interaction |
| Raw `<table>` for UsersTable | JiraTable preferred for sort, density, WCAG |

---

## 10. New RBAC Mental Model

**Primary pattern:** Role Selector Sidebar + Main Content Panel

```
┌─────────────────────────────────────────────────────────────┐
│  Roles                                           [New role] │
│  Manage RBAC roles, user assignments, and permissions       │
├──────────────────────┬──────────────────────────────────────┤
│  ROLES (sidebar)     │  MAIN PANEL                          │
│  240px               │  flex: 1                             │
│  ┌──────────────┐    │  ┌─ Tab strip: Users | Assignments   │
│  │ ■ Admin      │◄───┤  │  | Permissions                    │
│  │ 2 users      │    │  ├──────────────────────────────────┤│
│  │ 48 perms     │    │  │  [Search users...]  [Assign users]││
│  │ ACTIVE       │    │  ├──────────────────────────────────┤│
│  └──────────────┘    │  │  JiraTable: users in Admin role  ││
│  ┌──────────────┐    │  │                                  ││
│  │   Product O. │    │  └──────────────────────────────────┘│
│  │ 4 users      │    │                                      │
│  │ 31 perms     │    │                                      │
│  └──────────────┘    │                                      │
│  ┌──────────────┐    │                                      │
│  │ + New role   │    │                                      │
│  └──────────────┘    │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

**Why sidebar beats flat-tab-over-table:**
- Admin never loses track of which role they're examining
- Sidebar is the enterprise admin navigation anchor (Jira, Okta, Azure AD reference)
- Permissions matrix in main panel needs max width — sidebar frees that space
- Role list is compact (10 roles × 60px ≈ 600px — fits without scrolling)
- Role stats visible at a glance without clicking into a table row

**Tab strip in main panel:**
- Tabs: `Users | Assignments | Permissions` (not Roles — roles are the sidebar)
- Tab counts: badge chip after label (Users: 2, Assignments: 2, Permissions: 48)
- Same ARIA pattern as current HEAD (keyboard nav, role="tablist")

---

## 11. Page/Screen Design Plan

### RolesAdminPage (`/admin/roles`) — Slice 1

**Layout:**
```tsx
// page structure
<div style={{ display: 'flex', height: '100%' }}>
  <RoleSidebar roles={MOCK_ROLES} selectedId={selectedId} onSelect={setSelectedId} onCreateRole={openCreate} />
  <main style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
    <RbacSchemaBanner />
    {selectedRole ? <RoleDetailPanel role={selectedRole} /> : <RoleEmptyState />}
  </main>
</div>
```

**RoleSidebar (new inline component or sub-component within RolesAdminPage):**
- Width: 240px, border-right: `1px solid var(--ds-border)`
- Background: `var(--ds-surface-sunken)`
- Padding: 12px
- Header: "Roles" label (12px uppercase, 600 weight, subtle color)
- Role card items (see below)
- Footer: "New role" link button (disabled when schema not deployed)

**Role card item anatomy:**
```
┌──────────────────────────┐
│ ■ Admin         [lock]   │  ← role name (bold 14px) + system badge (12px lock icon, subtlest)
│   Full system access...  │  ← description (12px, subtle, truncate 1 line)
│   2 users · 48 perms     │  ← stat chips (11px, subtlest, "·" separator)
│   ● ACTIVE               │  ← status dot (8px colored circle) + text (11px)
└──────────────────────────┘
```
- Hover: `var(--ds-background-neutral-subtle-hovered)`
- Selected: left border 3px `var(--ds-border-brand)`, background `var(--ds-background-selected)`
- Padding: 10px 12px
- Border-radius: 4px
- Gap between cards: 2px

**RoleDetailPanel (main panel content when role selected):**
- Tab strip: Users | Assignments | Permissions (ARIA pattern)
- Tab count badges after each label
- Users tab: RbacUsersTable filtered to `usersForRole(selectedRole.id)`
- Assignments tab: RbacAssignmentsTable filtered to that role
- Permissions tab: PermissionsMatrix filtered to that role only (single-role view)
- Toolbar row above table: search input (left) + "Assign users" button (right, disabled when schema not deployed)

### PermissionsAdminPage (`/admin/permissions`) — Slice 2

No changes in Slice 1. Existing HEAD state is acceptable for initial demo. Improvements deferred.

---

## 12. Modal Design Plan

### CreateEditRoleModal — Slice 1 (2-line change only)

Current shell is structurally acceptable. One change:
- Line ~70: Replace yellow warning callout with neutral grey:
  - `background: var(--ds-background-warning, ...)` → `var(--ds-background-neutral, #F1F2F4)`
  - `color: var(--ds-text-warning, ...)` → `var(--ds-text-subtle, #44546F)`
  - `border: none` → `border: 1px solid var(--ds-border, #DCDFE4)`

### AssignUsersModal — Slice 1 (2-line change only)

Same neutral callout fix as CreateEditRoleModal.

No other modal changes in Slice 1.

---

## 13. Mock-Safe/Data Plan

**Data sources (unchanged):**
- `MOCK_ROLES` — 10 roles
- `MOCK_USERS` — 10 users
- `MOCK_ASSIGNMENTS` — 10 assignments
- `MOCK_ROLE_PERMISSIONS` — role→permission mapping
- `usersForRole(roleId)` — filter helper
- `permissionsForRole(roleId)` — filter helper

**New data derivations needed (no new mock data, just filter/compute):**
- `assignmentsForRole(roleId): RbacAssignment[]` — filter `MOCK_ASSIGNMENTS` by `a.roleId === roleId`
- Stat counts: already on `RbacRole` as `userCount`, `permissionCount`
- Tab counts: derive from filtered arrays

**RBAC_SCHEMA_DEPLOYED:** remains `false`. All write paths disabled at button level.

---

## 14. Integration/Wiring Plan

**Preserve (do not break):**
- Routes: `/admin/roles` → `RolesAdminPage`, `/admin/permissions` → `PermissionsAdminPage`
- Admin nav registration (both routes in `admin-nav.ts` — do not touch)
- Modal launchers: `openCreate()`, `openEdit(role)`, `openAssign(role)`
- Write-disable gate: `RBAC_SCHEMA_DEPLOYED` check in both modals
- `RbacSchemaBanner` — render at top of main content area

**New wiring:**
- `selectedRoleId: string | null` state in `RolesAdminPage`
- Sidebar `onSelect` → updates `selectedRoleId`
- `openEdit(role)` — triggered from sidebar role item ⋯ menu
- `openAssign(role)` — triggered from "Assign users" button in detail panel toolbar
- `openCreate()` — triggered from "New role" footer in sidebar

**Do not couple to:**
- `supabase` — forbidden
- `rbac_*` table names — forbidden
- `user_roles`, `user_product_roles` — forbidden
- `useQuery`, `useMutation` — forbidden in RBAC files

---

## 15. Parallel Implementation Lanes

### Lane A — RolesAdminPage structural rebuild (45 min)
- Goal: sidebar layout + main panel wiring
- File: `src/pages/admin/RolesAdminPage.tsx`
- Depends on: none
- Changes:
  - Replace flat page layout with `display: flex` wrapper
  - Build inline `RoleSidebar` sub-component (role cards, selection state)
  - Build inline `RoleDetailPanel` sub-component (tab strip → table content)
  - Wire: `selectedRoleId` state → sidebar highlights + detail panel filters
  - Wire: toolbar "Assign users" button → `openAssign(selectedRole)`
  - Wire: sidebar "New role" → `openCreate()`
  - Wire: role card ⋯ menu → `openEdit(role)`

### Lane B — RbacRolesTable → Role card list (20 min)
- Goal: role card flex rows replacing current grid table
- File: `src/components/admin/rbac/RbacRolesTable.tsx`
- Depends on: none (can run parallel to Lane A)
- Changes:
  - Replace column-header grid with flex column list
  - Each row: flex row with name+description (flex:1) + stats + status dot + ⋯ menu
  - Lozenge → inline status dot + text (saves horizontal space)
  - System badge: lock icon at 12px, top-right of name area
  - Row hover + selected state styling
  - `makeRowActionsCell` equivalent via inline ⋯ button + popout menu
- Note: This component will be used in sidebar, not main panel table. Sidebar renders role cards differently — this file may be REPLACED by inline sidebar logic in Lane A.

### Lane C — RbacUsersTable JiraTable rebuild (30 min)
- Goal: enterprise-grade user table
- File: `src/components/admin/rbac/RbacUsersTable.tsx`
- Depends on: none
- Changes:
  - Wrap in `JiraTable<RbacUser>` at `density="comfortable"`
  - Columns: Name (flex:true, avatar+name+email stacked), Department (width:15), Status (width:12), Roles (width:20)
  - Name cell: ADS Avatar (initials, 32px) + name (14px 500 weight) + email (12px subtle, below name)
  - Status cell: `<Lozenge appearance={u.status === 'active' ? 'success' : 'default'}>` + uppercase text
  - Roles cell: tag badges — 11px, `var(--ds-background-information)` bg, `var(--ds-text-information)` text, 2px border-radius; max 2 chips + "+N more"
  - Empty: `<EmptyState size="compact" header="No users in this role" />`
  - Remove search from table (search moves to detail panel toolbar in Lane A)

### Lane D — Modal callout fixes (5 min)
- Goal: neutral grey callout replacing yellow warning
- Files: `src/components/admin/rbac/CreateEditRoleModal.tsx` + `AssignUsersModal.tsx`
- Depends on: none
- Changes: 2-line each (background token + color token)

**Execution order:** All lanes run parallel. Lane A is critical path (45 min). Lanes B, C, D run alongside. Merge: Lane A imports Lane C's `RbacUsersTable`. Lane B result may be superseded by inline sidebar logic in Lane A.

---

## 16. Files to Modify (Slice 1)

```
src/pages/admin/RolesAdminPage.tsx                  ← MAJOR CHANGE (Lane A)
src/components/admin/rbac/RbacUsersTable.tsx         ← MAJOR CHANGE (Lane C)
src/components/admin/rbac/RbacRolesTable.tsx         ← CHANGE or supersede (Lane B / Lane A)
src/components/admin/rbac/CreateEditRoleModal.tsx    ← 2-line change (Lane D)
src/components/admin/rbac/AssignUsersModal.tsx       ← 2-line change (Lane D)
```

**May read but not modify:**
```
src/lib/rbac-mock.ts                                 ← read-only (data source)
src/components/shared/JiraTable/                     ← read-only (canonical component)
src/components/admin/rbac/PermissionsMatrix.tsx      ← pre-existing diff, DO NOT TOUCH in Slice 1
src/components/admin/rbac/RbacSchemaBanner.tsx       ← pre-existing diff, DO NOT TOUCH
src/components/admin/rbac/RbacAssignmentsTable.tsx   ← unchanged HEAD, DO NOT TOUCH in Slice 1
src/pages/admin/PermissionsAdminPage.tsx             ← unchanged HEAD, DO NOT TOUCH in Slice 1
```

---

## 17. Files Forbidden

```
.gitignore
CLAUDE.md
src/components/admin/admin-nav.ts
HANDOVER_MIGRATION_ARCHAEOLOGY_2026_06_25.md
docs/feature-builder/
features/ (except ~/catalyst/features/ folder docs)
scripts/
supabase/
migrations/
SQL files
backend files
notification/avatar/dashboard/Jira integration files
src/lib/rbac-mock.ts (read OK, modify FORBIDDEN)
```

---

## 18. Karpathy Loop Hypotheses

See `11_KARPATHY_LOOP_LOG.md` for full detail. Summary:

**H1 — Sidebar layout:** Sidebar role selector resolves "bland" verdict. Keep if sidebar renders with hierarchy in screenshot. Discard if >45 min or breaks modal wiring.

**H2 — JiraTable density="comfortable":** Correct component but wrong column design was the failure. Keep if visual quality clears bar. Discard if still "spreadsheet" — fallback to hand-coded flex rows.

**H3 — Green check icons + module borders on matrix:** `var(--ds-icon-success)` for granted permissions makes matrix scannable. Keep if "clear and enterprise-grade" in screenshot. Discard module borders if garish.

---

## 19. Validation Commands

```bash
# After implementation — run in order:

# 1. Type check
npx tsc --noEmit 2>&1 | grep -E "src/components/admin/rbac|src/pages/admin/Roles"

# 2. ADS token audit (no bare hex)
python3 skills/ads-validator/scripts/token-validator.py \
  --path src/components/admin/rbac/ 2>/dev/null || \
  grep -rn '#[0-9A-Fa-f]\{6\}\|#[0-9A-Fa-f]\{3\}\|rgb(' \
  src/components/admin/rbac/ src/pages/admin/RolesAdminPage.tsx

# 3. No green lozenges
grep -rn "appearance.*success" src/components/admin/rbac/RbacRolesTable.tsx \
  src/pages/admin/RolesAdminPage.tsx

# 4. No Supabase imports
grep -rn "supabase\|rbac_" src/components/admin/rbac/ src/pages/admin/RolesAdminPage.tsx

# 5. RBAC_SCHEMA_DEPLOYED still false
grep "RBAC_SCHEMA_DEPLOYED" src/lib/rbac-mock.ts

# 6. Dev server visual check
# npm run dev → http://localhost:8080/admin/roles
```

---

## 20. Screenshot Checklist (Slice 1)

| # | URL + State | Pass Criterion |
|---|-------------|----------------|
| 1 | `/admin/roles` default | Sidebar visible, "Admin" role card, main panel placeholder |
| 2 | `/admin/roles` + Admin selected | Sidebar "Admin" selected (blue border), main panel Users tab active |
| 3 | `/admin/roles` Admin selected → Users tab | JiraTable density="comfortable", avatar+name+email, tag role chips |
| 4 | `/admin/roles` Admin selected → Assignments tab | Assignments table, user name, role name, assigned by, date |
| 5 | `/admin/roles` Admin selected → Permissions tab | Permission list/matrix for Admin only |
| 6 | `/admin/roles` → ⋯ menu on role card | "Edit role" + "Assign users" options |
| 7 | Create role modal open | Neutral grey callout, disabled save, empty fields |
| 8 | Edit role modal open (Admin) | Neutral grey callout, disabled save, pre-populated "Admin" |
| 9 | Assign users modal open | User list, pre-selection, neutral callout, disabled save |
| 10 | `/admin/permissions` default | Existing HEAD state (no changes in Slice 1) |
| 11 | No green lozenges on any screen | All status uses `appearance="default"` on RolesTable |

---

## 21. Stop Conditions

**STOP and escalate if:**
- Sidebar layout breaks `RbacSchemaBanner` rendering
- Modal launchers fail to open after wiring changes
- `usersForRole(selectedRole.id)` returns wrong data
- JiraTable crashes on `density="comfortable"` in RbacUsersTable
- tsc errors in RBAC files after changes
- Any Supabase import creeps in

**PATCH on the spot if:**
- Sidebar card spacing slightly off
- Tab count badges don't show (optional enhancement)
- Font size 1px off spec

**AFTER ONE CORRECTION LOOP:** accept result, defer fix to Slice 2, or stop. No endless patching.

---

## 22. Rebaseline Conditions

Escalate for decision if:
- Sidebar pattern is fundamentally wrong after implementation (doesn't match Jira mental model visually)
- JiraTable density="comfortable" still reads as "spreadsheet" after proper column design
- 45 min passes and sidebar is not rendering cleanly — fallback to flat-tab enhanced layout

Rebaseline = stop, screenshot, show Vikram, decide before continuing.

---

## 23. Estimated Time

| Lane | Time |
|------|------|
| Lane A — RolesAdminPage sidebar | 45 min |
| Lane C — RbacUsersTable JiraTable | 30 min |
| Lane B — RbacRolesTable card | 20 min (may be superseded by Lane A) |
| Lane D — Modal callouts | 5 min |
| Validation + screenshots | 20 min |
| Buffer / correction | 20 min |
| **Total** | **~120 min (2 hours)** |

---

## 24. Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Sidebar layout takes >45 min | HIGH | Rebaseline at 45 min — fallback to enhanced flat-tab layout |
| JiraTable density="comfortable" import fails | MEDIUM | Check JiraTable props via Read before coding |
| Modal wiring breaks when RolesAdminPage restructured | MEDIUM | Wire modals FIRST, then restructure layout around them |
| RbacAssignmentsTable filtered by role is missing helper | LOW | Add `assignmentsForRole(roleId)` inline (filter of MOCK_ASSIGNMENTS) — 3 lines |
| Pre-existing PermissionsMatrix diff conflicts | LOW | Do not touch PermissionsMatrix.tsx in Slice 1 |
| `CatalystListPageLayout` import path wrong | LOW | Not using in Slice 1 — deferred |

---

## 25. Aiden/JK Decision Needed

**Before coding:**

1. **Sidebar architecture approval:** Do you approve the role-selector sidebar + main panel layout for `/admin/roles`? Alternative is enhanced flat-tab layout (lower visual impact, faster).

2. **Slice 2 deferred surfaces:** Do you accept that `/admin/permissions` and `RbacAssignmentsTable` are Slice 2 (separate timebox)?

3. **RbacRolesTable fate:** With sidebar layout, RolesTable (the list of all roles with stats) may become the sidebar itself. Do you want a standalone RolesTable for any other use, or is sidebar-only correct?

4. **Modal callout style:** Neutral grey callout (proposed) vs. keeping yellow warning. Neutral grey is calmer. Yellow is more noticeable. Decision: neutral grey is correct per CLAUDE.md (no yellow warning slabs).

---

## Aiden Validation Block

```
✅ No app code modified in this Plan Lock session
✅ Only feature-folder docs written
✅ No migrations touched
✅ No SQL touched
✅ No backend/Supabase touched
✅ No commit created
✅ RBAC_SCHEMA_DEPLOYED remains false
✅ HANDOVER_MIGRATION_ARCHAEOLOGY_2026_06_25.md not touched
✅ 7 parallel agents run (all read-only)
✅ Karpathy loop log written (3 hypotheses)
✅ Session log written (sessions/003)
✅ Plan Lock written (03_PLAN_LOCK.md)
✅ Plan Lock awaits Vikram approval before any code
```
