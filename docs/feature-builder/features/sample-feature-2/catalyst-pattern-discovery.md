# Catalyst Pattern Discovery: sample-feature-2

**Date:** 2026-06-26
**Experiment:** exp-001
**Type:** research (no code changes)

---

## Objective

Determine: what does Catalyst already have for this feature?

---

## Discovery Commands

```bash
# Search for feature concepts
grep -r "<concept>" src/components src/lib src/hooks --include="*.tsx" --include="*.ts" -l

# Check existing pages
ls -la src/pages/<area>/

# Check routes
grep -n "<feature-path>" src/routes/FullAppRoutes.tsx

# Check sidebar nav
grep -n "<feature-path>" src/components/layout/SidebarBase.tsx
```

---

## Components Found

| Component | File | Purpose | Reusable? |
|---|---|---|---|
| _fill_ | | | |

## Hooks Found

| Hook | File | Purpose | Reusable? |
|---|---|---|---|
| _fill_ | | | |

## Existing Pages / Routes

| Route | File | State |
|---|---|---|
| _fill_ | | not-started / partial / exists |

---

## Conclusion

**Does Catalyst already have this feature?** _fill_

**Canonical components this feature MUST reuse:**
1. _fill_

**New components that may need building (requires human approval):**
1. _fill_

---

**Next step:** exp-002 Current state audit
