# Karpathy Loop Log

## Loop 1 — Test Hub defect lineage (CAT-0001/CAT-0002/CAT-0004)
- Hypothesis: audit's PREREQUISITE_BYPASS findings mean lineage is broken in the execution-create path.
- Experiment: Explore agent traced actual call sites (CycleDetailPage, CreateStoryModal, defectsDataSource.ts) instead of trusting the static grep line alone.
- Measure: execution path already passes source_test_case_id/source_test_run_id correctly; only backlog quick-create paths omit it, and that's a legitimate standalone-creation pattern.
- Keep/Discard: Discarded "make ids mandatory" (would break legit backlog defects). Kept "surface the gap" — added visible "Not linked to a test case" state.
- Log: closes the real traceability concern (silent invisibility) without regressing a valid feature.

## Loop 2 — Empty cycle creation (CAT-0005)
- Hypothesis: gate via cycle status (force 'draft'-like) vs. gate via button disable.
- Experiment: read useTestCycles.ts — status enum has no non-executable 'draft' state (planned/active/completed/archived), so a status-based fix would need a schema change.
- Measure: button-disable achieves the same user-facing guarantee (no empty cycle saved) with zero schema risk, within the 2hr slice.
- Keep: button gating + inline hint. Discard: status-model change (deferred, flagged as out of scope for this slice).
