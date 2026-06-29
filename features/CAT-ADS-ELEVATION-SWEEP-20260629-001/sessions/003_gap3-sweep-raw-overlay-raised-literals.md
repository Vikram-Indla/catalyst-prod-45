# Session 003 — Slice 2/3 (Gap 3): sweep raw elevation literals → tokens

**Date:** 2026-06-29
**Branch:** fix/ads-elevation-sweep

## Scope correction
Original Plan Lock "130 CSS raw shadows" was inflated by the border-width codemod
artifact: all 123 CSS `box-shadow` lines already reference `var(--ds-shadow-*, …)`
(the dead-code Gap 2 form), and the only truly-raw CSS lines are focus rings
(non-scope). The genuine raw elevation literals live in JS `boxShadow:` strings.

## Change — 20 literals across 13 files (all release-area)
- 18 overlay literals → `var(--ds-shadow-overlay)`
  (the ×15 `0 8px 24px rgba(9,30,66,0.16)…` cluster + 8px-28/24/12px variants)
- 2 raised literals (`0 1px 2-3px rgba(9,30,66,.08)`) → `var(--ds-shadow-raised)`
- Stripped the now-false `ads-scanner:ignore-line — …no ds-shadow token…` comments
  (the token DOES exist; that rationale was wrong).

## HELD for separate signoff (heavy outliers — visible reduction)
- `0 24px 64px rgba(9,30,66,.34)` — HuddleWindow.tsx:254
- `0 20px 32px rgba(9,30,66,0.25)` ×2 — ReleaseManagementPage.tsx:159,191

## Verification (raw)
- DOM probe @ /catalyst/testpage (dark): rawNavyRemaining=0; an open overlay
  resolves to `rgba(1,4,4,0.36) 0 8px 12px` + 1px ring = `--ds-shadow-overlay`. No regression.
- lint:colors:gate ✅ 76=76 (lines were ignore-listed, count unchanged).
- audit:ads:gate ✅ no category above baseline (tokens/typography dropped — NOT
  ratcheted: drop entangled with other uncommitted tree work; gate is increase-only so safe).
- `git diff` of the 13 files: only boxShadow lines changed; staged 20↔20.

## Next
Heavy outliers (3 sites) — individual screenshot signoff, then commit.
