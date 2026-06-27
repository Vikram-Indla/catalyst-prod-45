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
Gate validated (block-on-increase + escape-hatch). Tree clean. Shipped — PR #289 (f71cb8f29).

---

## Slice 2 — Extend the ratchet to the full design-governance audit (2026-06-27)

Goal: block NEW Tailwind color utils / hardcoded font-size / off-grid spacing — what the hex scanner misses. Tooling only, same branch/PR #289.

### Changes
1. `scripts/ads-audit-gate.cjs` (NEW) — runs `design-governance/rules/audit.js src` ONCE, parses per-category totals (tokens/typography/spacing/fontImports), fails if any category exceeds baseline. Ignores the audit's own exit code (always 1 in STRICT mode). Retries once on incomplete output (audit emits ~8.6 MB), fail-safe (block) if still unparseable. `--update` ratchets baselines down.
2. `design-governance/audit-baseline.json` (NEW) — tokens 28913, typography 2201, spacing 1118, fontImports 0.
3. `package.json` — added `audit:ads:gate`.
4. `.husky/pre-commit` — replaced the informational audit run with the BLOCKING audit gate (audit now runs once, not twice) alongside the color ratchet.
5. `.github/workflows/ci.yml` — added blocking `audit:ads:gate` step.
6. `CLAUDE.md` — documented `audit:ads:gate` + per-category ratchet.

### Result
Validated: baseline PASS; injected Tailwind color util → FAIL (tokens 28913→28914, exit 1); cleanup PASS. Reliable across reruns after retry-hardening. Tree clean.
