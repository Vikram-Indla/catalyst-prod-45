# Session 002 — integrity states + incomplete-draft save (2026-07-18)

Contract addendum (user prompt + screenshot `codex-clipboard-e98dc0ca`): Model Integrity reports
"has no measures assigned" while the measures editor holds unsaved rows totalling 50/50.

## Root cause
1. `ScorecardModelsSection` computes `computeModelIntegrity` from PERSISTED `allMeasures`;
   the editor's unsaved `draft` (local to `MeasureGroups`) is invisible to it → stale
   persisted validation mixed with current form rows.
2. `MeasureGroups` disables Save while any group total ≠ 100 ("must total 100 before saving"),
   so an incomplete draft can never persist. Server RPC `strata_set_model_measures`
   deliberately does NOT enforce totals — the block is client-only and contradicts the contract.

## Plan
- `lib/modelIntegrity.ts`: tolerance-safe (±0.01, mirrors server) + structured per-perspective
  coverage states (no_measures / underweight / overweight / valid) + shared header-label helper.
- `StrataAdminConfigPage`: MeasureGroups reports live draft rows up (ref-guarded effect);
  section computes live integrity while editing (band labeled "unsaved"), persisted otherwise;
  submit blocked with honest reason while dirty; save gate removed, replaced by informational
  incomplete-totals note; group headers show remaining/remove.
- New migration `20260718210000`: `strata_validate_scorecard_model` distinguishes
  underweight (assign the remaining N) / overweight (remove N) for both perspective and
  measure totals; zero-measures message unchanged. Apply to staging cyijbdeuehohvhnsywig.
- Tests: unit (4 states + tolerance), component (live band + save-incomplete + submit gate),
  migration guard update, staging DB probe, browser journey ×2.

## Guardrails
- Foreign dirty hunks (breadcrumb work at StrataAdminConfigPage:3568 + 12 other files +
  untracked ProjectPageHeader test) must NOT be staged. Explicit-path staging;
  `git diff --cached --name-status` before commit; re-check `git log` after (GH Desktop hazard).
