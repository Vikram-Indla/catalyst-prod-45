# Drift Log — CAT-STRATA-CLOSEOUT-20260710-001

## CLOSEOUT-DRIFT-001 (2026-07-10, W3a) — notification rules: toggle, not full lifecycle
- **Plan said**: strata_notification_rules a fully governed table (draft→approve lifecycle).
- **Did**: envelope columns present for shape parity, but rules are on/off toggles driven by
  one admin-only audit-logged RPC (strata_set_notification_rule); NOT added to
  strata_governed_tables().
- **Why**: extending strata_governed_tables() changes the generic submit/approve/retire path
  shared by the other 12 governed sections — a regression surface disproportionate to a simple
  enable/disable switch. Governance intent preserved via admin-only + audit log.
- **Decision**: accepted; flag to Vikram if strict lifecycle is later required.
