# Session 011 — Command Room depth: segmented value bar (SRC-M5) (2026-07-09)

## Canonical-component gate (proof of unsuitability, per DESIGN-DIRECTION open item)
- Candidate probed: `src/components/shared/WorkItemsProgressBar.tsx` (canonical multi-segment bar). UNSUITABLE by contract: it buckets items by `status_category` into done/wip/todo COUNTS that partition a total. The value bar needs monetary MAGNITUDES with nested semantics — validated ⊆ realized, forecast as a marker against the planned reference, leakage as the planned−forecast gap. Composing @atlaskit/progress-bar (single-value) cannot express overlay/marker/gap either.
- Resolution: purpose-built `StrataValueBar` in strata `shared.tsx`, token-pure, following the in-module `StrataScoreRing` precedent ("no canonical gauge exists").

## Delivered
- `StrataValueBar` (shared.tsx): one track scaled to max(planned, forecast, realized); realized fill `--ds-background-success`, validated overlay `--ds-background-success-bold`, forecast 2px marker `--ds-border-bold`, leakage region `--ds-background-danger` (the visible gap when forecast < planned). Legend chips with swatches + `fmtSarCompact` values, zero-assumption dashes. Canonical Tooltip summary on the bar; `role="img"` + aria-label. No bare colors.
- Wired into `StrataPortfolioVmoPage` BenefitDetailSection above the Value profile JiraTable: active period preferred, else latest period with values; Validated = realized value only when `validation_status='validated'`.

## Validation
- tsc clean · 20/20 strata+sidebar tests · color gate 0=0 · audit gate at baseline.
- DOM on :8081 (`strata-value-bar`): "Planned SAR 8M · Forecast — · Realized SAR 6.5M · Validated SAR 6.5M" on Enterprise Revenue Uplift (proof) — matches the profile table exactly (planned pending, realized validated). Screenshot in chat for signoff.

## Remaining Command Room depth (next slices)
- Executive KPI band flavor on Strategy Room / Portfolio / Reviews landings (Command Center + Scorecards style).
- Board-pack editorial layout on Governance snapshots (SRC-M7).
- AC5 transitions instrumentation.
