# Experiment Scorecard: sample-feature-2 / exp-000

**Title:** Hardened scaffold dry run
**Date:** 2026-06-26
**Type:** research

> This is the Catalyst equivalent of Karpathy AutoResearch's val_bpb.
> Fill AFTER experiment, BEFORE calling finish-experiment.sh.

---

## Scorecard

| Dimension | Max | Score | Notes |
|---|---:|---:|---|
| Catalyst-native visual quality | 25 | PENDING | ADS tokens, no hardcoded colors, correct spacing |
| Functional correctness | 20 | PENDING | CRUD works, data persists, no silent failures |
| Data correctness | 15 | PENDING | Correct tables, snake_case access, no typed fallbacks |
| Pattern reuse | 15 | PENDING | Canonical components mounted, nothing rebuilt |
| Validation health | 10 | PENDING | TS 0 errors, ADS 0 violations, build passes |
| UX completeness | 5 | PENDING | Acceptance criteria all pass |
| Maintainability | 10 | PENDING | No dead code, no speculative abstractions |
| **Total** | **100** | **PENDING** | |

**Threshold:** ≥ 80 = keep · 65–79 = revise · < 65 = reject

---

## Hard Fail Check

Any FAIL here = automatic reject, regardless of scorecard total.

| Check | Pass/Fail | Notes |
|---|---|---|
| TypeScript passes (0 new errors) | PENDING | |
| App route loads without crash | PENDING | |
| No console crash on mount | PENDING | |
| No unauthorized access introduced | PENDING | |
| No global theme mutation | PENDING | |
| No unapproved migration | PENDING | |
| No route duplication | PENDING | |
| No major visual mismatch (build only) | PENDING | |
| allowed-edit-surface.md was filled before work | PENDING | |

---

## Final Score

```
Total: PENDING / 100
Hard fails: PENDING
Threshold met: PENDING
```

## Decision

PENDING — fill after scoring above.
