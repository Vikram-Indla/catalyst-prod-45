# Plan Lock — Slice 3: UI Quality Fixes
**Feature Work ID:** CAT-RBAC-LIVE-DATA-20260626-002
**Timebox:** 2 hours

## Objective
Fix 3 UI quality issues in RBAC admin:
1. Lime green ACTIVE badge
2. Flat / no-elevation main detail panel
3. Permission groups unlabeled — add category headers in matrix

## Non-Scope
- No DB changes, no migrations
- No new modal or route
- No change to PERMISSION_GROUPS constant values (DB keys must stay identical)
- No changes to AssignUsersModal, CreateEditRoleModal
- PermissionsAdminPage read-only matrix: also gets category headers

## Files to Modify (3)
| File | Change |
|---|---|
| `src/components/admin/rbac/RbacRolesTable.tsx` | Line 111: `'success'` → `'inprogress'` |
| `src/components/admin/rbac/PermissionsMatrix.tsx` | Add CATEGORY_GROUPS const, render category header rows |
| `src/pages/admin/RolesAdminPage.tsx` | Wrap role detail in card with ds-shadow-raised elevation |

## Files Forbidden
All other files.

## ADS Token Rules
- Lozenge `inprogress` = blue (not lime) — ADS canonical
- Card elevation: `var(--ds-shadow-raised, ...)` — token-first
- Category header rows: `var(--ds-background-neutral)` background + `var(--ds-text-subtlest)` text
- No hex, no rgba top-level, no Tailwind utilities

## UI Rules
- CATEGORY_GROUPS is display-only — never exported, never used for DB queries
- Category header `<tr>` spans all columns via `colSpan`
- Card wrapper: border + shadow, no inner padding change (tabs + matrix must not shift)

## Validation
- TypeScript: 0 errors
- ADS validator: 0 violations
- Screenshot: ACTIVE badge blue, category headers visible, card shadow visible

## Stop Conditions
- If Lozenge `inprogress` has ADS issue, use `new` (purple) as fallback
- If shadow token fails validator, remove fallback rgba and keep token-only
