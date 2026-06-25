# 06. Design Specification — Approved Wireframes & Layouts

**Status:** Approved, Design Review Cycle 2  
**Last Updated:** 2026-06-24

This is the final approved design. Do not create alternate layouts or reinterpret the UI structure.

---

## Key Design Decisions (No Reinterpretation)

1. **Flat Admin sidebar** — Access / Role Management / Permission Audit only (no nested detail pages)
2. **Create Access is a button** — Not a tab. Clicking opens a modal. Role dropdown is dynamic (from roles table).
3. **Sticky save bar** — No header/footer save buttons. Only sticky bar shows "Unsaved changes: N permission changes" with Discard/Save.
4. **Module matrix summary tiles** — 6 tiles above the matrix showing readable/editable/locked/bulk counts
5. **Grouped field grid** — Collapsible by module/entity, searchable, auto-expands on match
6. **Incident Hub locked** — All mutation actions show lock icon + "Managed in Jira" label
7. **Permission Preview "as user"** — Shows 6 sections: sidebar access, toolbar buttons, table columns, detail drawer, export list, transitions

---

## Catalyst Shell Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Catalyst Logo │ Search   │ Create | Notif | Settings | Avatar
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ 240px Admin  │ Main content area (breadcrumb + title + content)
│ Sidebar      │                                               │
│              │                                               │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

**Fixed measurements:**
- Top nav: 56px height, fixed
- Sidebar: 240px width, fixed
- Main content padding: 24px all sides
- Tab bar: 44px height, sticky below title

---

## Flat Admin Sidebar

```
Admin
├─ HOME
│  └─ Dashboard
│
├─ USERS & ACCESS
│  ├─ Access [NEW]
│  ├─ Role Management [NEW]
│  └─ Permission Audit [NEW]
│
├─ CONFIGURATION
│  ├─ Modules [NEW]
│  ├─ Fields [NEW]
│  ├─ Actions [NEW]
│  └─ Workflows [NEW]
│
└─ EXISTING ADMIN
   ├─ Departments
   ├─ Icons
   └─ [remaining items...]
```

**Navigation rule:** No nested detail pages in sidebar. All detail pages accessed via "Edit" buttons or links within the main content area.

---

## Access Management Page

**Layout:**
```
Title: User Access Management
Subtitle: Manage user accounts, invitations, and access

[+ Create Access] [Search...] [Filter: All ▼]

TABS: People | Invitations | Email Log | Generate Links

[Tab content varies]
```

**Create Access Modal (on button click):**
```
Email Address *: [input]
Full Name (optional): [input]
Role * [Dropdown ▼] — loads from roles table, no hardcoding
  SELECT id, name FROM roles WHERE is_active = true
Delivery Channel: [Radio: Email | SMS | WhatsApp | Manual]

[Create Access] [Cancel]
```

**Key rule:** Role dropdown MUST load from roles table. No hardcoded ROLE_GROUPS.

---

## Role Management Landing

```
Title: Role Management
Subtitle: Define roles, permissions, and access control

[+ Create Role] [Clone Role] [Search...] [Active ▼]

TABLE: Name | Code | Users | Module Access | Status | Actions

[Row 1]
Administrator | admin | 1 | All (7) ✓✓✓✓✓✓✓ | Active | [≡ menu]

[Row 2]
QA Tester | qa_tester | 3 | 3 active ✓ ✓ ✓ | Active | [≡ menu]

[More rows...]
```

---

## Role Detail Workspace

**Header (metadata only):**
```
Role: QA Tester | Status: Active | Users: 3 | Last updated: 2 days ago
[Clone] [Deactivate] [Delete]
```

**Tabs:**
```
[Overview] [Modules] [Fields] [Actions] [Transitions] [Users] [Audit]
```

**Sticky Save Bar (at bottom, appears only when dirty):**
```
╔═══════════════════════════════════════════╗
║ Unsaved changes: 7 permission changes     ║
║ [Discard changes]  [Save changes]         ║
╚═══════════════════════════════════════════╝
```

---

## Module Permission Matrix

**Summary tiles (6):**
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Readable │ │ Editable │ │ Locked   │
│ 7 / 10   │ │ 5 / 10   │ │ 1 module │
└──────────┘ └──────────┘ └──────────┘

┌──────────┐ ┌──────────┐
│ Delete   │ │ Bulk del │
│ 4 module │ │ 2 module │
└──────────┘ └──────────┘
```

**Matrix:**
```
┌──────────────┬──────┬────────┬────────┬────────┐
│ MODULE       │ READ │ CREATE │ UPDATE │ DELETE │...
├──────────────┼──────┼────────┼────────┼────────┤
│ Project Hub  │  ☑   │   ☑    │   ☑    │   ☐    │...
│ ph_issues    │      │        │        │        │...
├──────────────┼──────┼────────┼────────┼────────┤
│ Release Hub  │  ☑   │   ☐    │   ☐    │   ☐    │...
├──────────────┼──────┼────────┼────────┼────────┤
│ Incident Hub │  ☑   │   🔒   │   🔒   │   🔒   │...
│ [gray row]   │      │ LOCKED │ LOCKED │ LOCKED │...
└──────────────┴──────┴────────┴────────┴────────┘
```

**Sticky module column:** Module column does not scroll; checkboxes scroll right.

---

## Field Permission Grid (Grouped)

```
▼ Project Hub / ph_issues (12 fields, 2 hidden)
┌────────────────┬──────┬────────┬────────┬────────┐
│ FIELD          │ VIEW │ UPDATE │ CLEAR  │ EXPORT │
├────────────────┼──────┼────────┼────────┼────────┤
│ Summary        │  ☑   │   ☑    │   —    │   ☑    │
│ Status         │  ☑   │   ☑    │   —    │   ☑    │
│ Priority       │  ☐   │   —    │   —    │   ☐    │ Hidden
│ Assessment     │ 🔒   │  🔒    │  🔒    │  🔒    │ Banned
└────────────────┴──────┴────────┴────────┴────────┘

▼ Product Hub / business_requests (8 fields)
[fields...]

▶ Release Hub / rh_releases (6 fields) [collapsed]
```

**Search/filter:**
```
[Module filter: All ▼] [Search fields...] [Classification: All ▼]
```

**Auto-expand on search:** If search matches fields in collapsed group, that group expands automatically.

---

## Action Permissions

**Structure:**
```
┌─ BULK OPERATIONS
│  [☑] bulk_update
│  [☐] bulk_delete
│
├─ EXPORT OPERATIONS
│  [☑] export_csv
│  [☐] export_excel
│
├─ INCIDENT HUB OPERATIONS (LOCKED)
│  [🔒] add_comment      — Managed in Jira
│  [🔒] add_watcher      — Managed in Jira
│  [🔒] add_attachment   — Managed in Jira
│  [🔒] transition       — Managed in Jira
│
└─ AI OPERATIONS
   [☑] ask_caty
   [☑] improve_story
```

**Incident Hub actions:** All show lock icon, disabled toggle, tooltip "Managed in Jira only".

---

## Workflow Transition Matrix

```
PROJECT WORKFLOW
┌─────────────┬─────────────┬─────────┐
│ FROM STATUS │ TO STATUS   │ ALLOWED │
├─────────────┼─────────────┼─────────┤
│ todo        │ in_progress │ [☑]     │
│ in_progress │ done        │ [☑]     │
│ done        │ todo        │ [☐]     │
└─────────────┴─────────────┴─────────┘

INCIDENT WORKFLOW (LOCKED)
┌─────────────┬─────────────┬──────────────────┐
│ open        │ triage      │ [🔒] MANAGED     │
│ triage      │ in_progress │ [🔒] MANAGED     │
│ in_progress │ resolved    │ [🔒] MANAGED     │
└─────────────┴─────────────┴──────────────────┘
```

---

## Permission Preview (as User)

**Selection:**
```
Role: [QA Tester ▼] | Module: [Project ▼] | Entity: [ph_issues ▼]
[Preview as user]
```

**Six preview sections:**

**1. SIDEBAR ACCESS**
```
✓ Home (visible)
✓ Project Work (visible)
  ├─ Backlog (visible)
  ├─ All Work (visible)
✗ Product Work (hidden)
✗ Incident Hub (hidden — read-only policy)
```

**2. TOOLBAR BUTTONS**
```
✓ Create | ✓ Edit | ✗ Delete | ✓ Export
✗ Bulk Update | ✗ Bulk Delete
✓ Ask Caty | ✓ Improve
```

**3. TABLE COLUMNS**
```
✓ Key | ✓ Summary | ✓ Status | ✗ Priority | ✓ Assignee
```

**4. DETAIL DRAWER FIELDS**
```
VISIBLE & EDITABLE:
✓ Summary [editable]
✓ Status [dropdown]
✓ Assignee [picker]

VISIBLE & READ-ONLY:
✓ Reporter [read-only]
✓ Created [read-only]

HIDDEN:
✗ Assessment Feature [banned]
```

**5. EXPORT FIELDS**
```
Included: Key, Summary, Status, Assignee, Created, Updated
Excluded: Priority, Assessment Feature, Service Now#
```

**6. STATUS TRANSITIONS**
```
From todo: ✓ in_progress, ✗ done [blocked]
From in_progress: ✓ done, ✗ todo [blocked]
```

---

## Permission Audit Page

```
Title: Permission Audit Log
Subtitle: Track all permission changes for compliance

[Date: Last 30 days ▼] [Changed by: All ▼] [Action: All ▼]

TABLE:
┌──────────────┬──────────┬──────────────────────┬──────────────┐
│ WHEN         │ WHO      │ ACTION               │ TARGET       │
├──────────────┼──────────┼──────────────────────┼──────────────┤
│ 2d ago 14:32 │ Admin    │ role_created         │ qa_tester    │
│ 2d ago 14:35 │ Admin    │ permission_changed   │ proj:create  │
│ 5d ago 09:15 │ Admin    │ user_role_changed    │ jane@example │
└──────────────┴──────────┴──────────────────────┴──────────────┘

Pagination: Showing 1-50 of 247
[Export audit log to CSV]
```

---

## Typography

| Level | Size | Weight | Color |
|---|---|---|---|
| Page title | 28px | 600 | primary text |
| Page subtitle | 14px | 400 | subtle text |
| Section title | 18px | 600 | primary text |
| Form label | 14px | 500 | primary text |
| Table header | 12px | 600 | primary text, sentence-case |
| Table body | 14px | 400 | primary text |
| Helper text | 12px | 400 | subtle text |
| Button text | 14px | 500 | based on button type |

---

## Colors (ADS Tokens Only)

| Usage | Token | Fallback |
|---|---|---|
| Primary text | `var(--ds-text, #172B4D)` | #172B4D |
| Subtle text | `var(--ds-text-subtle, #42526E)` | #42526E |
| Links | `var(--ds-link, #0052CC)` | #0052CC |
| Success (active) | Green semantic | #216E4E |
| Warning (amber) | Amber semantic | #974F0C |
| Danger (locked) | Red semantic | #AE2A19 |
| Page background | `var(--ds-surface, #FFFFFF)` | #FFFFFF |
| Subtle background | `var(--ds-background-neutral-subtle, #F7F8F9)` | #F7F8F9 |
| Selected row | `var(--ds-background-selected, #E9F2FE)` | #E9F2FE |
| Borders | `var(--ds-border, #DFE1E6)` | #DFE1E6 |

---

**This design is final. Do not create alternate layouts or color schemes.**
