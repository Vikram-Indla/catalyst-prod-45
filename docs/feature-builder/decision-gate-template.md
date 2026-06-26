# Decision Gate: <feature-slug> / <experiment-id>

> Copy to: docs/feature-builder/features/<feature-slug>/experiments/<experiment-id>/decision.md
> Filled by finish-experiment.sh + human review.

---

## Experiment Summary

**Feature:** <feature-slug>
**Experiment:** <experiment-id> — <title>
**Date:** YYYY-MM-DD
**Type:** research | build | validation

---

## Scorecard Result

| Dimension | Score | Weight | Weighted |
|---|---|---|---|
| ADS Compliance (0 violations = 100) | _/100 | 25% | _/25 |
| External Benchmark Parity | _/100 | 30% | _/30 |
| Functional Completeness | _/100 | 30% | _/30 |
| Reuse Compliance | _/100 | 15% | _/15 |
| **Composite** | | | **_/100** |

**P0 violations:** _count_  (any P0 = automatic reject)

---

## Acceptance Criteria

| Criterion | Pass? | Evidence |
|---|---|---|
| _fill_ | ✅ / ❌ | _fill_ |

---

## Validation Evidence

**TypeScript errors:** _count_
**ADS violations (touched files):** _count_
**Screenshot path:** _path or "N/A (research experiment)"_

---

## Decision

```
DECISION: keep | revise | reject | blocked

REASON: _fill_
```

---

## Decision Rules Applied

| Rule | Applied? |
|---|---|
| Composite ≥ 80 → eligible for keep | _yes/no_ |
| Zero P0 violations → eligible for keep | _yes/no_ |
| Zero TypeScript errors → eligible for keep | _yes/no_ |
| Screenshot provided (if UI) → eligible for keep | _yes/no_ |

---

## What Changed (keep decisions only)

- _list changed files_

## What Needs Fixing (revise decisions)

- _list specific issues_

## Why Rejected (reject decisions)

- _root cause_

## What Is Blocking (blocked decisions)

- _blocker description_
- **Unblocked by:** _person or event_

---

## Human Approval

- [ ] JK reviewed and approved
- [ ] Aiden reviewed and approved (if required)
- **Approved by:** _name_
- **Date:** _YYYY-MM-DD_
- **Notes:** _fill_
