# Admin Module Cleanup — Phase -1 Discovery Complete

**Status:** READY FOR APPROVAL  
**Scan Date:** 2026-06-20  
**Files Created:** 3 audit reports  
**Time to Review:** 10-15 minutes  

---

## Discovery Complete ✅

**Audit files ready for review:**
- `ADMIN_ROUTE_AUDIT.md` — 27 routes, 24 deprecated/redirects
- `ADMIN_TABLE_INVENTORY.md` — 40+ admin-related tables, 10+ marked for audit
- `ADMIN_COMPONENT_AUDIT.md` — 84 files, multiple design system violations

---

## Key Findings

### 1. Routes (27 total)
- **3 active:** `/admin`, `/admin/access`, `/admin/workhub/jira-connection`
- **24 deprecated:** All redirect to active routes (soft deprecation via router)
- **Risk:** Confusion from old route names still linkable

### 2. Database Tables (40+ scanned)
- **Core RBAC:** `admin_role_module_permissions` ✅
- **Jira integration:** `injira_*` tables ✅
- **Workflow duplicates:** `catalyst_workflow_*` vs `injira_workflow_*` — CONFLICT
- **Hierarchy partial:** `hi_hierarchy_levels` + `hierarchy_configs` — experimental, needs validation
- **Audit tables:** 10+ audit logs with no retention policy (growing unbounded)

### 3. Components (84 total)
- **43 components:** 9 redirect pages, multiple design violations
- **19 admin pages:** All content centralized in UserAccessPage
- **22 workhub files:** New suite, partial implementation
- **Design gaps:** HierarchyMapping component has:
  - Hand-rolled `<button>` elements (no @atlaskit/button)
  - 11px typography (ADS min: 12px)
  - No keyboard/ARIA (WCAG fail)
  - No canonical color tokens

---

## Immediate Risks (P0)

**Must resolve before Phase 0:**

1. **Workflow table conflict:** Both `catalyst_workflow_*` and `injira_workflow_*` exist
   - Which is active? Both in production?
   - Cleanup required to prevent sync conflicts

2. **Hierarchy tables incomplete:** `hi_hierarchy_levels` schema not finalized
   - Cannot build new hierarchy UI without schema approval
   - Phase 0 is BLOCKED until schema is locked

3. **HierarchyMapping UI non-compliant:**
   - Violates CLAUDE.md design system requirements
   - Must rewrite before Phase 0 UI build
   - Cannot design-critique until backend schema is finalized

4. **Audit logs unbounded:** No retention policy
   - Risk: database bloat
   - Recommendation: add 90-day retention policy

---

## Cleanup Scope (If Approved)

### Safe to Clean (Low Risk)
✅ Remove 9 redirect pages (all content in UserAccessPage)
✅ Add deprecation warnings to old route redirects
✅ Consolidate admin navigation (multiple sidebar versions)
✅ Add audit log retention policy

### Requires Validation First (Medium Risk)
⚠️ Validate `catalyst_workflow_*` vs `injira_workflow_*` usage
⚠️ Finalize `hierarchy_configs` + `hi_hierarchy_levels` schema
⚠️ Audit "gadget_settings", "es_strategy_roles" usage (may be orphan)

### Blocked Until Phase 0 Planning (High Risk)
❌ HierarchyMapping UI rewrite
❌ New admin routes (`/admin/work-hierarchy`, `/admin/jira-sync`)
❌ New backend services and migrations

---

## Approval Questions

**Answer these before cleanup begins:**

1. **Workflow tables:** Can you confirm which `*_workflow_*` table is active?
   - Are both `catalyst_workflow_*` and `injira_workflow_*` in use?
   - Should we consolidate or keep separate?

2. **Hierarchy schema:** What is the final schema for hierarchy levels?
   - Current: `hi_hierarchy_levels` + `hierarchy_configs`
   - Should we merge, rename, or keep both?
   - What fields are required for Phase 0 build?

3. **Audit log retention:** Should we add 90-day retention policy?
   - Current risk: unbounded audit table growth
   - Recommendation: GDPR-safe 90-day retention

4. **Redirect routes:** Can we hard-remove the 9 deprecated pages after 1 release?
   - Or keep them as redirects indefinitely?
   - Recommendation: 1-release grace period, then remove

5. **Gadget/Strategy tables:** Are "gadget_settings" and "es_strategy_roles" orphans?
   - Usage unclear from codebase scan
   - Should we keep, audit, or deprecate?

---

## Next Steps (Conditional)

**If approved:**
1. Create DEPRECATION_PLAN.md (safety guardrails)
2. Create RISK_REGISTER.md (failure modes)
3. Begin cleanup migrations:
   - Hard-remove deprecated pages
   - Audit workflow table usage
   - Finalize hierarchy schema
   - Add audit log retention policy

**If not approved:**
- Return to discovery phase
- Additional investigation on conflict areas
- Schedule follow-up review

---

## Files Awaiting Your Review

```
docs/admin-cleanup/
├── ADMIN_ROUTE_AUDIT.md          ← Routes & redirects
├── ADMIN_TABLE_INVENTORY.md       ← Database tables & conflicts
├── ADMIN_COMPONENT_AUDIT.md       ← Component tree & design issues
├── APPROVAL_CHECKPOINT.md         ← YOU ARE HERE
├── DEPRECATION_PLAN.md            ← (waiting for your approval)
├── RISK_REGISTER.md               ← (waiting for your approval)
└── ADMIN_MODULE_INVENTORY.md      ← (waiting for your approval)
```

---

## Recommendation

✅ **PROCEED WITH CAUTION**

Cleanup is safe to begin on:
- Soft-deprecation of 9 redirect pages
- Adding audit log retention policy
- Consolidating admin sidebar

**BLOCKED pending your answers:**
- Workflow table consolidation
- Hierarchy schema finalization
- HierarchyMapping rewrite (backend first)

**Timeline:** If approved, Phase -1 cleanup can complete in **2-3 days** (conservative estimate pending your answers to the 5 questions above).

---

## Approve to Proceed

Reply with:
```
APPROVED: Proceed with Phase -1 cleanup.
Answers: [your responses to the 5 questions above]
```

Or:

```
BLOCKED: Additional investigation needed on [topics].
```
