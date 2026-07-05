# Plan Lock — Slice 1

See /Users/vikramindla/.claude/plans/sorted-skipping-penguin.md (approved) for full Slice 1 plan lock text. Summary:
- Scope: feature folder + ledger/plan docs infra + fix 4 Test Hub P0 findings only (CAT-0001, CAT-0002, CAT-0004, CAT-0005).
- Non-scope: 994 P1s, 2 Incident Hub P0s (different active feature, needs re-verification), all other modules.
- Timebox: 2hr slice rule.
- Files forbidden: anything outside src/hooks/test-management/useDefects.ts, src/modules/project-work-hub/adapters/defectsDataSource.ts, src/pages/testhub/cycles/CyclesPage.tsx (+ execution call site TBD from investigation), and docs/audits/*.
- Stop condition: after Slice 1 P0 fixes verified, report and get sign-off before Slice 2 (Release Hub).
