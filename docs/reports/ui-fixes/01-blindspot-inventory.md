# 01 — Blindspot Inventory (verified against live HEAD, branch `ui-fixes`)

Each contract blindspot (acceptance §1) re-verified against the actual repo HEAD (the contract was generated from a snapshot zip; line numbers had drifted).

| # | Blindspot | Verified? | Live evidence (HEAD) | Severity | Status |
|---|---|---|---|---|---|
| 2 | `audit:contrast` broken | ✅ TRUE → **FIXED** | Built `scripts/ads-contrast-gate.cjs` (theme-aware, ratcheted, `--live`); `npm run audit:contrast` now PASSes (689 baselined; catches bg-token-as-fg regressions — verified exit 1 on injected `--ds-background-neutral` color) | P1 | **FIXED** |
| 3 | `lint:accessibility` broken | ✅ TRUE → **FIXED** | Built `scripts/audit-accessibility.cjs` (static + `--live` axe, ratcheted); `npm run lint:accessibility` now PASSes (345 baselined: 238 `outline:none`-no-focus, 107 `img`-no-alt) | P1 | **FIXED** |
| 7 | Notif drawer dark title invisible | ✅ TRUE → **FIXED** | `NotificationPanel.tsx:130` `text1 = var(--ds-background-neutral)`; live probe: title color `rgba(206,206,217,0.07)` @28px, composited ≈1.1:1 on `rgb(43,44,47)` | **P0** | **FIXED + VERIFIED** (see report 05) |
| 8 | Notif rows non-token color + focus risk | ✅ TRUE | `DirectNotificationRow.tsx:102` `#6698FF`; `:175` `outline:none`; raw `rgba()` in panel `T` map | P1 | PARTIAL — panel `T` map rgba removed; DirectNotificationRow pending |
| 9 | Tiny 10/11px type tokens | ✅ TRUE | `theme-tokens.css:14-15` `--ds-font-size-50:10px`, `-100:11px` | P2 | OPEN |
| 6 | Theme ownership fragile | ⚠️ PARTIAL | `AdsThemeProvider.tsx` already documents + guards the Atlaskit `data-theme` clobber (2026-04-28 fix present) | — | MONITOR (must not regress) |
| 1,4,5,10-15 | Route/token/component/IA/a11y debt | ✅ TRUE | 433 unique route declarations; broken route-aware gates; widespread inline styles + direct lucide imports | P1/P2 | OPEN — full sweep pending re-approval |

## First fix applied this slice (P0)
**`src/components/notifications/NotificationPanel.tsx`**
- `T` map (was `isDark`-branched, mis-mapped roles) → theme-aware ADS semantic tokens:
  `text1 var(--ds-text)`, `text2 var(--ds-text-subtle)`, `text3 var(--ds-text-subtlest)`,
  `border var(--ds-border)`, `borderStrong var(--ds-border-bold)`,
  `hover var(--ds-background-neutral-subtle-hovered)`, `press var(--ds-background-neutral-subtle-pressed)`.
  Removed 4 raw `rgba()` values.
- Title font size `--ds-font-size-800` (28px, oversized) → `--ds-font-size-500` (17px, ADS panel-header role).

Root-cause class: **token debt** (background token used as foreground) + **IA/typography debt** (oversized header). Fixed at the token map, not per-element — cascades to all header/row text using `T.text1/2/3`.
