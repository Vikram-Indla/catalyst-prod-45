# Hypothesis: sample-feature-2 / exp-000

**Title:** Hardened scaffold dry run
**Date:** 2026-06-26
**Type:** research

> Research experiment — NO code changes allowed. Documentation only.

---

## Hypothesis

_What we expect to find or prove. Fill before starting work._

---

## Acceptance Criteria

Declare ALL criteria BEFORE starting work. Do not modify after starting.

- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] ADS audit: 0 new violations in touched files (build experiments only)
- [ ] TypeScript: 0 new errors (build experiments only)
- [ ] No hard-fail check failed (see scorecard.md)

---

## Pre-Work Reuse Check (build experiments only)

```bash
grep -r "<concept>" src/components src/lib src/hooks --include="*.tsx" --include="*.ts" -l
```

**Found:** _fill_
**Decision:** mount existing | extend | build new (build-new requires human approval)
