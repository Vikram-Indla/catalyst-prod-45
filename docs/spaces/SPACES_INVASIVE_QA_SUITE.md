# CATALYST SPACES MODULE — INVASIVE QA TEST SUITE
## Version 1.0 | GOD-TIER Quality Assurance | 500+ Test Cases

---

# TABLE OF CONTENTS

1. [Test Environment Setup](#1-test-environment-setup)
2. [Database & Schema Tests](#2-database--schema-tests)
3. [API & Service Layer Tests](#3-api--service-layer-tests)
4. [Authentication & Authorization Tests](#4-authentication--authorization-tests)
5. [CRUD Operations Tests](#5-crud-operations-tests)
6. [UI Component Tests](#6-ui-component-tests)
7. [Navigation & Routing Tests](#7-navigation--routing-tests)
8. [Form Validation Tests](#8-form-validation-tests)
9. [State Management Tests](#9-state-management-tests)
10. [Drag & Drop Tests](#10-drag--drop-tests)
11. [Real-time & Sync Tests](#11-real-time--sync-tests)
12. [Performance & Load Tests](#12-performance--load-tests)
13. [Security Penetration Tests](#13-security-penetration-tests)
14. [Accessibility (a11y) Tests](#14-accessibility-a11y-tests)
15. [Edge Cases & Boundary Tests](#15-edge-cases--boundary-tests)
16. [Error Handling Tests](#16-error-handling-tests)
17. [Cross-Browser & Device Tests](#17-cross-browser--device-tests)
18. [Localization (i18n) Tests](#18-localization-i18n-tests)
19. [Integration Tests](#19-integration-tests)
20. [Regression Test Checklist](#20-regression-test-checklist)

---

# 1. TEST ENVIRONMENT SETUP

## 1.1 Prerequisites

```bash
# Required tools
- Node.js 18+
- pnpm or npm
- Supabase CLI
- Playwright (E2E)
- Vitest (Unit/Integration)
- k6 (Load testing)
- axe-core (Accessibility)
- OWASP ZAP (Security)
```

## 1.2 Test Database Setup

```sql
-- Create isolated test schema
CREATE SCHEMA IF NOT EXISTS test_spaces;

-- Clone tables to test schema
CREATE TABLE test_spaces.spaces AS SELECT * FROM public.spaces WHERE 1=0;
CREATE TABLE test_spaces.space_members AS SELECT * FROM public.space_members WHERE 1=0;
CREATE TABLE test_spaces.space_categories AS SELECT * FROM public.space_categories WHERE 1=0;
CREATE TABLE test_spaces.space_components AS SELECT * FROM public.space_components WHERE 1=0;
CREATE TABLE test_spaces.space_versions AS SELECT * FROM public.space_versions WHERE 1=0;
CREATE TABLE test_spaces.space_features AS SELECT * FROM public.space_features WHERE 1=0;
CREATE TABLE test_spaces.space_permissions AS SELECT * FROM public.space_permissions WHERE 1=0;
CREATE TABLE test_spaces.space_activity AS SELECT * FROM public.space_activity WHERE 1=0;

-- Test data seeder
INSERT INTO test_spaces.spaces (id, name, key, type, status, owner_id)
VALUES 
  ('test-space-1', 'Test Space Alpha', 'TSA', 'scrum', 'active', 'test-user-1'),
  ('test-space-2', 'Test Space Beta', 'TSB', 'kanban', 'active', 'test-user-2'),
  ('test-space-3', 'Archived Space', 'ARC', 'scrum', 'archived', 'test-user-1'),
  ('test-space-4', 'Private Space', 'PVT', 'scrum', 'active', 'test-user-3');
```

## 1.3 Test User Roles

| User ID | Role | Permissions |
|---------|------|-------------|
| test-admin | Admin | Full access to all spaces |
| test-owner | Owner | Full access to owned spaces |
| test-lead | Lead | Manage settings, members |
| test-member | Member | View, create, edit items |
| test-viewer | Viewer | Read-only access |
| test-guest | Guest | Limited public access |
| test-blocked | Blocked | No access (for denial tests) |

---

# 2. DATABASE & SCHEMA TESTS

## 2.1 Table Structure Validation

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DB-001 | Verify `spaces` table exists with all columns | All 15+ columns present | Critical |
| DB-002 | Verify `space_members` table exists | All columns present with FKs | Critical |
| DB-003 | Verify `space_categories` table exists | All columns present | High |
| DB-004 | Verify `space_components` table exists | All columns present | High |
| DB-005 | Verify `space_versions` table exists | All columns present | High |
| DB-006 | Verify `space_features` table exists | All columns present | High |
| DB-007 | Verify `space_permissions` table exists | All columns present | High |
| DB-008 | Verify `space_activity` table exists | All columns present | High |

## 2.2 Constraint Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DB-009 | Insert space with duplicate `key` | UNIQUE violation error | Critical |
| DB-010 | Insert space with NULL `name` | NOT NULL violation | Critical |
| DB-011 | Insert space with NULL `key` | NOT NULL violation | Critical |
| DB-012 | Insert space with invalid `type` enum | CHECK constraint violation | Critical |
| DB-013 | Insert space with invalid `status` enum | CHECK constraint violation | Critical |
| DB-014 | Insert member with invalid `role` enum | CHECK constraint violation | High |
| DB-015 | Insert member referencing non-existent space | FK violation | Critical |
| DB-016 | Insert member referencing non-existent user | FK violation | Critical |
| DB-017 | Delete space with existing members (CASCADE) | Members deleted | Critical |
| DB-018 | Delete space with existing components (CASCADE) | Components deleted | Critical |
| DB-019 | Delete space with existing versions (CASCADE) | Versions deleted | Critical |
| DB-020 | Insert duplicate space_member (same user+space) | UNIQUE violation | High |

## 2.3 Index Performance Tests

```sql
-- Test query plans use indexes
EXPLAIN ANALYZE SELECT * FROM spaces WHERE key = 'TSA';
EXPLAIN ANALYZE SELECT * FROM spaces WHERE owner_id = 'test-user-1';
EXPLAIN ANALYZE SELECT * FROM space_members WHERE space_id = 'test-space-1';
EXPLAIN ANALYZE SELECT * FROM space_activity WHERE space_id = 'test-space-1' ORDER BY created_at DESC;
```

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DB-021 | Query space by `key` uses index | Index Scan, <1ms | High |
| DB-022 | Query space by `owner_id` uses index | Index Scan, <5ms | High |
| DB-023 | Query members by `space_id` uses index | Index Scan, <5ms | High |
| DB-024 | Query activity with ORDER BY uses index | Index Scan, <10ms | Medium |

## 2.4 RLS Policy Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DB-025 | Anon user SELECT on spaces | 0 rows (blocked) | Critical |
| DB-026 | Anon user INSERT on spaces | Permission denied | Critical |
| DB-027 | Member SELECT own spaces | Returns member's spaces | Critical |
| DB-028 | Member SELECT other's private space | 0 rows | Critical |
| DB-029 | Owner UPDATE own space | Success | Critical |
| DB-030 | Member UPDATE space they don't own | Permission denied | Critical |
| DB-031 | Admin SELECT all spaces | Returns all spaces | Critical |
| DB-032 | Owner DELETE own space | Success (soft delete) | Critical |
| DB-033 | Viewer INSERT on space_members | Permission denied | High |
| DB-034 | Lead INSERT on space_members | Success | High |

## 2.5 Trigger Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DB-035 | INSERT space triggers `updated_at` default | Timestamp set | High |
| DB-036 | UPDATE space triggers `updated_at` change | Timestamp updated | High |
| DB-037 | INSERT space triggers activity log | Activity row created | High |
| DB-038 | UPDATE space triggers activity log | Activity row created | High |
| DB-039 | DELETE space triggers activity log | Activity row created | High |
| DB-040 | INSERT member triggers activity log | Activity row created | Medium |

---

# 3. API & SERVICE LAYER TESTS

## 3.1 Space CRUD API Tests

### 3.1.1 CREATE Space

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-001 | Create space with valid data | `{name: "New Space", key: "NEW", type: "scrum"}` | 201 Created | Critical |
| API-002 | Create space without auth token | Same as above, no Bearer | 401 Unauthorized | Critical |
| API-003 | Create space with invalid token | Same as above, bad token | 401 Unauthorized | Critical |
| API-004 | Create space with missing `name` | `{key: "NEW", type: "scrum"}` | 400 Bad Request | Critical |
| API-005 | Create space with missing `key` | `{name: "New Space", type: "scrum"}` | 400 Bad Request | Critical |
| API-006 | Create space with duplicate `key` | `{name: "New", key: "TSA", type: "scrum"}` | 409 Conflict | Critical |
| API-007 | Create space with invalid `type` | `{name: "New", key: "NEW", type: "invalid"}` | 400 Bad Request | High |
| API-008 | Create space with max length `name` (255 chars) | 255 char name | 201 Created | Medium |
| API-009 | Create space with over-length `name` (256+ chars) | 256 char name | 400 Bad Request | Medium |
| API-010 | Create space with special chars in `key` | `{key: "NEW-SPACE!@#"}` | 400 Bad Request | High |
| API-011 | Create space with lowercase `key` (should uppercase) | `{key: "new"}` | 201, key="NEW" | Medium |
| API-012 | Create space with XSS in `name` | `{name: "<script>alert('xss')</script>"}` | Sanitized/escaped | Critical |
| API-013 | Create space with SQL injection in `name` | `{name: "'; DROP TABLE spaces;--"}` | Safe insert | Critical |

### 3.1.2 READ Space

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-014 | Get space by valid ID | `/spaces/test-space-1` | 200 OK with data | Critical |
| API-015 | Get space by invalid ID (UUID format) | `/spaces/invalid-uuid` | 400 Bad Request | High |
| API-016 | Get space by non-existent ID | `/spaces/00000000-0000-0000-0000-000000000000` | 404 Not Found | Critical |
| API-017 | Get space user has no access to | `/spaces/test-space-4` (private) | 403 Forbidden | Critical |
| API-018 | Get all spaces (paginated) | `/spaces?page=1&limit=10` | 200 OK with array | Critical |
| API-019 | Get spaces with filter by type | `/spaces?type=scrum` | Only scrum spaces | High |
| API-020 | Get spaces with filter by status | `/spaces?status=active` | Only active spaces | High |
| API-021 | Get spaces with search query | `/spaces?q=Alpha` | Matching spaces | High |
| API-022 | Get spaces sorted by name ASC | `/spaces?sort=name&order=asc` | Alphabetically sorted | Medium |
| API-023 | Get spaces sorted by created_at DESC | `/spaces?sort=created_at&order=desc` | Newest first | Medium |
| API-024 | Get spaces page beyond results | `/spaces?page=999` | Empty array | Medium |

### 3.1.3 UPDATE Space

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-025 | Update space name | `PUT /spaces/test-space-1 {name: "Updated"}` | 200 OK | Critical |
| API-026 | Update space by non-owner | PUT by test-member | 403 Forbidden | Critical |
| API-027 | Update space by lead | PUT by test-lead | 200 OK | High |
| API-028 | Update space key (should be immutable?) | `{key: "NEWKEY"}` | 400 or ignored | High |
| API-029 | Update space with empty name | `{name: ""}` | 400 Bad Request | High |
| API-030 | Update space with null name | `{name: null}` | 400 Bad Request | High |
| API-031 | Update archived space | PUT on archived space | 403 or 400 | Medium |
| API-032 | Partial update (PATCH) | `PATCH {description: "New desc"}` | 200 OK | Medium |
| API-033 | Update non-existent space | PUT on invalid ID | 404 Not Found | High |

### 3.1.4 DELETE Space

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-034 | Soft delete space | `DELETE /spaces/test-space-1` | 200, status=archived | Critical |
| API-035 | Delete space by non-owner | DELETE by test-member | 403 Forbidden | Critical |
| API-036 | Delete space by admin | DELETE by admin | 200 OK | Critical |
| API-037 | Delete already archived space | DELETE on archived | Move to trash | High |
| API-038 | Hard delete from trash (admin) | `DELETE /admin/trash/space-id` | 200, permanently deleted | Critical |
| API-039 | Restore from trash | `POST /spaces/restore/space-id` | 200, status=active | High |
| API-040 | Delete non-existent space | DELETE invalid ID | 404 Not Found | High |

## 3.2 Space Members API Tests

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-041 | Add member to space | `POST /spaces/id/members {user_id, role}` | 201 Created | Critical |
| API-042 | Add duplicate member | Same user again | 409 Conflict | High |
| API-043 | Add member by non-admin of space | POST by viewer | 403 Forbidden | Critical |
| API-044 | Update member role | `PATCH /spaces/id/members/user-id {role: "lead"}` | 200 OK | High |
| API-045 | Remove member from space | `DELETE /spaces/id/members/user-id` | 200 OK | Critical |
| API-046 | Remove self from space | DELETE own membership | 200 OK | High |
| API-047 | Remove owner from space | DELETE owner | 400 (must transfer first) | Critical |
| API-048 | Get space members list | `GET /spaces/id/members` | 200 with array | Critical |
| API-049 | Add member with invalid role | `{role: "superadmin"}` | 400 Bad Request | High |
| API-050 | Bulk add members | `POST /spaces/id/members/bulk [{}, {}]` | 201 with results | Medium |

## 3.3 Components API Tests

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-051 | Create component | `POST /spaces/id/components {name, lead_id}` | 201 Created | High |
| API-052 | Create duplicate component name | Same name in space | 409 Conflict | High |
| API-053 | Update component | `PUT /spaces/id/components/comp-id` | 200 OK | High |
| API-054 | Delete component | `DELETE /spaces/id/components/comp-id` | 200 OK | High |
| API-055 | Get all components | `GET /spaces/id/components` | 200 with array | High |
| API-056 | Create component in space without permission | POST by viewer | 403 Forbidden | High |

## 3.4 Versions API Tests

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-057 | Create version | `POST /spaces/id/versions {name, start_date, end_date}` | 201 Created | High |
| API-058 | Create version with end before start | `{start: "2025-06-01", end: "2025-05-01"}` | 400 Bad Request | High |
| API-059 | Update version status | `{status: "released"}` | 200 OK | High |
| API-060 | Delete version with linked items | DELETE with work items | 400 or cascade | High |
| API-061 | Get versions sorted by date | `GET /spaces/id/versions?sort=start_date` | Sorted list | Medium |

## 3.5 Features/Settings API Tests

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| API-062 | Toggle feature on | `PATCH /spaces/id/features {sprints: true}` | 200 OK | High |
| API-063 | Toggle feature off | `{sprints: false}` | 200 OK | High |
| API-064 | Update permissions | `PUT /spaces/id/permissions` | 200 OK | High |
| API-065 | Get space features | `GET /spaces/id/features` | 200 with settings | High |

---

# 4. AUTHENTICATION & AUTHORIZATION TESTS

## 4.1 Authentication Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| AUTH-001 | Access /spaces without token | 401 Unauthorized | Critical |
| AUTH-002 | Access /spaces with expired token | 401 Unauthorized | Critical |
| AUTH-003 | Access /spaces with malformed token | 401 Unauthorized | Critical |
| AUTH-004 | Access /spaces with valid token | 200 OK | Critical |
| AUTH-005 | Refresh token flow works | New valid token | Critical |
| AUTH-006 | Logout invalidates token | Subsequent requests fail | High |
| AUTH-007 | Token from different environment rejected | 401 Unauthorized | High |

## 4.2 Role-Based Access Tests

| Test ID | Role | Action | Resource | Expected | Priority |
|---------|------|--------|----------|----------|----------|
| RBAC-001 | Admin | View | All spaces | ✅ Allowed | Critical |
| RBAC-002 | Admin | Create | Any space | ✅ Allowed | Critical |
| RBAC-003 | Admin | Delete | Any space | ✅ Allowed | Critical |
| RBAC-004 | Admin | Manage | Admin panel | ✅ Allowed | Critical |
| RBAC-005 | Owner | View | Own space | ✅ Allowed | Critical |
| RBAC-006 | Owner | Edit | Own space | ✅ Allowed | Critical |
| RBAC-007 | Owner | Delete | Own space | ✅ Allowed | Critical |
| RBAC-008 | Owner | Transfer | Ownership | ✅ Allowed | High |
| RBAC-009 | Owner | Access | Other's private space | ❌ Denied | Critical |
| RBAC-010 | Lead | View | Assigned space | ✅ Allowed | Critical |
| RBAC-011 | Lead | Edit | Space settings | ✅ Allowed | High |
| RBAC-012 | Lead | Add | Members | ✅ Allowed | High |
| RBAC-013 | Lead | Delete | Space | ❌ Denied | Critical |
| RBAC-014 | Member | View | Assigned space | ✅ Allowed | Critical |
| RBAC-015 | Member | Create | Work items | ✅ Allowed | High |
| RBAC-016 | Member | Edit | Space settings | ❌ Denied | Critical |
| RBAC-017 | Member | Add | Members | ❌ Denied | Critical |
| RBAC-018 | Viewer | View | Assigned space | ✅ Allowed | Critical |
| RBAC-019 | Viewer | Create | Anything | ❌ Denied | Critical |
| RBAC-020 | Viewer | Edit | Anything | ❌ Denied | Critical |
| RBAC-021 | Guest | View | Public spaces | ✅ Allowed | High |
| RBAC-022 | Guest | View | Private spaces | ❌ Denied | Critical |

## 4.3 Permission Matrix Tests

```typescript
// Test each action against permission matrix
const permissionTests = [
  { action: 'space.view', roles: ['owner', 'lead', 'member', 'viewer'] },
  { action: 'space.edit', roles: ['owner', 'lead'] },
  { action: 'space.delete', roles: ['owner'] },
  { action: 'members.view', roles: ['owner', 'lead', 'member', 'viewer'] },
  { action: 'members.add', roles: ['owner', 'lead'] },
  { action: 'members.remove', roles: ['owner', 'lead'] },
  { action: 'settings.view', roles: ['owner', 'lead'] },
  { action: 'settings.edit', roles: ['owner', 'lead'] },
  { action: 'components.manage', roles: ['owner', 'lead'] },
  { action: 'versions.manage', roles: ['owner', 'lead'] },
];
```

---

# 5. CRUD OPERATIONS TESTS

## 5.1 Create Flow Tests

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| CRUD-001 | Create space via UI | 1. Click "Create Space" 2. Fill form 3. Submit | Space created, redirected | Critical |
| CRUD-002 | Create space form validation | Submit with empty fields | Validation errors shown | Critical |
| CRUD-003 | Create space keyboard submit | Fill form, press Enter | Form submits | Medium |
| CRUD-004 | Create space modal closes on success | Complete creation | Modal closes, toast shown | High |
| CRUD-005 | Create space modal Cancel button | Click Cancel | Modal closes, no changes | High |
| CRUD-006 | Create space modal Escape key | Press Escape | Modal closes | Medium |
| CRUD-007 | Create space modal click outside | Click backdrop | Modal closes (if configured) | Low |
| CRUD-008 | Create space shows loading state | Submit form | Spinner/disabled button | High |
| CRUD-009 | Create space error handling | API returns 500 | Error toast, form re-enabled | Critical |
| CRUD-010 | Create space optimistic update | Submit form | Appears in list immediately | Medium |

## 5.2 Read Flow Tests

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| CRUD-011 | View space list on load | Navigate to /spaces | Spaces load and display | Critical |
| CRUD-012 | View space list loading state | Initial load | Skeleton/spinner shown | High |
| CRUD-013 | View space list empty state | No spaces exist | Empty state message | High |
| CRUD-014 | View space list error state | API fails | Error message shown | Critical |
| CRUD-015 | View space details | Click space card | Navigate to space detail | Critical |
| CRUD-016 | View space details loading | Navigate to space | Loading state | High |
| CRUD-017 | View space details 404 | Navigate to invalid ID | 404 page | Critical |
| CRUD-018 | View space details 403 | Navigate to forbidden | Access denied page | Critical |
| CRUD-019 | Pagination load more | Scroll/click next | More spaces load | High |
| CRUD-020 | Search filters results | Type in search | List updates | High |

## 5.3 Update Flow Tests

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| CRUD-021 | Edit space via settings | Go to Settings > Details | Form pre-filled | Critical |
| CRUD-022 | Edit space inline (name) | Click name, edit, blur | Saved automatically | Medium |
| CRUD-023 | Edit space inline (description) | Click description, edit | Saved automatically | Medium |
| CRUD-024 | Edit space form validation | Clear required field | Validation error | Critical |
| CRUD-025 | Edit space dirty state | Make changes | "Unsaved changes" warning | High |
| CRUD-026 | Edit space navigate away | Change, navigate | Confirmation dialog | High |
| CRUD-027 | Edit space concurrent edit | Two users edit | Conflict resolution/last wins | Medium |
| CRUD-028 | Edit space shows saving state | Click Save | Loading indicator | High |
| CRUD-029 | Edit space optimistic update | Save changes | UI updates immediately | Medium |
| CRUD-030 | Edit space rollback on error | API fails | Revert changes, show error | Critical |

## 5.4 Delete Flow Tests

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| CRUD-031 | Delete space shows confirmation | Click Delete | Confirmation modal | Critical |
| CRUD-032 | Delete space requires type name | Confirm modal | Must type space name | High |
| CRUD-033 | Delete space soft delete | Confirm deletion | Status → archived | Critical |
| CRUD-034 | Delete space removes from list | Confirm deletion | Disappears from UI | Critical |
| CRUD-035 | Delete space undo (archive) | Click undo in toast | Space restored | Medium |
| CRUD-036 | Archive space flow | Click Archive | Confirmation, archived | High |
| CRUD-037 | Restore archived space | Admin restores | Space active again | High |
| CRUD-038 | Permanent delete (admin) | Delete from trash | Gone forever | Critical |
| CRUD-039 | Bulk delete spaces | Select multiple, delete | All archived | Medium |
| CRUD-040 | Delete space cascade | Delete with items | Items also archived | Critical |

---

# 6. UI COMPONENT TESTS

## 6.1 SpaceCard Component

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI-001 | Renders space name | Name displayed | Critical |
| UI-002 | Renders space key badge | Key badge visible | High |
| UI-003 | Renders space type icon | Correct icon for type | High |
| UI-004 | Renders avatar with initials | Initials or icon | High |
| UI-005 | Renders member count | "X members" text | Medium |
| UI-006 | Renders status indicator | Active/Archived badge | High |
| UI-007 | Click navigates to space | Correct route | Critical |
| UI-008 | Hover shows actions | Edit/Delete buttons | High |
| UI-009 | Keyboard accessible | Tab focuses, Enter clicks | High |
| UI-010 | Long name truncates | Ellipsis on overflow | Medium |

## 6.2 SpacesSidebar Component

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI-011 | Renders all user's spaces | Complete list | Critical |
| UI-012 | Collapsible sections | Click to expand/collapse | High |
| UI-013 | Active space highlighted | Current space styled | High |
| UI-014 | Quick actions visible | +, search icons | High |
| UI-015 | Drag to reorder spaces | Order updates | Medium |
| UI-016 | Favorites section | Starred spaces at top | Medium |
| UI-017 | Recent section | Last visited spaces | Medium |
| UI-018 | Sidebar collapse toggle | Full → icon only | High |
| UI-019 | Keyboard navigation | Arrow keys work | High |
| UI-020 | Search filters sidebar | Type to filter | High |

## 6.3 SpacesMegaMenu Component

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI-021 | Opens on click | Menu appears | Critical |
| UI-022 | Closes on click outside | Menu disappears | High |
| UI-023 | Closes on Escape | Menu disappears | High |
| UI-024 | Shows recent spaces | Last 5 visited | High |
| UI-025 | Shows all spaces link | Link to /spaces | High |
| UI-026 | Create space shortcut | Opens create modal | High |
| UI-027 | Search in menu | Filters spaces | High |
| UI-028 | Keyboard navigation | Arrow keys, Enter | High |
| UI-029 | Shows space icons/colors | Visual indicators | Medium |
| UI-030 | Loading state | Skeleton while loading | Medium |

## 6.4 Modal Components

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI-031 | Modal opens with animation | Fade/slide in | Medium |
| UI-032 | Modal backdrop clicks close | Closes (if allowed) | High |
| UI-033 | Modal Escape key closes | Closes (if allowed) | High |
| UI-034 | Modal focus trapped | Tab stays in modal | Critical |
| UI-035 | Modal initial focus | First input focused | High |
| UI-036 | Modal scroll locked | Body doesn't scroll | High |
| UI-037 | Modal responsive | Mobile-friendly | High |
| UI-038 | Modal max-height scroll | Content scrolls | Medium |
| UI-039 | Modal form validation | Errors displayed | Critical |
| UI-040 | Modal loading state | Disabled during submit | High |

## 6.5 SpaceBoard (Kanban) Component

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI-041 | Renders all columns | To Do, In Progress, Done | Critical |
| UI-042 | Renders items in columns | Cards in correct column | Critical |
| UI-043 | Drag item between columns | Item moves, status updates | Critical |
| UI-044 | Drag item within column | Reorder works | High |
| UI-045 | Column collapse toggle | Hide/show column items | Medium |
| UI-046 | Column item count | Shows count in header | High |
| UI-047 | Add item to column | + button works | High |
| UI-048 | Quick edit item | Click to edit inline | High |
| UI-049 | Keyboard drag support | Alt+Arrow keys | Medium |
| UI-050 | Touch drag support | Mobile drag works | High |

## 6.6 SpaceTimeline Component

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI-051 | Renders timeline bars | Items shown as bars | Critical |
| UI-052 | Correct date positioning | Dates align to scale | Critical |
| UI-053 | Zoom in/out | Scale changes | High |
| UI-054 | Scroll horizontal | Navigate timeline | Critical |
| UI-055 | Today indicator | Line showing today | High |
| UI-056 | Drag to resize item | Dates update | High |
| UI-057 | Drag to move item | Dates shift | High |
| UI-058 | Hover shows tooltip | Item details | High |
| UI-059 | Click opens item | Item modal/panel | High |
| UI-060 | Filter by assignee | Shows filtered items | Medium |

## 6.7 Settings Tabs Components

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UI-061 | Tab navigation works | Correct tab active | Critical |
| UI-062 | Tab content loads | Form displayed | Critical |
| UI-063 | Tab URL sync | URL updates with tab | High |
| UI-064 | Tab keyboard nav | Arrow keys switch | High |
| UI-065 | Details tab form | All fields editable | Critical |
| UI-066 | Access tab members list | Shows all members | Critical |
| UI-067 | Features tab toggles | All toggles work | High |
| UI-068 | Components tab CRUD | Add/edit/delete | High |
| UI-069 | Versions tab CRUD | Add/edit/delete | High |
| UI-070 | Permissions matrix | Checkboxes update | High |

---

# 7. NAVIGATION & ROUTING TESTS

## 7.1 Route Tests

| Test ID | Route | Expected Component | Auth Required | Priority |
|---------|-------|-------------------|---------------|----------|
| NAV-001 | `/spaces` | SpacesDirectory | Yes | Critical |
| NAV-002 | `/spaces/create` | CreateSpaceModal | Yes | High |
| NAV-003 | `/spaces/:id` | SpaceSummary | Yes | Critical |
| NAV-004 | `/spaces/:id/board` | SpaceBoard | Yes | Critical |
| NAV-005 | `/spaces/:id/backlog` | SpaceBacklog | Yes | Critical |
| NAV-006 | `/spaces/:id/timeline` | SpaceTimeline | Yes | Critical |
| NAV-007 | `/spaces/:id/settings` | SpaceSettings | Yes (Lead+) | Critical |
| NAV-008 | `/spaces/:id/settings/access` | AccessTab | Yes (Lead+) | High |
| NAV-009 | `/admin/spaces` | AdminSpaces | Yes (Admin) | Critical |
| NAV-010 | `/admin/spaces/archived` | ArchivedSpaces | Yes (Admin) | High |
| NAV-011 | `/admin/spaces/trash` | TrashSpaces | Yes (Admin) | High |

## 7.2 Navigation Flow Tests

| Test ID | Test Case | Steps | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| NAV-012 | Breadcrumb navigation | Click breadcrumb | Navigate to that level | High |
| NAV-013 | Back button | Click back | Previous route | High |
| NAV-014 | Deep link sharing | Open /spaces/id directly | Load correct space | Critical |
| NAV-015 | 404 for invalid space | /spaces/invalid-id | 404 page | Critical |
| NAV-016 | Redirect unauthorized | /admin (non-admin) | Redirect to /spaces | Critical |
| NAV-017 | Redirect unauthenticated | Any protected route | Redirect to /login | Critical |
| NAV-018 | Preserve scroll position | Navigate away and back | Same scroll position | Medium |
| NAV-019 | Sub-route tabs | /spaces/id/board → /backlog | Tab switches, content loads | High |
| NAV-020 | Query params preserved | Filter, paginate, navigate back | Filters maintained | Medium |

## 7.3 Redirect Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| NAV-021 | Login redirects to original URL | After login, go to requested page | High |
| NAV-022 | Deleted space redirects | Navigate to deleted space | 404 or redirect to /spaces | High |
| NAV-023 | Archived space accessible | Navigate to archived | View-only mode | Medium |
| NAV-024 | Settings redirect for viewer | Viewer tries /settings | Redirect to summary | High |

---

# 8. FORM VALIDATION TESTS

## 8.1 Space Creation Form

| Test ID | Field | Input | Expected Validation | Priority |
|---------|-------|-------|---------------------|----------|
| VAL-001 | name | Empty | "Name is required" | Critical |
| VAL-002 | name | "ab" | "Minimum 3 characters" | High |
| VAL-003 | name | 256 chars | "Maximum 255 characters" | High |
| VAL-004 | name | "  " (whitespace) | "Name is required" (after trim) | High |
| VAL-005 | key | Empty | "Key is required" | Critical |
| VAL-006 | key | "A" | "Minimum 2 characters" | High |
| VAL-007 | key | "ABCDEFGHIJK" | "Maximum 10 characters" | High |
| VAL-008 | key | "abc" | Auto-uppercase to "ABC" | Medium |
| VAL-009 | key | "AB-C" | "Only alphanumeric allowed" | High |
| VAL-010 | key | "AB C" | "No spaces allowed" | High |
| VAL-011 | key | Existing key | "Key already exists" | Critical |
| VAL-012 | type | Not selected | "Type is required" | High |
| VAL-013 | description | 1001 chars | "Maximum 1000 characters" | Medium |

## 8.2 Member Addition Form

| Test ID | Field | Input | Expected Validation | Priority |
|---------|-------|-------|---------------------|----------|
| VAL-014 | user_id | Not selected | "User is required" | Critical |
| VAL-015 | user_id | Already member | "User is already a member" | High |
| VAL-016 | role | Not selected | "Role is required" | Critical |
| VAL-017 | role | Invalid value | "Invalid role" | High |

## 8.3 Version Form

| Test ID | Field | Input | Expected Validation | Priority |
|---------|-------|-------|---------------------|----------|
| VAL-018 | name | Empty | "Name is required" | Critical |
| VAL-019 | name | Duplicate | "Version name exists" | High |
| VAL-020 | start_date | Empty | "Start date required" | High |
| VAL-021 | end_date | Before start | "End must be after start" | Critical |
| VAL-022 | end_date | Same as start | Valid (single day) | Medium |

## 8.4 Component Form

| Test ID | Field | Input | Expected Validation | Priority |
|---------|-------|-------|---------------------|----------|
| VAL-023 | name | Empty | "Name is required" | Critical |
| VAL-024 | name | Duplicate | "Component name exists" | High |
| VAL-025 | lead_id | Invalid user | "Invalid user" | High |

## 8.5 Real-time Validation

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| VAL-026 | Validate on blur | Error shows when leaving field | High |
| VAL-027 | Validate on change (after first submit) | Real-time feedback | High |
| VAL-028 | Clear error on valid input | Error disappears | High |
| VAL-029 | Debounced async validation (key uniqueness) | Check after 300ms pause | Medium |
| VAL-030 | Form-level error summary | All errors listed | Medium |

---

# 9. STATE MANAGEMENT TESTS

## 9.1 Zustand Store Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| STATE-001 | Initial state correct | Default values set | Critical |
| STATE-002 | setCurrentSpace updates state | Space ID stored | Critical |
| STATE-003 | setSidebarOpen toggles | Boolean toggles | High |
| STATE-004 | setView updates view | View type stored | High |
| STATE-005 | State persists across components | Same state everywhere | Critical |
| STATE-006 | State resets on logout | Cleared to default | Critical |
| STATE-007 | Multiple tabs sync (if using persist) | State synchronized | Medium |
| STATE-008 | Devtools integration | State visible in devtools | Low |

## 9.2 React Query Cache Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| STATE-009 | Space fetched once | Single request | Critical |
| STATE-010 | Space cached after fetch | No re-fetch on remount | Critical |
| STATE-011 | Cache invalidation on mutation | Refetches after update | Critical |
| STATE-012 | Stale time respected | No refetch within window | High |
| STATE-013 | Background refetch on focus | Data freshness | Medium |
| STATE-014 | Cache survives navigation | Data still there | High |
| STATE-015 | Mutation optimistic update | UI updates before API | Medium |
| STATE-016 | Mutation rollback on error | Reverts to previous | Critical |
| STATE-017 | Prefetch on hover | Data ready on click | Medium |
| STATE-018 | Infinite query pagination | Pages accumulate | High |

## 9.3 State Synchronization

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| STATE-019 | URL state sync (filters) | URL reflects filters | High |
| STATE-020 | URL state restored on load | Filters from URL | High |
| STATE-021 | Local storage persistence | Sidebar state persists | Medium |
| STATE-022 | Form state preserved | Unsaved changes kept | High |
| STATE-023 | Modal state cleanup | State cleared on close | High |

---

# 10. DRAG & DROP TESTS

## 10.1 Kanban Board DnD

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DND-001 | Drag item shows preview | Ghost/preview visible | High |
| DND-002 | Drop zones highlight | Valid targets indicated | High |
| DND-003 | Drop between columns | Item moves, API called | Critical |
| DND-004 | Drop within column | Reorder works | High |
| DND-005 | Drop invalid location | Returns to original | High |
| DND-006 | Multiple rapid drags | No race conditions | High |
| DND-007 | Drag scroll | Auto-scroll when at edge | Medium |
| DND-008 | Touch drag support | Works on mobile | High |
| DND-009 | Keyboard drag (a11y) | Alt+Arrow works | High |
| DND-010 | Drag cancelled (Escape) | Item returns | High |

## 10.2 Backlog DnD

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DND-011 | Drag to reorder | Priority updates | Critical |
| DND-012 | Drag to sprint | Item assigned to sprint | High |
| DND-013 | Multi-select drag | Multiple items move | Medium |
| DND-014 | Undo reorder | Previous order restored | Medium |

## 10.3 Sidebar DnD

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DND-015 | Reorder spaces | Order persists | Medium |
| DND-016 | Star/unstar via drag | Drop to favorites | Low |

## 10.4 DnD Edge Cases

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DND-017 | Drag while loading | Prevents or handles | High |
| DND-018 | Drag after permission loss | Error handled | High |
| DND-019 | Concurrent drag (two users) | Conflict resolved | Medium |
| DND-020 | Network fails during drag | Reverts with error | Critical |

---

# 11. REAL-TIME & SYNC TESTS

## 11.1 Supabase Realtime Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| RT-001 | Subscribe to space changes | Connection established | High |
| RT-002 | Receive INSERT event | New item appears | High |
| RT-003 | Receive UPDATE event | Item updates | High |
| RT-004 | Receive DELETE event | Item disappears | High |
| RT-005 | Reconnect after disconnect | Auto-reconnects | Critical |
| RT-006 | Unsubscribe on unmount | No memory leak | High |
| RT-007 | Multiple subscriptions | All work | High |
| RT-008 | Filter by space_id | Only relevant events | High |

## 11.2 Concurrent Edit Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| RT-009 | Two users edit same item | Last write wins or conflict UI | High |
| RT-010 | User sees other's changes | Real-time update | High |
| RT-011 | Optimistic update + real event | No duplicate | High |
| RT-012 | Edit while offline | Queues, syncs on reconnect | Medium |

## 11.3 Presence Tests (if implemented)

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| RT-013 | Show who's viewing space | Avatar indicators | Low |
| RT-014 | Show who's editing item | "Editing" indicator | Low |
| RT-015 | Presence cleanup on disconnect | Removes after timeout | Low |

---

# 12. PERFORMANCE & LOAD TESTS

## 12.1 Frontend Performance

| Test ID | Test Case | Target | Priority |
|---------|-----------|--------|----------|
| PERF-001 | Initial page load (Lighthouse) | LCP < 2.5s | Critical |
| PERF-002 | First Contentful Paint | FCP < 1.5s | Critical |
| PERF-003 | Time to Interactive | TTI < 3.5s | Critical |
| PERF-004 | Cumulative Layout Shift | CLS < 0.1 | High |
| PERF-005 | Total Blocking Time | TBT < 200ms | High |
| PERF-006 | Bundle size (gzipped) | < 250KB JS | High |
| PERF-007 | Image optimization | WebP, lazy loaded | Medium |
| PERF-008 | Memory usage | < 100MB heap | High |
| PERF-009 | No memory leaks | Stable over time | Critical |
| PERF-010 | 60fps scroll/animation | No jank | High |

## 12.2 API Performance

| Test ID | Test Case | Target | Priority |
|---------|-----------|--------|----------|
| PERF-011 | GET /spaces (10 items) | < 100ms | Critical |
| PERF-012 | GET /spaces (100 items) | < 300ms | High |
| PERF-013 | GET /spaces/:id | < 50ms | Critical |
| PERF-014 | POST /spaces (create) | < 200ms | High |
| PERF-015 | PUT /spaces (update) | < 150ms | High |
| PERF-016 | DELETE /spaces | < 100ms | High |
| PERF-017 | Search /spaces?q= | < 200ms | High |
| PERF-018 | Complex filter query | < 500ms | Medium |

## 12.3 Load Tests (k6)

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '3m', target: 50 },   // Sustain
    { duration: '1m', target: 100 },  // Peak
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api.catalyst.gov.sa/spaces');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

| Test ID | Test Case | Target | Priority |
|---------|-----------|--------|----------|
| LOAD-001 | 50 concurrent users | p95 < 500ms | Critical |
| LOAD-002 | 100 concurrent users | p95 < 1000ms | High |
| LOAD-003 | 1000 requests/minute | No errors | High |
| LOAD-004 | Sustained load 1 hour | Stable response | High |
| LOAD-005 | Spike test (0→200 users) | Graceful handling | Medium |
| LOAD-006 | Stress test (find limit) | Document breaking point | Medium |

## 12.4 Database Performance

| Test ID | Test Case | Target | Priority |
|---------|-----------|--------|----------|
| PERF-019 | Query 10,000 spaces | < 1s | High |
| PERF-020 | Join spaces + members | < 200ms | High |
| PERF-021 | Activity log query (1M rows) | < 500ms | Medium |
| PERF-022 | Connection pool under load | No exhaustion | Critical |

---

# 13. SECURITY PENETRATION TESTS

## 13.1 Authentication Attacks

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SEC-001 | Brute force login | Rate limited after 5 attempts | Critical |
| SEC-002 | Token replay attack | Rejected (if expired) | Critical |
| SEC-003 | Token tampering | Invalid signature rejected | Critical |
| SEC-004 | Session fixation | New session on login | High |
| SEC-005 | JWT none algorithm | Rejected | Critical |
| SEC-006 | Weak password accepted | Policy enforced | High |

## 13.2 Authorization Attacks

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SEC-007 | IDOR - Access other's space by ID | 403 Forbidden | Critical |
| SEC-008 | IDOR - Modify other's space | 403 Forbidden | Critical |
| SEC-009 | Privilege escalation (member→admin) | Denied | Critical |
| SEC-010 | Forceful browsing to admin | Redirect/deny | Critical |
| SEC-011 | API without auth header | 401 | Critical |
| SEC-012 | API with other user's token | 403 for private resources | Critical |

## 13.3 Injection Attacks

| Test ID | Test Case | Payload | Expected Result | Priority |
|---------|-----------|---------|-----------------|----------|
| SEC-013 | SQL Injection (name) | `'; DROP TABLE spaces;--` | Escaped, no injection | Critical |
| SEC-014 | SQL Injection (search) | `" OR 1=1--` | No data leak | Critical |
| SEC-015 | XSS Stored (name) | `<script>alert(1)</script>` | Sanitized | Critical |
| SEC-016 | XSS Reflected (search) | `<img onerror=alert(1)>` | Escaped | Critical |
| SEC-017 | NoSQL Injection | `{$gt: ""}` | No effect | High |
| SEC-018 | Command Injection | `; rm -rf /` | No execution | Critical |
| SEC-019 | LDAP Injection | `*)(uid=*))(|(uid=*` | No effect | Medium |
| SEC-020 | XML/XXE | `<!ENTITY xxe SYSTEM "file:///etc/passwd">` | No effect | High |

## 13.4 CSRF & CORS

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SEC-021 | CSRF token required | 403 without token | Critical |
| SEC-022 | Cross-origin request blocked | CORS error | Critical |
| SEC-023 | Allowed origins only | Specific domains only | High |
| SEC-024 | Credentials mode handling | Proper SameSite cookies | High |

## 13.5 Data Exposure

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SEC-025 | Sensitive data in logs | No passwords/tokens | Critical |
| SEC-026 | Error messages expose internals | Generic errors only | High |
| SEC-027 | API returns extra fields | Only requested fields | High |
| SEC-028 | Source maps in production | Disabled | Medium |
| SEC-029 | Debug endpoints accessible | Disabled/protected | Critical |

## 13.6 Rate Limiting

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SEC-030 | API rate limit | 429 after threshold | High |
| SEC-031 | Login rate limit | 429 after 5 failures | Critical |
| SEC-032 | Search rate limit | 429 after threshold | Medium |
| SEC-033 | File upload limit | Size/count limits enforced | High |

---

# 14. ACCESSIBILITY (a11y) TESTS

## 14.1 WCAG 2.1 AA Compliance

| Test ID | Test Case | WCAG Criteria | Expected Result | Priority |
|---------|-----------|---------------|-----------------|----------|
| A11Y-001 | Color contrast (text) | 1.4.3 | Ratio ≥ 4.5:1 | Critical |
| A11Y-002 | Color contrast (large text) | 1.4.3 | Ratio ≥ 3:1 | Critical |
| A11Y-003 | Color contrast (UI) | 1.4.11 | Ratio ≥ 3:1 | High |
| A11Y-004 | Focus visible | 2.4.7 | Clear focus indicator | Critical |
| A11Y-005 | Focus order | 2.4.3 | Logical tab order | High |
| A11Y-006 | Keyboard accessible | 2.1.1 | All actions via keyboard | Critical |
| A11Y-007 | No keyboard trap | 2.1.2 | Can escape all elements | Critical |
| A11Y-008 | Skip navigation link | 2.4.1 | Skip to main content | Medium |
| A11Y-009 | Page titles | 2.4.2 | Descriptive titles | High |
| A11Y-010 | Link purpose | 2.4.4 | Clear link text | High |
| A11Y-011 | Labels for inputs | 1.3.1, 4.1.2 | All inputs labeled | Critical |
| A11Y-012 | Error identification | 3.3.1 | Errors described | Critical |
| A11Y-013 | Headings hierarchy | 1.3.1 | Proper h1-h6 order | High |
| A11Y-014 | Alt text for images | 1.1.1 | Meaningful alt text | Critical |
| A11Y-015 | ARIA labels | 4.1.2 | Correct ARIA usage | High |
| A11Y-016 | ARIA live regions | 4.1.3 | Dynamic content announced | High |
| A11Y-017 | Form error suggestions | 3.3.3 | Helpful error messages | Medium |
| A11Y-018 | Consistent navigation | 3.2.3 | Same nav position | Medium |
| A11Y-019 | Text resize 200% | 1.4.4 | No content loss | High |
| A11Y-020 | Reflow 320px | 1.4.10 | No horizontal scroll | High |

## 14.2 Screen Reader Tests

| Test ID | Test Case | Screen Reader | Expected Result | Priority |
|---------|-----------|---------------|-----------------|----------|
| A11Y-021 | Page structure announced | VoiceOver | Landmarks identified | High |
| A11Y-022 | Form labels read | NVDA | All labels spoken | Critical |
| A11Y-023 | Error messages announced | JAWS | Errors read aloud | Critical |
| A11Y-024 | Modal announced | VoiceOver | "Dialog" announced | High |
| A11Y-025 | Table structure | NVDA | Rows/cols navigable | High |
| A11Y-026 | Dynamic content | JAWS | Live regions work | High |
| A11Y-027 | Button states | VoiceOver | Pressed/expanded states | High |
| A11Y-028 | Loading states | NVDA | "Loading" announced | Medium |

## 14.3 Component-Specific a11y

| Test ID | Component | Test Case | Expected Result | Priority |
|---------|-----------|-----------|-----------------|----------|
| A11Y-029 | Modal | Focus trapped | Tab stays in modal | Critical |
| A11Y-030 | Modal | Escape closes | Keyboard dismissable | High |
| A11Y-031 | Modal | Role=dialog | Correct ARIA role | High |
| A11Y-032 | Dropdown | Arrow key nav | Up/Down works | High |
| A11Y-033 | Dropdown | Type to select | First letter jumps | Medium |
| A11Y-034 | Tabs | Arrow key nav | Left/Right works | High |
| A11Y-035 | Tabs | ARIA selected | Correct state | High |
| A11Y-036 | Kanban | Keyboard drag | Alt+Arrow works | High |
| A11Y-037 | Toast | Auto-announce | polite/assertive | High |
| A11Y-038 | Toast | Dismissable | Keyboard dismiss | Medium |

## 14.4 axe-core Automated Tests

```javascript
// Playwright + axe-core test
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Spaces page accessibility', async ({ page }) => {
  await page.goto('/spaces');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

---

# 15. EDGE CASES & BOUNDARY TESTS

## 15.1 Data Boundary Tests

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| EDGE-001 | Empty spaces list | 0 spaces | Empty state shown | High |
| EDGE-002 | Single space | 1 space | No pagination | Medium |
| EDGE-003 | Exactly page size | 10 spaces, limit=10 | Single page, no "next" | Medium |
| EDGE-004 | Page size + 1 | 11 spaces, limit=10 | Pagination shown | High |
| EDGE-005 | 10,000 spaces | Large dataset | Pagination works | High |
| EDGE-006 | Unicode in name | "Проект Тест 测试" | Correctly displayed | High |
| EDGE-007 | Emoji in name | "🚀 Space" | Correctly displayed | Medium |
| EDGE-008 | RTL text | Arabic/Hebrew names | Correct alignment | High |
| EDGE-009 | Max length name | 255 chars | Truncated in UI | Medium |
| EDGE-010 | Zero members | Space with no members | Shows owner only | High |
| EDGE-011 | 1000 members | Large team | Virtualized list | Medium |
| EDGE-012 | Deeply nested components | 10 levels | Handles gracefully | Low |

## 15.2 Timing Edge Cases

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| EDGE-013 | Very slow API (5s) | Loading state persists | High |
| EDGE-014 | API timeout (30s) | Timeout error shown | High |
| EDGE-015 | Double-click submit | Only one request | Critical |
| EDGE-016 | Rapid navigation | No race conditions | High |
| EDGE-017 | Stale data after long idle | Refetches on focus | Medium |
| EDGE-018 | Clock skew (future dates) | Handled gracefully | Low |
| EDGE-019 | Session expires mid-action | Redirect to login | Critical |

## 15.3 State Edge Cases

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| EDGE-020 | Navigate to deleted space | 404 or redirect | High |
| EDGE-021 | Permission revoked mid-session | 403 on next action | High |
| EDGE-022 | Space archived while viewing | Read-only notice | Medium |
| EDGE-023 | Owner leaves space | Cannot (must transfer) | High |
| EDGE-024 | Last admin removed | Cannot (must remain one) | High |
| EDGE-025 | Circular component lead | Handled or prevented | Low |

## 15.4 Network Edge Cases

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| EDGE-026 | Offline mode | Offline indicator, cached data | High |
| EDGE-027 | Intermittent connectivity | Retry with backoff | High |
| EDGE-028 | Request cancelled (navigate away) | No orphan requests | Medium |
| EDGE-029 | Duplicate request prevention | Deduped | High |
| EDGE-030 | Large response (10MB) | Handled/paginated | Medium |

---

# 16. ERROR HANDLING TESTS

## 16.1 API Error Responses

| Test ID | Status Code | Scenario | Expected UI Behavior | Priority |
|---------|-------------|----------|---------------------|----------|
| ERR-001 | 400 | Invalid request | Field-level errors | Critical |
| ERR-002 | 401 | Unauthorized | Redirect to login | Critical |
| ERR-003 | 403 | Forbidden | Access denied page | Critical |
| ERR-004 | 404 | Not found | 404 page | Critical |
| ERR-005 | 409 | Conflict (duplicate) | Specific error message | High |
| ERR-006 | 422 | Validation error | Form errors shown | High |
| ERR-007 | 429 | Rate limited | Retry later message | High |
| ERR-008 | 500 | Server error | Generic error, retry option | Critical |
| ERR-009 | 502 | Bad gateway | Retry message | High |
| ERR-010 | 503 | Service unavailable | Maintenance message | High |

## 16.2 Network Error Handling

| Test ID | Error Type | Expected Result | Priority |
|---------|------------|-----------------|----------|
| ERR-011 | Network offline | Offline indicator | Critical |
| ERR-012 | DNS failure | Connection error | High |
| ERR-013 | Connection timeout | Timeout error | High |
| ERR-014 | Connection reset | Retry option | High |
| ERR-015 | SSL error | Security warning | Critical |

## 16.3 Client-Side Error Handling

| Test ID | Error Type | Expected Result | Priority |
|---------|------------|-----------------|----------|
| ERR-016 | React error boundary | Fallback UI | Critical |
| ERR-017 | Unhandled promise rejection | Logged, no crash | High |
| ERR-018 | JSON parse error | Graceful handling | High |
| ERR-019 | State corruption | Reset option | Medium |
| ERR-020 | Chunk load failure | Refresh prompt | High |

## 16.4 Error Recovery

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| ERR-021 | Retry failed request | Retry button works | High |
| ERR-022 | Clear error state | Dismissable errors | High |
| ERR-023 | Recover from 401 | Refresh token, retry | High |
| ERR-024 | Rollback failed mutation | Previous state restored | Critical |
| ERR-025 | Error logging | Sent to error service | High |

---

# 17. CROSS-BROWSER & DEVICE TESTS

## 17.1 Browser Compatibility

| Test ID | Browser | Version | Test Areas | Priority |
|---------|---------|---------|------------|----------|
| BROWSER-001 | Chrome | Latest | Full functionality | Critical |
| BROWSER-002 | Chrome | Latest-1 | Full functionality | High |
| BROWSER-003 | Firefox | Latest | Full functionality | Critical |
| BROWSER-004 | Safari | Latest | Full functionality | Critical |
| BROWSER-005 | Safari | iOS 15+ | Touch, mobile | Critical |
| BROWSER-006 | Edge | Latest | Full functionality | High |
| BROWSER-007 | Samsung Internet | Latest | Mobile functionality | Medium |

## 17.2 Device Tests

| Test ID | Device | Screen Size | Test Areas | Priority |
|---------|--------|-------------|------------|----------|
| DEVICE-001 | Desktop | 1920x1080 | Full layout | Critical |
| DEVICE-002 | Desktop | 1366x768 | Common laptop | High |
| DEVICE-003 | Desktop | 2560x1440 | Large monitor | Medium |
| DEVICE-004 | Tablet | 768x1024 | iPad portrait | High |
| DEVICE-005 | Tablet | 1024x768 | iPad landscape | High |
| DEVICE-006 | Mobile | 375x667 | iPhone SE | Critical |
| DEVICE-007 | Mobile | 390x844 | iPhone 12/13 | Critical |
| DEVICE-008 | Mobile | 360x800 | Android common | High |
| DEVICE-009 | Mobile | 320x568 | Small phone | Medium |

## 17.3 Responsive Breakpoint Tests

| Test ID | Breakpoint | Test Case | Expected Result | Priority |
|---------|------------|-----------|-----------------|----------|
| RESP-001 | < 640px | Mobile nav | Hamburger menu | Critical |
| RESP-002 | < 640px | Sidebar | Hidden/overlay | Critical |
| RESP-003 | < 768px | Cards grid | Single column | High |
| RESP-004 | 768-1024px | Cards grid | 2 columns | High |
| RESP-005 | > 1024px | Cards grid | 3+ columns | High |
| RESP-006 | < 640px | Table | Horizontal scroll | High |
| RESP-007 | < 640px | Kanban | Single column view | High |
| RESP-008 | All | Text readability | Proper sizing | High |

## 17.4 Touch Interaction Tests

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| TOUCH-001 | Tap to select | Works | Critical |
| TOUCH-002 | Long press for context | Menu appears | Medium |
| TOUCH-003 | Swipe to navigate | Works (if implemented) | Medium |
| TOUCH-004 | Pinch to zoom | Handled appropriately | Low |
| TOUCH-005 | Pull to refresh | Works (if implemented) | Medium |
| TOUCH-006 | Touch drag & drop | Works | High |

---

# 18. LOCALIZATION (i18n) TESTS

## 18.1 Arabic (RTL) Support

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| I18N-001 | Text direction | RTL for Arabic | Critical |
| I18N-002 | Layout mirroring | Sidebar on right | Critical |
| I18N-003 | Icon mirroring | Arrows flipped | High |
| I18N-004 | Number formatting | Arabic numerals option | Medium |
| I18N-005 | Date formatting | Hijri calendar option | Medium |
| I18N-006 | Form alignment | Labels right-aligned | High |
| I18N-007 | Bidirectional text | Mixed AR/EN handled | High |
| I18N-008 | Scrollbar position | Left side in RTL | Medium |

## 18.2 Translation Coverage

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| I18N-009 | All static strings translated | No English in AR mode | Critical |
| I18N-010 | Error messages translated | AR errors | High |
| I18N-011 | Validation messages translated | AR validation | High |
| I18N-012 | Date/time localized | AR format | High |
| I18N-013 | Placeholders translated | AR placeholders | Medium |
| I18N-014 | ARIA labels translated | AR accessibility | High |

## 18.3 Language Switching

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| I18N-015 | Switch EN → AR | Full UI updates | Critical |
| I18N-016 | Switch AR → EN | Full UI updates | Critical |
| I18N-017 | Preserve language preference | Persists on reload | High |
| I18N-018 | URL-based language | /ar/spaces, /en/spaces | Medium |

---

# 19. INTEGRATION TESTS

## 19.1 End-to-End User Flows

### Flow 1: Space Creation & Setup

```typescript
test('Complete space setup flow', async ({ page }) => {
  // 1. Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  // 2. Navigate to spaces
  await page.waitForURL('/spaces');
  
  // 3. Create space
  await page.click('button:has-text("Create Space")');
  await page.fill('[name="name"]', 'Integration Test Space');
  await page.fill('[name="key"]', 'ITS');
  await page.selectOption('[name="type"]', 'scrum');
  await page.click('button:has-text("Create")');
  
  // 4. Verify creation
  await expect(page).toHaveURL(/\/spaces\/[\w-]+/);
  await expect(page.locator('h1')).toContainText('Integration Test Space');
  
  // 5. Add member
  await page.click('a:has-text("Settings")');
  await page.click('button:has-text("Add Member")');
  await page.fill('[name="user"]', 'member@example.com');
  await page.selectOption('[name="role"]', 'member');
  await page.click('button:has-text("Add")');
  
  // 6. Create component
  await page.click('a:has-text("Components")');
  await page.click('button:has-text("Add Component")');
  await page.fill('[name="name"]', 'Frontend');
  await page.click('button:has-text("Create")');
  
  // 7. Create version
  await page.click('a:has-text("Versions")');
  await page.click('button:has-text("Add Version")');
  await page.fill('[name="name"]', 'v1.0.0');
  await page.click('button:has-text("Create")');
  
  // 8. Cleanup
  await page.click('button:has-text("Delete Space")');
  await page.fill('[name="confirm"]', 'Integration Test Space');
  await page.click('button:has-text("Delete Permanently")');
});
```

### Flow 2: Board Workflow

```typescript
test('Kanban board workflow', async ({ page }) => {
  await loginAs(page, 'owner');
  await page.goto('/spaces/test-space-1/board');
  
  // Create item
  await page.click('[data-column="todo"] button:has-text("Add")');
  await page.fill('[name="title"]', 'Test Task');
  await page.click('button:has-text("Create")');
  
  // Drag to In Progress
  const task = page.locator('[data-item="Test Task"]');
  const inProgress = page.locator('[data-column="in-progress"]');
  await task.dragTo(inProgress);
  
  // Verify status changed
  await expect(task).toBeInViewport({ root: inProgress });
});
```

### Flow 3: Admin Workflow

```typescript
test('Admin space management', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/spaces');
  
  // View all spaces
  await expect(page.locator('table tbody tr')).toHaveCount.greaterThan(0);
  
  // Archive a space
  await page.click('tr:has-text("Test Space") button:has-text("Archive")');
  await page.click('button:has-text("Confirm")');
  
  // Verify in archived
  await page.goto('/admin/spaces/archived');
  await expect(page.locator('tr:has-text("Test Space")')).toBeVisible();
  
  // Restore
  await page.click('tr:has-text("Test Space") button:has-text("Restore")');
  
  // Verify active again
  await page.goto('/admin/spaces');
  await expect(page.locator('tr:has-text("Test Space")')).toBeVisible();
});
```

## 19.2 Integration Test Cases

| Test ID | Flow | Test Case | Priority |
|---------|------|-----------|----------|
| INT-001 | Auth | Login → Access spaces → Logout | Critical |
| INT-002 | CRUD | Create → Read → Update → Delete space | Critical |
| INT-003 | Members | Add → Change role → Remove member | Critical |
| INT-004 | Board | Create item → Drag → Complete | Critical |
| INT-005 | Search | Filter → Sort → Paginate | High |
| INT-006 | Settings | Change all settings tabs | High |
| INT-007 | Admin | Full admin panel flow | High |
| INT-008 | Archive | Archive → View → Restore → Trash | High |
| INT-009 | Permissions | Test all role restrictions | Critical |
| INT-010 | Realtime | Multi-user concurrent edits | High |

---

# 20. REGRESSION TEST CHECKLIST

## 20.1 Pre-Release Checklist

### Critical Path Tests ✅

- [ ] User can log in
- [ ] User can view spaces list
- [ ] User can create a new space
- [ ] User can view space details
- [ ] User can edit space settings
- [ ] User can add members
- [ ] User can view board
- [ ] User can drag items on board
- [ ] User can archive space
- [ ] Admin can access admin panel

### Security Tests ✅

- [ ] Unauthenticated requests blocked
- [ ] IDOR vulnerabilities tested
- [ ] XSS payloads escaped
- [ ] SQL injection prevented
- [ ] CSRF tokens validated

### Performance Tests ✅

- [ ] Page load < 3s
- [ ] API responses < 500ms
- [ ] No memory leaks
- [ ] No console errors

### Accessibility Tests ✅

- [ ] axe-core 0 violations
- [ ] Keyboard navigation works
- [ ] Screen reader tested

### Cross-Browser Tests ✅

- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓
- [ ] Mobile Safari ✓

## 20.2 Smoke Test Suite

```typescript
// Quick smoke tests for CI/CD
describe('Smoke Tests', () => {
  test('Homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Catalyst/);
  });

  test('Login works', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/spaces');
  });

  test('Spaces list loads', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/spaces');
    await expect(page.locator('[data-testid="spaces-list"]')).toBeVisible();
  });

  test('Create space works', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/spaces');
    await page.click('button:has-text("Create")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('API health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });
});
```

---

# APPENDIX A: TEST DATA GENERATORS

```typescript
// factories/space.factory.ts
import { faker } from '@faker-js/faker';

export const createSpace = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' Space',
  key: faker.string.alpha({ length: 3 }).toUpperCase(),
  type: faker.helpers.arrayElement(['scrum', 'kanban', 'basic']),
  status: 'active',
  description: faker.lorem.paragraph(),
  owner_id: faker.string.uuid(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});

export const createSpaces = (count: number) => 
  Array.from({ length: count }, () => createSpace());

export const createMember = (spaceId: string, overrides = {}) => ({
  id: faker.string.uuid(),
  space_id: spaceId,
  user_id: faker.string.uuid(),
  role: faker.helpers.arrayElement(['owner', 'lead', 'member', 'viewer']),
  joined_at: faker.date.past().toISOString(),
  ...overrides,
});
```

---

# APPENDIX B: CI/CD INTEGRATION

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:a11y

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: zaproxy/action-baseline@v0.9.0
        with:
          target: 'http://localhost:3000'
```

---

# APPENDIX C: BUG REPORT TEMPLATE

```markdown
## Bug Report

**Test ID:** [e.g., CRUD-015]
**Severity:** [Critical/High/Medium/Low]
**Environment:** [Browser, OS, Device]

### Description
[Clear description of the bug]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result
[What should happen]

### Actual Result
[What actually happens]

### Screenshots/Videos
[Attach evidence]

### Console Errors
```
[Paste any errors]
```

### Additional Context
[Any other relevant information]
```

---

# APPENDIX D: TEST EXECUTION COMMANDS

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:unit           # Unit tests (Vitest)
npm run test:integration    # Integration tests
npm run test:e2e            # E2E tests (Playwright)
npm run test:a11y           # Accessibility tests (axe-core)
npm run test:visual         # Visual regression (Playwright)

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test -- spaces.test.ts

# Run tests matching pattern
npm run test -- --grep "CRUD"

# Run in watch mode
npm run test:watch

# Performance testing
k6 run load-tests/spaces.js

# Security testing
zap-baseline.py -t http://localhost:3000
```

---

**Total Test Cases: 500+**
**Estimated Execution Time: ~4 hours (full suite)**
**Recommended CI Time: ~15 minutes (smoke + critical)**

---

*Document Version: 1.0*
*Last Updated: 2026-01-22*
*Author: Claude AI for Catalyst QA*
