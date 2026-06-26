# Karpathy Loop Log — CAT-RBAC-ADMIN-UI-20260626-001
**Date:** 2026-06-26
**Phase:** Plan Lock — Rebuild Hypotheses

---

## Hypothesis 1 — Canonical Access-Management Layout

**Hypothesis:**
The failed rescue used a flat tab-over-table composition. The Jira/Okta reference pattern uses a role-selector sidebar + content panel — this creates a visual navigation anchor that makes the admin feel enterprise-grade. Adding a sidebar role selector to `/admin/roles` will resolve the "bland/archaic" verdict without changing table data or mock wiring.

**Experiment:**
Implement `RolesAdminPage.tsx` with a 240px left sidebar listing role cards (name, stat chips, system badge, active indicator) and a main panel containing the tab strip (Users / Assignments / Permissions matrix). Selecting a role in the sidebar filters Users and Assignments to that role.

**Measure:**
- Screenshot 1: Roles page shows sidebar + main panel — clear visual separation
- Screenshot 5: Row actions on sidebar item show Edit + Assign users
- Time to reach visual acceptance: ≤ 30 min implementation

**Keep/discard rule:**
- KEEP if sidebar renders with clear visual hierarchy and role card states (hover, selected, system badge)
- DISCARD if sidebar requires >45 min, breaks modal wiring, or makes tab navigation confusing

**Evidence required:**
- Screenshot showing sidebar role cards with name, user count, permission count, active badge
- Sidebar selection changes Users tab content to show only users in that role
- All 3 modals still launch correctly from sidebar item actions

---

## Hypothesis 2 — Table/List Component

**Hypothesis:**
The failed rescue used raw `JiraTable<T>` but produced "spreadsheet" visual quality. The failure was not the component — it was the column design (wrong widths, no visual weight on the Name column, avatar initials clashing with text density). Using `JiraTable` with `density="comfortable"`, a properly weighted name column (flex: true, alwaysVisible: true), and semantic cell renderers will produce Catalyst-grade table quality.

**Experiment:**
Rebuild `RbacRolesTable.tsx` with JiraTable at `density="comfortable"`. Name column: `flex: true`, avatar + name + description stacked. Stats columns: narrow `width: 8`, right-aligned numbers. Status: `width: 10`. Actions: `width: 6`. Use `makeRowActionsCell` for Edit + Assign users.

**Measure:**
- Table renders with Catalyst-grade visual quality (enterprise admin, not spreadsheet)
- Role name + description visible without truncation at 1280px viewport
- No horizontal scroll on the roles list itself
- Status lozenge appearance="default" (grey, not green)

**Keep/discard rule:**
- KEEP JiraTable if visual quality at `density="comfortable"` clears the "enterprise-grade" bar in screenshot review
- DISCARD if column layout still looks cramped or tables produce the same "bland" verdict as the failed rescue
- FALLBACK: hand-coded grid div table with explicit cell padding and role card design (wider row height, more spacing)

**Evidence required:**
- Screenshot showing roles table with clearly readable name+description, stat counts, neutral status badge, ⋯ menu
- Screenshot of row actions menu showing "Edit role" and "Assign users"
- No hardcoded colors, no green lozenges

---

## Hypothesis 3 — Permission Matrix Interaction

**Hypothesis:**
The current `PermissionsMatrix.tsx` (pre-existing) renders a read-only role×permission grid with sticky headers. The visual failure was that check icons were rendered in muted grey (`var(--ds-icon-subtle)`) — making it look like "nothing is granted." Using `var(--ds-icon-success)` (green) for granted permissions and a faint dot for non-granted creates semantic clarity without adding color complexity.

**Experiment:**
Update `PermissionsMatrix.tsx` color for checkmark cells from `var(--ds-text-subtle)` to `var(--ds-icon-success, #216E4E)`. Simultaneously add a faint module-specific left border (4px) on section header rows using the following map:
- Project Hub: `var(--ds-border-brand, #0055CC)`
- Product Hub: `var(--ds-border-information, #5E4DB2)` 
- Release Hub: `var(--ds-border-warning, #974F0C)`
- Test Hub: `var(--ds-border-success, #216E4E)`
- Admin: `var(--ds-border-danger, #AE2A19)`

**Measure:**
- Matrix renders with clearly visible granted permissions (green checks visible at a glance)
- Non-granted cells show a faint dot — no confusing empty space
- Module section borders provide visual rhythm without color overwhelm
- Passes ADS token audit (no bare hex)

**Keep/discard rule:**
- KEEP green checks if screenshot review finds the matrix "clear" and "enterprise-grade"
- DISCARD module color borders if they feel garish or unmaintainable — fallback to no border
- DISCARD if any color fails ADS token audit (must use var(--ds-*) only)

**Evidence required:**
- Screenshot of Permissions matrix tab showing green check icons
- Screenshot of Permission catalogue on /admin/permissions with module section borders
- ADS validator: 0 violations on PermissionsMatrix.tsx after change
