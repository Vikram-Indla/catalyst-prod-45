# Baseline: sample-feature-2 / exp-000

**Date:** 2026-06-26
**Time:** 00:42

Record current state BEFORE any changes.

---

## Files to be Touched

| File | Current state | ADS violations | TS errors |
|---|---|---|---|
| _fill before starting_ | | | |

## Relevant Data State (research experiments)

```
_fill: table counts, row examples, schema state, route list, etc._
```

## Baseline ADS Audit (build experiments)

```
Run: node design-governance/rules/audit.js <target-files> 2>&1 | tail -20
Result: _fill_
```

## Baseline TypeScript (build experiments)

```
Run: npx tsc --noEmit 2>&1 | grep -c "error TS" 2>/dev/null || echo 0
Result: _ errors before this experiment
```
