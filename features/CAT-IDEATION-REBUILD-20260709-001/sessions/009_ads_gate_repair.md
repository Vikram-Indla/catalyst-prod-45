# Session 009 — ADS gate repair

**Date:** 2026-07-11  
**Feature Work ID:** CAT-IDEATION-REBUILD-20260709-001

## Symptom

The repository pre-commit hook blocked a documentation commit because the global ADS audit rose
from tokens 19969→19970 and typography 1366→1367.

## Proven cause

Comparing the baseline commit `b4c4998bb` with current `main` isolated both deltas to
`StartEvaluationArea`, introduced by `9b0f7ee62`:

- hardcoded `paddingTop: 20` on a line already containing layout spacing;
- `textTransform: 'uppercase'` and `letterSpacing: '0.04em'`.

The staged DocIntel files are documentation-only and did not cause the failure.

## Authorized repair

Use ADS space tokens and sentence case. Do not raise the audit baseline. Preserve unrelated staged
DocIntel and TestHub files without modification.

## Verification

- Targeted scanner: `StartEvaluationArea` = 0 token/typography violations.
- `npm run lint:colors:gate`: PASS, 0/0.
- `npm run audit:ads:gate`: PASS — tokens 19969/19969, typography 1366/1366,
  spacing 0/0, font imports 0/0.
- `git diff --check`: PASS.

The first mechanical replacement matched an older identical layout line in `DecisionArea`; the
targeted scanner exposed that false-positive risk even though the global totals passed. That change
was reverted and the exact `StartEvaluationArea` block was repaired. This is why target-scoped
verification remains mandatory in addition to repository-wide ratchets.
