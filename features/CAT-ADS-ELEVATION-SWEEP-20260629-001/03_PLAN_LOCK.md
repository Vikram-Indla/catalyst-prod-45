# PLAN LOCK — CAT-ADS-ELEVATION-SWEEP-20260629-001

**Feature Work ID:** CAT-ADS-ELEVATION-SWEEP-20260629-001
**Date:** 2026-06-29
**Owner:** Vikram-Indla
**Status:** AWAITING APPROVAL — no code until explicit go-ahead

---

## OBJECTIVE

Apply ADS elevation (https://atlassian.design/foundations/elevation) across Catalyst:
make every elevated surface derive its depth from the canonical `--ds-shadow-*`
tokens, paired correctly with `--ds-surface-*`, and retire all hand-rolled shadows.

Scope approved by Vikram: **FULL SWEEP — all 4 gaps.**

## NON-SCOPE

- Focus rings (`0 0 0 2-3px rgba(...)`) — these are `--ds-border-focused`, NOT
  elevation. Flagged, handled in a separate pass. **Do not touch in this feature.**
- Surface *color* values / tonal ramp (owned by CAT-ADS-PARITY).
- Any component, markup, behavior, or business-rule change. Styling only.

## GAP ANALYSIS (evidence, 2026-06-29)

| Gap | Finding | Sites |
|---|---|---|
| 1 | Duplicate/conflicting shadow authorities — `index.css:6115-6116` `!important` overrides `catalyst-ads-parity.css:82-84,152-155` | 2 blocks |
| 2 | `--ds-shadow-*` (a box-shadow string) misused as a *color* value in `--cp-*` aliases | `index.css:166,253-257,304,374-375` (~7) |
| 3 | Raw hardcoded elevation shadows bypassing tokens | 130 CSS + 72 JS = **202** |
| 4 | `surface.raised`/`surface.overlay` paired with raw shadows, not matched token | subset of 721 surface sites |

**Token mapping (Gap 3):**
- `0 1px 2-3px rgba(9,30,66,.08)` → `var(--ds-shadow-raised)`
- `0 8px 24px …0.16, 0 2px 4px …` (×15) + `0 20-24px …` → `var(--ds-shadow-overlay)`
- `0 0 12px …` glow → `var(--ds-shadow-overflow)`

**⚠️ Regression flag:** common hardcoded overlay (`0 8px 24px …0.16`) is heavier than
ADS token (`0 4px 8px …0.15`). Sweep lightens it — correct-to-spec but visible →
mandatory screenshot signoff, light + dark.

## SLICES (each ≤2h, separate commit, separate screenshot signoff)

- **Slice 1 — Authorities + misuse (Gap 1+2).** Delete duplicate `--ds-shadow-*`
  block in `index.css`; repoint ~7 `--cp-*` color slots off `--ds-shadow-*` onto
  proper color tokens (`--ds-border`/`--ds-border-subtle`). No visual shadow change.
- **Slice 2 — CSS raw shadows (Gap 3, 130 sites).** Replace `box-shadow` literals
  with `var(--ds-shadow-*)` per mapping. Screenshot signoff.
- **Slice 3 — JS raw shadows (Gap 3, 72 sites).** Replace `boxShadow:` literals.
  Screenshot signoff.
- **Slice 4 — Pairing audit (Gap 4).** Verify each `surface.raised`/`.overlay`
  carries its matched shadow token. Screenshot signoff.

## FILES — top hotspots (full list enumerated per slice before edit)

`src/index.css`, `src/styles/catalyst-ads-parity.css`,
`src/components/releases/**`, `src/pages/release-hub/**`,
`src/pages/jira-clone/ReleaseManagementPage.tsx`,
`src/modules/project-work-hub/components/SubtasksPanel/**`,
`src/components/layout/{HuddleWindow,HuddleIncoming,HubSwitcher}.tsx`,
`src/components/shared/CatalystDetailPanel.tsx`.

## FILES FORBIDDEN

Any `*.test.*`, `*.snap`, node_modules, vendored `@atlaskit/*`.

## UI/UX RULES

- ADS tokens only. Zero new hex/rgba/hsl in touched lines.
- Pairing rule enforced: raised→shadow.raised, overlay→shadow.overlay; sunken/default → no shadow.
- `var(--ds-shadow-*)` with **no** hex fallback (token is now defined).

## VALIDATION COMMANDS

```bash
npm run lint:colors:gate
npm run audit:ads:gate
npx tsc --noEmit -p tsconfig.app.json   # expect ~157 baseline errors, no new
grep -rnE "(box-shadow|boxShadow:)[^;,}]*(rgba?\(|#[0-9a-fA-F])" src/ | grep -v var(--ds-shadow  # → count drops per slice
```

## SCREENSHOT CHECKLIST (light + dark each)

Modal (AddWorkItemsModal), dropdown/flyout (HubSwitcher), side panel
(ReleaseSidePanel / CatalystDetailPanel), card (ReleasesTable row), huddle window.

## STOP CONDITIONS

- Any surface loses/gains visible depth in a way that breaks hierarchy → stop, raise RED FLAG.
- tsc new errors > 0, or lint:colors:gate / audit:ads:gate fails → stop.
- One correction loop per slice, then accept / split / revert.

## DRIFT / REBASELINE

After each slice reduces raw-shadow count, ratchet baselines down:
`node scripts/ads-color-gate.cjs --update`, `node scripts/ads-audit-gate.cjs --update`, commit baseline files.
