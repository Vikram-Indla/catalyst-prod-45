# Session 008 — W5: period-close readiness checklist (advisory)

**Date:** 2026-07-10 · **App:** localhost:8080 → staging · **Final wave of the closeout**

## Delivered (UI-only — reuses the W4 engine, no new migration)

- Reviews page "Period governance" panel gains a **Close readiness** checklist
  (advisory), shown only while the period is open. Six checks derived from the
  period-scoped `strata_needs_attention(activePeriod)` feed + open decisions:
  KPI actuals submitted (missing_actual), Actuals attested (pending_attestation),
  Benefit values validated (pending_benefit_validation), Actions cleared
  (overdue_action), Gates decided (overdue_gate), Decisions resolved (open decisions).
- Each check shows "Clear" (success) or its pending count (moved); a header lozenge
  sums them ("Ready to close" / "N to resolve"). Caption states it is advisory —
  the DB still enforces the real attestation guard; the Close period button is NOT
  gated by this checklist (Plan Lock: warnings only; hard gating deferred to a
  future admin policy).

## Live proof (screenshot in chat) — matches SQL ground truth

`strata_needs_attention('…Q2 FY2026…')` + open decisions on staging:
missing_actual=2, pending_benefit_validation=8, open_decisions=1, others=0 → 11.

UI rendered: header "**11 TO RESOLVE**"; KPI actuals submitted **2**, Benefit values
validated **8**, Decisions resolved **1**; Actuals attested / Actions cleared /
Gates decided all **Clear**. Close period button remained enabled. Zero console errors.

## Validation

- tsc rc=0 · vitest strata 19/19 · color gate 0=0 · ads-audit-gate passes
  (new inline spacing uses var(--ds-space-*); no net-new hardcoded px).

## Closeout status
W1–W5 all complete and screenshot-verified. See 07_HANDOVER.md.
