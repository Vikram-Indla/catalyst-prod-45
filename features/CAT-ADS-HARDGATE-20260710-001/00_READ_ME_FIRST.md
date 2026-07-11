# CAT-ADS-HARDGATE-20260710-001 — Hard color gate + full color-debt remediation

## Objective
1. **Stop the bleed**: an unbypassable ADS-color gate — no dev (or agent) can land a bare/hardcoded/tailwind color, verified server-side (GitHub required check), not just pre-commit.
2. **Remediate** the existing hardcoded-color debt to zero, in ratcheted, visually-verified slices.

## Root cause (why the old gate did nothing)
- ESLint color rules are `"warn"` and CI `npm run lint` is `continue-on-error: true` → decorative.
- `scripts/no-hardcoded-colors.cjs` whitelists `var(--ds-*, #hex)` fallbacks AND has a buggy
  multiline-comment tracker → reports **0** while ~10,187 raw color matches exist. Baseline=0 → passes forever.

## Decisions (Vikram, 2026-07-10)
- **Gate model**: block-new / grandfather-old. Rules → error, enforced on CHANGED files (lint-staged +
  CI-on-diff) + GitHub branch-protection required check.
- **Hex fallbacks**: STRIP `var(--ds-*, #hex)` → `var(--ds-*)` (token-only). Verify token resolution per slice.

## Remediation surface (measured 2026-07-10)
| Bucket | Count |
|---|---|
| Tailwind color utils (`bg-blue-500`…) | ~5,924 |
| `var(--ds-*, #hex)` + `token('x','#hex')` fallbacks | ~2,447 |
| Token DEFINITIONS (`--ds-x: #hex`) — LEGIT, keep | 204 |
| Bare hex / rgba / gradients / named colors | remainder |

Token-definition files (hex is legit): `src/index.css`, `src/styles/catalyst-ads-chart-tokens.css`,
`src/styles/catalyst-ads-parity.css`.

## Phases
- **Phase 0** — Stop the bleed: strict scanner + changed-files gate (pre-commit + CI) + branch-protection doc. Zero UI risk.
- **Phase 1** — Tailwind utils → ADS tokens (biggest bucket).
- **Phase 2** — Strip hex fallbacks → token-only.
- **Phase 3** — CSS bare/named/rgba/gradient colors.
Each remediation slice: convert → tsc/build → visual-check → ratchet baseline down → commit.
