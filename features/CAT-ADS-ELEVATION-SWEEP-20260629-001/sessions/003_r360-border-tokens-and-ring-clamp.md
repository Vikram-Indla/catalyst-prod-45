# Session 003 — R360 border-width tokens + ring-card title clamp fix

Date: 2026-06-29
Branch: fix/ads-elevation-sweep
Feature Work ID: CAT-ADS-ELEVATION-SWEEP-20260629-001

## Objective
1. ADS border foundation gap analysis (https://atlassian.design/foundations/border) + apply width tokens to the R360 surface.
2. Fix user-reported overlapping/“horrible” text on the Resource 360° ring cards.

## Gap analysis (border foundation)
- Repo-wide: 0/1959 border declarations used `--ds-border-width*` width tokens; 687 hardcoded `Npx solid` widths; 1272 borders with hardcoded colors.
- Tokens `--ds-border-width` (1px), `--ds-border-width-selected` (2px), `--ds-border-width-focused` (2px) exist in @atlaskit/tokens but were unused.
- Scoped first slice to the in-branch R360 surface only. Full 1959-site debt deferred to its own Feature Work ID + Plan Lock.

## Changes
### src/styles/r360.css (border widths → tokens)
- 14 visible border widths tokenized:
  - `1px solid var(--ds-…)` → `var(--ds-border-width) solid var(--ds-…)`
  - `1.5px solid` (`.r3-hier-item--current`, selected) → `var(--ds-border-width-selected) solid`
  - search focus `outline: 2px solid var(--ds-border-focused)` → `var(--ds-border-width-focused) solid …`
- Deliberately NOT touched: 11 `0px solid` (intentionally-zeroed borders — converting would paint borders), the L666 attribute selector matching inline `border: 1px solid var(--cp-border…)` (rewriting breaks the dark-mode override), and 3 decorative ring borders (3px avatar, 2px date-dots — outside the foundation’s width-token scope).
- No bare colors introduced. Visually identical (1px token = 1px) — confirmed by before/after on /my-team/<id>.

### src/pages/r360-member/RingView.tsx (ring-card title clamp)
- Root cause (DOM-probed): the title’s `-webkit-line-clamp: 2` was dead because the title was a direct child of the `display:flex` card → its `-webkit-box` was blockified to `flow-root`, disabling the clamp. Title spilled to 3 lines (scrollH 65 > clientH 61) and overlapped the `IN REQUIREMENTS` lozenge.
- Fix: wrap the title in a plain block flex-item (`flex:1 1 auto; overflow:hidden`); move the `-webkit-box` clamp to a non-flex inner div.

## Validation (raw)
- `npm run lint:colors:gate` → ✅ 76 = baseline 76. No new hard-coded colors.
- `npm run audit:ads:gate` → ✅ no category above baseline (tokens 27628/27635 — dropped 7).
- Live DOM probe (/for-you/r360, Adnan Ali, 4 cards): every card titleLines=2, ellipsisShown=true, badgeOverlapsTitle=false.
- Compiles: HMR rendered the change live (dark mode) without error.

## Notes / follow-ups
- Branch drifted from fix/r360-status-pill-typography → fix/ads-elevation-sweep mid-session (checkout changed externally). Pre-existing modified files on this branch (StatusBadge.tsx, RisksGridPage.tsx) belong to the elevation sweep — NOT staged here.
- Optional: ratchet audit-baseline.json tokens 27635→27628 to lock the gain (skipped to keep commit surgical).
- Next border slice candidates: src/index.css, product-kanban/planhub CSS (own Plan Lock).
