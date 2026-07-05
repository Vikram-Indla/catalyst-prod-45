# Decisions

- 2026-07-05: Scoped to Slice 1 = Test Hub P0s only, not full 1000-finding remediation in one pass. Reason: CLAUDE.md 2-hour-slice rule + honest-proof requirement (can't runtime-verify 8 modules' worth of mental-model rebuilds in one session). All other findings staged in ledger as Deferred with wave assignment, not dropped.
- 2026-07-05: Incident Hub's 2 P0s excluded from Slice 1 because they originate from a different active feature's handover doc (CAT-INCIDENT-GOVERNANCE-20260703-001) that may already be stale/closed — requires its own verification pass before acting, scheduled to Slice 3.
