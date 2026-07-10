# Session 018 — Create/Edit functional workflow verification (2026-07-09)

## Scope
Vikram's ask: verify the actual user entry points and create/edit flows across the full STRATA operating hierarchy (Strategy Execution / Balanced Scorecard / VMO / Governance). No new features. Full report: 60_delivery/CREATE_EDIT_VERIFICATION.md.

## What was exercised LIVE (UI, staging, disposable ZZTEST data — all deleted after, 0 rows remain)
Cycle create · Theme create · Objective create (theme-restricted parent) · element Edit/rename · Project Card create (single-theme required) · Project Objective create · Project KPI create · Milestone create · Dependency create with blocker flag · Portfolio create · card→portfolio member add · Decision create (DEC-1101) · Action create (ACT-1101). Probed (modal verified, not submitted): cycle edit, portfolio edit, Add value (kinds Baseline/Planned/Forecast/Realized + independent Validate), KPI/OKR library, Lock snapshot/Close period (prior sessions).

## Key results
- All four areas have working, role-gated authoring with server-side validation surfaced in-modal ("Action rejected · …").
- Guards verified: theme cannot join portfolio (UI type list + session-005 DB negative tests); card→strategic-objective trigger blocks cross-theme and accepts same-theme (SQL probe, rolled back / cleaned).
- **D-BUILD-004 found**: project-objective upward link to a Theme Objective is NOT theme-validated (UI unfiltered + `strata_create_project_objective` missing the check). Reported, not fixed.
- Gaps (by design or missing): no UI for card `objective_element_id`; scorecard models/instances/perspectives have no authoring (no UI, no RPC — governed seeds + approve only); Risk is a text field, not an entity.

## Environment discipline
Staging only; writes limited to ZZTEST-prefixed test rows via the app's own RPCs + one guarded-column SQL probe; full cleanup verified (`remaining=0`). Prod untouched. No code changes.
