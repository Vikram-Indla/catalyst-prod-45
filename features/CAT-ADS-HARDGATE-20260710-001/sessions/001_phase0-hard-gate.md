# Session 001 — Phase 0: hard gate (stop the bleed)

Date: 2026-07-10 · Branch: main

## Root cause found
- ESLint color rules = `"warn"`; CI `npm run lint` = `continue-on-error: true` → decorative.
- `no-hardcoded-colors.cjs` whitelists `var(--ds-*,#hex)` + buggy comment tracker → reports 0 while 11,980 exist.

## Built
- `scripts/ads-color-detect.cjs` — strict detector (real comment state machine; fallback-hex = violation; named colors; .js/.jsx; SVG attrs; tailwind).
- `scripts/ads-color-scan.cjs` — accurate full-tree count. **Truth: 11,980** (tailwind 5,960 · fallback-hex 5,467 · named 357 · rgb 120 · hex 74 · hsl 2).
- `scripts/ads-color-changed-gate.cjs` — **line-level** block-new gate (`--staged` / `--since`). Only colours on ADDED lines fail; pre-existing debt grandfathered.
- `scripts/ads-color-strict-gate.cjs` + `design-governance/color-strict-baseline.json` (11,980) — full-tree down-only ratchet.

## Wired
- `.husky/pre-commit` — changed-gate + strict ratchet (blocking).
- `.github/workflows/ci.yml` — HARD GATE (`--since origin/main`) + strict ratchet; checkout `fetch-depth: 0`.
- `package.json` — new scripts.
- `PREVENTION.md` — 4-layer model + **manual branch-protection step** (required check `build`) = the truly unbypassable lock.

## Proven
- New colored file → FAIL. Edit debt file w/ clean line → PASS. Edit debt file adding a color line → FAIL (only new line). Comment colors + clean `var(--ds-*)` → not flagged. All existing gates still green.

## Next
- Ask Vikram to set branch protection (Layer 4).
- Phase 1: tailwind utils (5,960) → ADS. Phase 2: strip fallback-hex (5,467). Phase 3: CSS bare/named/rgba. Ratchet strict baseline down each slice.
