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

---
## Phase 2 slice 1a — CSS --ds fallback strip (same session)
- Codemod `scripts/strip-ds-fallback-hex.cjs`: strips `var(--ds-*, <color>)` → `var(--ds-*)`
  (ADS runtime guarantees --ds-* resolve; nested/--cp-/bespoke fallbacks left).
- Applied to 61 CSS files: **2,151 fallbacks removed**. Total 11,980 → **9,735**.
- **vite build PASSED** (50s, exit 0) — no visual/structural regression.
- Fixed detector bug: `fallbackWrap` now balanced-paren aware (a bare hex AFTER a
  closed `var(--x,#a)` was misclassified as fallback-hex).
- Upgraded changed-gate to **net-new** semantics: a colour fails only if its
  (category,value) count ROSE vs base — remediation/relocation never self-blocks,
  additions/duplications still fail. Proven: new-file FAIL, duplicate-existing FAIL,
  removal PASS.
- Baselines ratcheted: strict 9,735; fallback-hex 4,379 → 2,274.
