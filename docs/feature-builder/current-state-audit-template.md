# Current State Audit: <feature-slug>

> Copy to: docs/feature-builder/features/<feature-slug>/current-state-audit.md
> Audits the existing implementation state — no code changes.

---

## Audit Commands

```bash
# ADS violations in this feature's files
node design-governance/rules/audit.js src/pages/<feature-area>/ 2>&1 | tail -40

# TypeScript errors in feature area
npx tsc --noEmit 2>&1 | grep "<feature-area>"

# DB table reads (which tables does this feature currently use?)
grep -rn "from('\|from(\"" src/pages/<feature-area>/ --include="*.tsx" --include="*.ts"

# Route registrations
grep -n "<feature-slug>\|<feature-area>" src/routes/FullAppRoutes.tsx

# Design governance self-test
node design-governance/scripts/self-test.mjs
```

---

## Files Audited

| File | Size | Purpose | DB tables read | Reusable? |
|---|---|---|---|---|
| _fill_ | | | | |

---

## Routes Registered

| Route | Component | Status |
|---|---|---|
| _fill_ | | registered / missing |

**Missing routes** (files exist but no route registered):
- _fill_

---

## ADS Violations

```
Run: node design-governance/rules/audit.js src/pages/<feature-area>/
Result:
  Token violations:     _fill_
  Typography violations: _fill_
  Total:                _fill_
```

**P0 violations** (must fix before any build phase ships):
- _fill_

---

## TypeScript Errors

```
Run: npx tsc --noEmit 2>&1 | grep "<feature-area>"
Result:
  Errors: _fill_ (0 = clean)
```

---

## DB Tables Used

| Table | Correct (tm_* not th_*)? | Notes |
|---|---|---|
| _fill_ | | |

**Legacy table references found** (th_* instead of tm_*, or other wrong tables):
- _fill_

---

## Functional Gaps Found

| Gap | Severity | Notes |
|---|---|---|
| _fill_ | P0/P1/P2 | |

---

## Summary

**Overall state:**
- not-started
- partial (some files exist, wiring unknown)
- exists-unverified (files exist, functional state not confirmed)
- exists-verified (confirmed working against real DB)

**ADS debt count:** _fill_ violations
**TypeScript errors:** _fill_
**Missing routes:** _fill_
**Legacy DB refs:** _fill_

**Recommended next step:**
_fill_
