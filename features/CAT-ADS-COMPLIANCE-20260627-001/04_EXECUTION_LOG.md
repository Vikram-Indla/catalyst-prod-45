# CAT-ADS-COMPLIANCE-20260627-001 — Execution Log

> Running log of all actions, decisions, and changes made during implementation.
> Append entries — never delete.

---

## Slice 1 — CI / pre-commit enforcement wiring (2026-06-27)

Goal: stop NEW ADS color violations from landing; no rendered-UI change.

### Changes
1. `scripts/ads-color-gate.cjs` (NEW) — ratchet gate. Runs the scanner, compares to baseline, fails only on an increase. `--update` lowers the baseline.
2. `design-governance/color-baseline.json` (NEW) — committed baseline (709).
3. `scripts/no-hardcoded-colors.cjs` — now honors `// ads-scanner:ignore-line` and `// ads-scanner:ignore-next-line` (convention already used in 100 places but previously ignored by the tool).
4. `package.json` — added `lint:colors`, `lint:colors:gate`, `audit:ads`.
5. `.husky/pre-commit` — added BLOCKING ratchet gate (audit stays informational).
6. `.github/workflows/ci.yml` — fixed tsc no-op (`-p tsconfig.app.json`); added blocking `lint:colors:gate` step.
7. `CLAUDE.md` — documented enforcement commands + escape hatch under the ADS-tokens section.

### Result
Gate validated (block-on-increase + escape-hatch). Tree clean. Awaiting commit approval.
