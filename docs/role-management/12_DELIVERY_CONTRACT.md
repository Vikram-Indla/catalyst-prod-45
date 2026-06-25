# 12. Delivery Contract — Implementation Gates & Acceptance Criteria

**Status:** Approved  
**Last Updated:** 2026-06-24

This document defines the hard gates and acceptance criteria for every implementation phase.

---

## Mandatory Reading Order (Before Any Code)

1. `CLAUDE_ROLE_MANAGEMENT_HANDOFF.md` (repo root)
2. `00_READ_ME_FIRST.md`
3. `01_PRODUCT_DECISIONS.md`
4. `02_ARCHITECTURE_AND_ERD.md`
5. `03_DATABASE_SCHEMA.md`
6. `04_PERMISSION_MODEL.md`
7. `05_MODULE_FIELD_ACTION_INVENTORY.md`
8. `06_DESIGN_SPECIFICATION.md`
9. `07_UI_GUARDRAILS.md`
10. `08_IMPLEMENTATION_PLAN_TWO_CYCLES.md`
11. `09_TEST_AND_SANITY_PLAN.md`
12. `10_CONTEXT_HANDOFF.md`
13. `11_RISK_REGISTER_AND_NO_EXCUSES.md`
14. **This file** (`12_DELIVERY_CONTRACT.md`)

**Do not implement until you have read all 14 files and understand every rule in this contract.**

---

## Component Discovery Gate

**Before writing ANY new component:**

1. Search Catalyst codebase for existing component: `grep -r "ComponentName" src/components/`
2. Search Atlaskit: `@atlaskit/button`, `@atlaskit/select`, `@atlaskit/modal-dialog`, `@atlaskit/dropdown-menu`
3. Check canonical Catalyst components: `JiraTable`, `CatalystViewBase`, `CatalystSidebarDetails`, `StatusPill`
4. If an existing component matches your use case → extend it, do NOT rebuild
5. If no match → ask JK / Product Owner before building new component

**Gate:** Only hand-rolled components must have explicit JK / Product Owner approval. Using existing components requires no approval.

---

## Ban on Hand-Rolled UI Primitives

**Permanently banned from role-management code:**

- ❌ Custom table components (use `JiraTable` or `@atlaskit/dynamic-table`)
- ❌ Custom button components (use `@atlaskit/button`)
- ❌ Custom dropdown/select (use `@atlaskit/select` or `@atlaskit/dropdown-menu`)
- ❌ Custom modal (use `@atlaskit/modal-dialog`)
- ❌ Custom date picker (use `@atlaskit/datetime-picker`)
- ❌ Custom checkbox/radio (use `@atlaskit/checkbox` / `@atlaskit/radio`)
- ❌ Custom spinner (use `@atlaskit/spinner`)

**Approved path:** All UI built from Atlaskit + Catalyst shell + existing role-management components.

---

## Drawer Ban

**PERMANENTLY BANNED — do NOT use:**

- ❌ Atlaskit `Drawer` component anywhere in role-management pages
- ❌ Custom drawer implementations
- ❌ Side panels for role detail
- ❌ Slide-out navigation inside role management
- ❌ Modal for the Role Detail workspace (unless explicitly approved by JK / Product Owner)

**Approved pattern:** Full-page Role Detail workspace/page with header, tabs, and sticky save bar. Do not use drawer. Do not use modal for the Role Detail workspace unless explicitly approved by JK / Product Owner.

**Why:** Role management requires sticky save bar for unsaved changes. Drawers cannot host sticky footer bars that survive modal boundaries. Role Detail must be a full-page experience with persistent navigation and dedicated space for all 7 tabs + save bar.

---

## ADS & Catalyst Validation Requirement

**Every visual implementation must validate against:**

1. **Atlassian Design System tokens** — all colors from `var(--ds-*)` 
2. **Catalyst existing pages** — flat sidebar, spacing, typography match `/admin/users`, `/admin/resources`
3. **Design specification** — exact layouts from `06_DESIGN_SPECIFICATION.md`
4. **Guardrails checklist** — every rule in `07_UI_GUARDRAILS.md` must pass

**Gate:** Visual implementation passes color audit + layout probe + contrast test before marking phase done.

---

## No-Placeholder Policy

**ABSOLUTELY BANNED:**

- ❌ "Coming soon" text
- ❌ "Under construction" text
- ❌ "TODO" in visible UI
- ❌ Empty tabs with "Coming in Phase 2"
- ❌ Disabled buttons with "Not yet implemented" tooltips
- ❌ Placeholder lorem ipsum content
- ❌ Stub components marked "to be implemented later"

**Rule:** If a feature is NOT ready, either:
1. Hide the entire page/tab/button from the UI (do NOT render it at all)
2. Implement the complete feature (all 25 sanity tests must pass before shipping)

**Gate:** Grep phase deliverables: `grep -r "coming soon\|under construction\|TODO" src/pages/admin/role-management/ src/components/admin/role-management/` must return 0 matches.

---

## Wiring Contract

**Every new component/hook must be wired to:**

1. **Roles table for data source** — `SELECT * FROM roles WHERE is_active = true`
2. **Permission utilities** — `getModulePermission()`, `getFieldPermission()`, `getActionPermission()`, `getTransitionPermission()`
3. **Supabase RLS policies** — no data returns without correct RLS gate
4. **AdminGuard for route protection** — `/admin/*` routes must check `is_admin = true`
5. **Audit logging** — every permission change logged to `permission_audit_log` table

**Gate:** Data layer tests must verify:
- Role dropdown returns only active roles
- Permissions load for the correct role
- Audit log captures all changes
- RLS blocks non-admin reads

---

## Data Source Contract

**All data must come from:**

- ✅ `roles` table (dynamic role list)
- ✅ `user_roles` table (user assignments)
- ✅ `role_module_permissions` table (module-level permissions)
- ✅ `role_field_permissions` table (field-level permissions)
- ✅ `role_action_permissions` table (action permissions)
- ✅ `role_transition_permissions` table (workflow transition permissions)
- ✅ `permission_audit_log` table (audit trail)

**BANNED data sources:**

- ❌ Hardcoded role lists
- ❌ JSON blobs for permissions
- ❌ Constants files (ROLE_GROUPS, etc.)
- ❌ Figma or design tool data
- ❌ Lovable snapshots

**Gate:** Every data display must trace back to one of the 7 approved tables via a Supabase query or hook.

---

## Role Management Non-Negotiables

**These rules CANNOT be overridden, reinterpreted, or deferred:**

1. **One active role per user** — enforced by partial unique index `UNIQUE(user_id) WHERE is_active = true` on `user_roles`
2. **Dynamic role dropdown** — loads from `roles` table, not hardcoded
3. **Incident Hub read-only** — all Incident mutations blocked at action/transition layer AND RLS layer
4. **Sticky save bar only** — save button NEVER in header or footer, only sticky bar at page bottom
5. **No role deactivation assignment** — when a role is deactivated (`is_active = false`), no new assignments allowed (service layer or trigger enforcement)
6. **Guest 48-hour expiry** — hardcoded in schema, not configurable
7. **Permission changes immediate** — no async delay, no queues, no batching
8. **Export respects permissions** — CSV export filters fields by `can_export = true` AND `can_view = true`
9. **Banned fields locked** — `assessment_feature` and `service_now_ref` never visible to non-admin, never editable
10. **Audit logging mandatory** — every role/permission/user_role/guest_access change logged with timestamp + user_id + action_type

---

## Color & Visual Quality Contract

**Before marking any UI phase complete:**

1. **Color audit:** `grep -r "#[0-9A-F]\{6\}\|rgb(\|rgba(\|hsl(" src/components/admin/role-management/` returns 0 hardcoded colors
2. **Token usage:** All colors use `var(--ds-text)`, `var(--ds-background-neutral)`, etc. (Atlassian Design System tokens only)
3. **Contrast test:** Every text element passes WCAG AA minimum 4.5:1 contrast ratio (use Chrome DevTools Contrast Checker)
4. **Typography match:** Headers 14px/600, body 12px/400, row content 14px/400 (matches Catalyst admin pages)
5. **Spacing audit:** All padding/margin use grid values (4, 8, 12, 16, 24, 32px only, no arbitrary values)
6. **Component consistency:** All buttons, selects, tables match Catalyst existing pages (no new icon styles, no new color palette)

**Gate:** Visual QA checklist must be signed off before phase marked complete.

---

## Layout Contract

**Every page must follow these layout rules:**

1. **Flat Admin sidebar** — Access Management / Role Management / Permission Audit only (no nested pages)
2. **No drawers, no modals for Role Detail** — Role Detail is a full-page workspace/page, not a side drawer or modal
3. **Sticky save bar** — appears at page bottom when form is dirty, disappears when clean
4. **Table headers sticky** — column headers do NOT scroll with content
5. **First column sticky** — Role name / User name column stays fixed on horizontal scroll
6. **No full-page horizontal scroll** — tables scroll internally, page does not
7. **Minimum viewport 1024px wide** — design assumes desktop, no mobile optimizations required
8. **Modals 480–800px wide** — create access modal, preview modal in this range (role detail is NOT a modal — it is a full-page workspace)
9. **Row height 48–56px** — JiraTable default, applies to all matrices and lists

**Gate:** Layout probe at 1024px, 1440px, 1920px viewports must show no overflow, no clipping, proper alignment.

---

## Context Health Governance

**At the end of every phase:**

1. Update `10_CONTEXT_HANDOFF.md` with:
   - What was completed (exact files)
   - What tests passed (evidence attached)
   - What the next phase expects
   - Any new risks or blockers

2. Check context health: `rtk gain` should show < 50% token spend on reading phase output

3. If context will exceed 80%, create a handoff and stop (do NOT continue into next phase)

4. Next Claude session reads the updated handoff file FIRST, before any code

---

## Handoff Update Requirement

**After EVERY subiteration (not just phases):**

1. Run `git diff --stat` to record files changed
2. Run `npm test -- role-management` to record test output
3. Record what was done vs. what was planned
4. Record what failed (if anything) and RCA
5. Update `10_CONTEXT_HANDOFF.md` with all above
6. Commit the handoff update in the same PR as the feature

**Gate:** Handoff file must be current (updated within last 24 hours of active work) or implementation is considered stale.

---

## Evidence Required Before Claiming Done

**Every phase completion requires evidence for:**

| Deliverable | Evidence Type | Location |
|---|---|---|
| Database schema created | Migration file + `supabase db pull` output | commit message + PR description |
| Roles seeded | `SELECT count(*) FROM roles` = 16 | PR description screenshot |
| Access Management UI | 4 tabs visible, CRUD works | PR screenshots + test output |
| Role Management UI | 7 tabs visible, all functional | PR screenshots + test output |
| Module matrix tiles | Summary counts update live | video or GIF in PR |
| Field grid searchable | Collapse all → search "priority" → auto-expand | video or GIF in PR |
| Sticky save bar | Dirty state shows bar, clean hides bar | video or GIF in PR |
| Permission dropdown dynamic | Add role to DB → refresh → appears in dropdown | test output + screenshot |
| Banned fields hidden | Log in as QA Tester, no assessment_feature visible | screenshot + grep output |
| Incident Hub read-only | Try to edit incident, see 403 or disabled UI | error message + screenshot |
| No hardcoded roles | `grep ROLE_GROUPS` returns 0 | bash output |
| No coming soon | `grep "coming soon"` returns 0 | bash output |
| No TODOs | `grep TODO` returns 0 | bash output |
| All 25 tests pass (Cycle end only) | `npm test -- sanity` all green | test runner output |

**Gate:** Phase cannot be marked done without evidence for every deliverable.

---

## Stop Conditions (Immediate Halt Required)

**If ANY of these occur, STOP and ask JK / Product Owner before proceeding:**

1. You find hardcoded `ROLE_GROUPS` in code
2. You create a "Coming soon" page
3. You allow Incident Hub mutations
4. You see empty tabs with no content
5. You store permissions as JSON blobs instead of using normalized tables
6. You mark a test passed without evidence
7. You modify files outside `src/pages/admin/role-management` or `src/components/admin/role-management`
8. You use hardcoded colors instead of ADS tokens
9. Banned fields are visible to non-admin users
10. A user has more than one active role in the database
11. RLS policy contains a self-referential loop (recursion error)
12. Permission change takes > 5 seconds to reflect in UI
13. Export CSV includes hidden or banned fields
14. Role dropdown shows deactivated roles
15. Sanity test fails without clear error message

**If ANY stop condition triggers, halt work immediately and surface to JK / Product Owner.**

---

## Cycle 1 Completion Checklist

Before marking Cycle 1 done, ALL must be true:

- [ ] All 14 database tables created with correct constraints and indexes
- [ ] 16 default roles seeded with correct permissions
- [ ] Access Management page live (4 tabs: People, Invitations, Email Log, Generate Links)
- [ ] Create Access modal wired (dynamic role dropdown from `roles` table)
- [ ] Role Management landing page live (roles table + create/clone modals)
- [ ] Role detail page with 7 tabs (Overview, Modules, Fields, Actions, Transitions, Users, Audit)
- [ ] Module matrix with 6 summary tiles that update live
- [ ] Field grid grouped by module/entity with search that auto-expands matching groups
- [ ] Sticky save bar appears/disappears correctly based on dirty state
- [ ] Permission audit log has entries for every role/permission change
- [ ] All 14 files are complete, visible, functional (no placeholders)
- [ ] Sanity tests 1–15 all passing with evidence
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] Zero hardcoded roles (`grep ROLE_GROUPS` returns 0)
- [ ] Zero coming-soon pages (`grep "coming soon"` returns 0)
- [ ] Handoff file updated with Cycle 1 completion status

---

## Cycle 2 Completion Checklist

Before marking Cycle 2 done, ALL must be true (in addition to all Cycle 1 checks):

- [ ] Action permission enforcement live (all mutation endpoints check `is_allowed`)
- [ ] Transition permission enforcement live (status dropdown locked for forbidden transitions)
- [ ] Incident Hub hard read-only (all mutations return 403 or show "Managed in Jira" overlay)
- [ ] Permission Preview page live showing 6 sections (sidebar, buttons, columns, drawer, export, transitions)
- [ ] Field visibility enforced (hidden fields don't render in detail views)
- [ ] Read-only fields enforced (no edit controls for `can_update = false` fields)
- [ ] Export filtering enforced (hidden/banned fields excluded from CSV)
- [ ] All RLS policies in place (no recursive checks, no unqualified subqueries)
- [ ] All route guards in place (`AdminGuard` on /admin/*, module routes check `can_read`)
- [ ] All component guards in place (ActionAccessGuard, FieldAccessGuard, ModuleAccessGuard)
- [ ] Sanity tests 16–25 all passing with evidence
- [ ] Zero console errors in browser DevTools
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] Handoff file updated with Cycle 2 completion status

---

**This contract is binding. Do not proceed without reading and acknowledging all clauses.**

