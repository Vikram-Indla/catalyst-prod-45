# Karpathy loop log

## S19 — trace truth

- Hypothesis: the downstream trace function claims a governed chain it cannot evidence.
- Experiment: inspect the latest effective function and all linkage columns.
- Measure: S9 contains no `strata_key_results` query; confirmed KR linkage is `strategic_assignment_id`.
- Decision: keep the defect finding and implement a forward-only replacement with explicit typed/effective aggregation provenance.
