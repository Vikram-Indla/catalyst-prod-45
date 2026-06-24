# 11. Risk Register — Failure Modes & Prevention

**Status:** Approved  
**Last Updated:** 2026-06-24

Each risk has a prevention rule, validation method, and stop condition.

---

## 25 Known Failure Modes

### 1. Context loss between conversations
**Prevention:** Comprehensive docs 01–12. Next Claude must read handoff file first.
**Validation:** All questions in 00_READ_ME_FIRST.md answerable from memory.
**Stop if:** Claude claims to start coding without reading all 12 docs first.

### 2. Claude forgets design decisions
**Prevention:** 01_PRODUCT_DECISIONS.md lists all non-negotiables with exact rules.
**Validation:** Design elements match 06_DESIGN_SPECIFICATION.md (flat sidebar, sticky save bar, etc.).
**Stop if:** Sidebar shows nested pages or save buttons appear in header/footer.

### 3. Claude creates "coming soon" placeholders
**Prevention:** Explicit ban in 07_UI_GUARDRAILS.md. Test 22 in 09_TEST_AND_SANITY_PLAN.md.
**Validation:** Grep: `grep -r "coming soon\|under construction\|TODO UI" src/` returns 0 matches.
**Stop if:** Any route renders "Coming soon" text or empty placeholder.

### 4. Claude creates empty tabs
**Prevention:** Every tab must have real content per 08_IMPLEMENTATION_PLAN_TWO_CYCLES.md.
**Validation:** Each tab in Role Detail has functional content (not empty panel).
**Stop if:** Any tab in role detail renders empty or says "will be implemented later".

### 5. Claude implements JSON-only shortcut
**Prevention:** 04_PERMISSION_MODEL.md specifies normalized schema (14 tables, not JSON blob).
**Validation:** grep for JSON column usage: `grep -r "jsonb.*permission\|permission.*jsonb" src/` returns 0.
**Stop if:** Permissions stored as `jsonb` instead of in dedicated tables.

### 6. Claude hardcodes roles again
**Prevention:** 01_PRODUCT_DECISIONS.md says "no hardcoded role groups".
**Validation:** All roles load from roles table: `grep -r "ROLE_GROUPS" src/` returns 0.
**Stop if:** Role list is hardcoded or sourced from constants instead of DB.

### 7. Claude bypasses roles table in Create Access
**Prevention:** Test 24 in 09_TEST_AND_SANITY_PLAN.md checks for hardcoding.
**Validation:** Modal role dropdown query: `SELECT id, name FROM roles WHERE is_active = true`.
**Stop if:** Dropdown uses hardcoded array or old ROLE_GROUPS constant.

### 8. Claude creates faded gray unreadable UI
**Prevention:** 07_UI_GUARDRAILS.md specifies exact color tokens and contrast rules.
**Validation:** WCAG contrast test on all text: minimum 4.5:1.
**Stop if:** Any text fails contrast check or uses `opacity < 0.7`.

### 9. Claude uses random colors
**Prevention:** 07_UI_GUARDRAILS.md bans lime, yellow, rainbow, gradients, purple, decorative colors.
**Validation:** grep: `grep -r "#[0-9A-F]\{6\}\|rgb\|rgba\|hsl" src/components/admin/role-management/` returns only ADS token fallbacks.
**Stop if:** Hardcoded color hex appears in role management code.

### 10. Claude introduces horizontal overflow
**Prevention:** 07_UI_GUARDRAILS.md requires no full-page scroll.
**Validation:** Sticky first columns on all matrices. Table scroll only.
**Stop if:** Page itself scrolls horizontally (not just table).

### 11. Claude creates clipped dropdowns
**Prevention:** 07_UI_GUARDRAILS.md says no clipped dropdowns.
**Validation:** Dropdown uses @atlaskit/popup with Popper.js positioning (not custom CSS).
**Stop if:** Dropdown renders off-screen or gets cut off by container.

### 12. Claude makes field grid unusable at 120+ fields
**Prevention:** 05_MODULE_FIELD_ACTION_INVENTORY.md lists 120+ fields. Grouping + search required.
**Validation:** Field grid groups by module/entity, search auto-expands groups.
**Stop if:** Grid renders flat list of 120+ fields without search/grouping.

### 13. Claude mixes field classification with permissions
**Prevention:** 04_PERMISSION_MODEL.md separates classification (system nature) from permissions (role can do).
**Validation:** Two separate tables: `fields.classification` and `role_field_permissions`.
**Stop if:** Permissions stored on fields table instead of dedicated role_field_permissions.

### 14. Claude forgets export enforcement
**Prevention:** 04_PERMISSION_MODEL.md says export respects field permissions.
**Validation:** Export function filters by `can_export = true` and `can_view = true`.
**Stop if:** Banned/hidden fields appear in CSV exports.

### 15. Claude allows Incident Hub mutation
**Prevention:** 01_PRODUCT_DECISIONS.md says "Incident Hub read-only by policy".
**Validation:** All Incident actions locked (is_allowed = false). Tests 10–11 in 09_TEST_AND_SANITY_PLAN.md.
**Stop if:** Any incident mutation succeeds from Catalyst (should 403).

### 16. Claude forgets sticky save bar
**Prevention:** 06_DESIGN_SPECIFICATION.md specifies sticky bar only (no header/footer saves).
**Validation:** Save buttons appear only in sticky bar at page bottom.
**Stop if:** Save button appears in modal header or page footer.

### 17. Claude claims tests passed without evidence
**Prevention:** 09_TEST_AND_SANITY_PLAN.md requires evidence for every test (screenshot, bash, DB query).
**Validation:** Every test result has proof attached.
**Stop if:** Test marked "passed" without evidence in commit/PR description.

### 18. Claude modifies unrelated Catalyst shell components
**Prevention:** 08_IMPLEMENTATION_PLAN_TWO_CYCLES.md lists exact files to change per phase.
**Validation:** git diff shows only expected files modified.
**Stop if:** Files outside role-management scope are changed (e.g., TopNavigation, sidebar structure).

### 19. Claude duplicates components instead of reusing
**Prevention:** 07 GUARDRAILS say "use existing Catalyst components" (JiraTable, Atlassian Button, etc.).
**Validation:** grep for custom table components: `grep -r "custom.*table\|new.*table" src/components/admin/role-management/` returns 0.
**Stop if:** New table or button component created instead of using Atlassian/Catalyst primitives.

### 20. Claude leaves TODOs in code
**Prevention:** 08_IMPLEMENTATION_PLAN_TWO_CYCLES.md says "zero TODOs before phase done".
**Validation:** grep: `grep -r "TODO\|FIXME\|XXX" src/components/admin/role-management/` returns 0.
**Stop if:** Any TODO comment appears in new code.

### 21. Claude says "Phase 2 later" for Cycle 1 scope
**Prevention:** 08_IMPLEMENTATION_PLAN_TWO_CYCLES.md lists exact deliverables per cycle.
**Validation:** Every Cycle 1 deliverable shipped before marking done.
**Stop if:** Required feature deferred to Phase 2 when it's in Cycle 1 scope.

### 22. Claude fails to update handoff file
**Prevention:** 08_IMPLEMENTATION_PLAN_TWO_CYCLES.md says update 10_CONTEXT_HANDOFF.md after every phase.
**Validation:** 10_CONTEXT_HANDOFF.md reflects current status (not stale).
**Stop if:** Handoff file last updated > 1 day ago (for active implementation).

### 23. Claude starts coding without reading the handoff
**Prevention:** 00_READ_ME_FIRST.md says "read handoff first".
**Validation:** Next Claude's first message includes summary of what they read.
**Stop if:** Implementation changes made without handoff review.

### 24. Claude breaks existing Admin pages
**Prevention:** 08_IMPLEMENTATION_PLAN_TWO_CYCLES.md says only role-management files change.
**Validation:** Test 25 in 09_TEST_AND_SANITY_PLAN.md checks other admin pages.
**Stop if:** Existing admin pages show regressions.

### 25. Claude creates a role-management page that looks unlike Catalyst
**Prevention:** 06_DESIGN_SPECIFICATION.md specifies exact layout + 07_UI_GUARDRAILS.md lists must-use components.
**Validation:** Side-by-side screenshot: new page matches Catalyst aesthetic (spacing, typography, colors, components).
**Stop if:** Page looks visually inconsistent with rest of Catalyst (wrong fonts, colors, spacing).

---

## Stop Conditions Summary

**Code review must BLOCK if:**
1. Hardcoded ROLE_GROUPS found
2. "Coming soon" or placeholder pages exist
3. Incident Hub mutations allowed
4. Any empty tabs in role detail
5. Field/export permissions not enforced
6. Tests claimed passed without evidence
7. Sticky save bar missing or duplicated elsewhere
8. TODOs left in code
9. Unrelated Catalyst shell files modified
10. Color violation found (hardcoded hex, wrong token, bad contrast)
11. Banned field visible to non-admin
12. One-time tests show multi-role user
13. Module/field permissions stored as JSON blobs
14. Handoff file stale (> 1 day without update during active work)

**If ANY of these true, STOP and ask before proceeding.**

---

**This register is your safety net. Use it.**
