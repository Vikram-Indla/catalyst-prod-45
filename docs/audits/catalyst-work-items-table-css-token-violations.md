# Catalyst Left Panel Navigator — CSS / Token Violation Audit

> Preflight audit — 2026-05-21. No fixes applied.
> Primary files scanned: `src/styles/allwork.css`, `src/components/workhub/issue-view/IssueListPanel.tsx`
> Evidence: Rovo spec + CLAUDE.md ADS guardrail.

---

## Violation Table

| File | Line | Current value | Violation type | Why it violates ADS/token parity | Suggested token replacement | Confidence |
|---|---|---:|---|---|---|---|
| `allwork.css` | 8 | `--aw-bg: var(--cp-bg-elevated, ...)` | Custom `--cp-*` token root | `--cp-bg-elevated` is a Catalyst-proprietary token, not ADS. Fallback chain is triple-nested and fragile. | `var(--ds-surface, #FFFFFF)` | High |
| `allwork.css` | 9 | `--aw-bg-subtle: #F7F8F9` | Hardcoded hex | Should be an ADS token | `var(--ds-background-neutral, #F7F8F9)` | High |
| `allwork.css` | 10 | `--aw-hover: var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))` | Wrong token for hover | `--ds-surface-sunken` is elevation, not hover. Hover background = `color.background.neutral.subtle.hovered` | `var(--ds-background-neutral-subtle-hovered, #091E420F)` | High |
| `allwork.css` | 11 | `--aw-text: var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))` | Over-nested fallback chain with `--cp-*` tokens | Three levels of fallback; two use non-ADS tokens | `var(--ds-text, #172B4D)` | High |
| `allwork.css` | 12 | `--aw-text-subtle: var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))` | Non-ADS intermediate token | `--cp-text-secondary` is not an ADS token | `var(--ds-text-subtlest, #6B778C)` | High |
| `allwork.css` | 13 | `--aw-border: rgba(9,30,66,0.13)` | Raw `rgba()` | Hardcoded raw color — should be ADS border token | `var(--ds-border, #091E4224)` | High |
| `allwork.css` | 14 | `--aw-blue: #0C66E4` | Hardcoded hex root variable | Not a token — hard-coded brand blue | `var(--ds-border-brand, #0C66E4)` or `var(--ds-text-brand, #0C66E4)` depending on use | High |
| `allwork.css` | 15 | `--aw-selected: #E9F2FF` | Hardcoded hex | Should be ADS selected background token | `var(--ds-background-selected, #E9F2FF)` | High |
| `allwork.css` | 16 | `--aw-selected-outline: rgba(12,102,228,0.25)` | Raw `rgba()` | Not an ADS token | `var(--ds-border-focused, rgba(12,102,228,0.25))` | Medium |
| `allwork.css` | 57 | `border: 1px solid var(--aw-border)` on `.awToolbarBtn` | Indirect raw rgba via `--aw-border` | Resolves to `rgba(9,30,66,0.13)` — not an ADS token | `border: 1px solid var(--ds-border, #091E4224)` | High |
| `allwork.css` | 87 | `border-color: #85B8FF` on `:focus-within` | Hardcoded hex | Not an ADS focused border token | `var(--ds-border-focused, #388BFF)` | High |
| `allwork.css` | 180 | `grid-template-columns: var(--aw-left, 240px) 1px minmax(0, 1fr)` | Panel width 240px | 240px is below spec minimum of ~360px; hard-coded size not via token | Increase to at least 360px; consider `clamp(360px, 30vw, 420px)` | High |
| `allwork.css` | 246 | `font: 500 13px/28px system-ui, -apple-system, sans-serif` on `.jlpSortBtn` | 13px font size | Not on ADS 4px grid. ADS text sizes: 11, 12, 14, 16, 20, 24, 28 | `font-size: 14px` | High |
| `allwork.css` | 254 | `background: #E9F2FF` on `.jlpSortBtn:hover, .jlpSortBtn.active` | Hardcoded hex | Should be ADS selected background token | `var(--ds-background-selected, #E9F2FF)` | High |
| `allwork.css` | 255 | `color: #0C66E4` on `.jlpSortBtn:hover, .jlpSortBtn.active` | Hardcoded hex | Should be ADS brand text token | `var(--ds-text-brand, #0C66E4)` | High |
| `allwork.css` | 281 | `border: 1px solid var(--aw-border)` on `.jlpSortMenu` | Indirect raw rgba | Resolves to `rgba(9,30,66,0.13)` | `var(--ds-border, #091E4224)` | High |
| `allwork.css` | 283 | `box-shadow: 0 4px 16px rgba(9,30,66,0.15)` on `.jlpSortMenu` | Raw `rgba()` box-shadow | Not using ADS elevation tokens | `var(--ds-shadow-overlay, 0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31))` | High |
| `allwork.css` | 289 | `font: 600 12px/16px system-ui` on `.jlpSortMenuTitle` | Hard-coded font weight 600 | 12px/600 is valid ADS; but system-ui bypasses ADS font-family token | Use `font-family: var(--ds-font-family-body, ...)` or rely on cascade | Medium |
| `allwork.css` | 304 | `accent-color: #0C66E4` on radio inputs | Hardcoded hex | Not tokenized | `accent-color: var(--ds-background-brand-bold, #0C66E4)` | High |
| `allwork.css` | 313 | `overflow-y: scroll !important` on `.jlpBody` | `!important` flag | CLAUDE.md prohibits `!important`. Forces scroll even when content fits. | Remove `!important`; use `overflow-y: auto` | High |
| `allwork.css` | 320 | `::-webkit-scrollbar { width: 20px }` | Oversized scrollbar | Spec requires 6–8px thin scrollbar | `width: 6px` | High |
| `allwork.css` | 323 | `background: #F1F2F4` on scrollbar track | Hardcoded hex | Should be transparent per spec | `background: transparent` | High |
| `allwork.css` | 324 | `border-left: 1px solid #EBECF0` on scrollbar track | Hardcoded hex | Should be transparent | Remove or use `var(--ds-border-subtle, #EBECF0)` | Medium |
| `allwork.css` | 327 | `background: #A5ADBA` on scrollbar thumb | Hardcoded hex | Not tokenized | `var(--ds-background-neutral-bold, #626F86)` | High |
| `allwork.css` | 329 | `border: 3px solid #F1F2F4` on scrollbar thumb | Hardcoded hex | Not tokenized | `border: 3px solid transparent` with `background-clip: content-box` | Medium |
| `allwork.css` | 332 | `background: #7A869A` on scrollbar thumb hover | Hardcoded hex | Not tokenized | `var(--ds-background-neutral-bold-hovered, #7A869A)` | High |
| `allwork.css` | 351 | `padding: 12px 16px` on `.jlpCard` | Spacing off-grid | 12px is not on the ADS 4px grid (valid values: 4/8/16/24/32). Spec says `padding: 16px`. | `padding: 16px` | High |
| `allwork.css` | 357 | `background: var(--aw-hover)` on `.jlpCard:hover` | Wrong token via variable | Resolves to `var(--ds-surface-sunken, #F4F5F7)` — incorrect hover token | `var(--ds-background-neutral-subtle-hovered, #091E420F)` | High |
| `allwork.css` | 359 | `background: #E9F2FF` on `.jlpCard.jlpCardSelected` | Hardcoded hex | Should be ADS selected background token | `var(--ds-background-selected, #E9F2FF)` | High |
| `allwork.css` | 360 | `border-left-color: #0C66E4` on `.jlpCard.jlpCardSelected` | Hardcoded hex | Should be ADS brand border token | `var(--ds-border-brand, #0C66E4)` | High |
| `allwork.css` | 363 | `-webkit-line-clamp: 2` on `.jlpCardSummary` | **Spec violation** | Spec explicitly says no truncation | Remove entirely | High |
| `allwork.css` | 363 | `overflow: hidden` on `.jlpCardSummary` | Causes truncation with clamp | Only present because of clamp — remove with clamp | Remove | High |
| `allwork.css` | 365 | `font: 400 14px/20px system-ui, -apple-system, sans-serif` on `.jlpCardSummary` | `system-ui` font family | Not using ADS font-family token | `font-family: var(--ds-font-family-body, ...)` or let cascade | Low |
| `allwork.css` | 374 | `color: #0C66E4` on `.jlpCardSummaryActive` | Hardcoded hex | Should be ADS selected text token | `var(--ds-text-selected, #0C66E4)` | High |
| `allwork.css` | 390 | `font: 500 12px/16px system-ui` on `.jlpCardKey` | 12px key text | Spec says 13px/500. 13px not on ADS scale (14px is closest). However key uses 13px intentionally per spec. | Leave at 13px per spec; document as Jira-parity override | Medium |
| `allwork.css` | 391 | `color: var(--aw-text-subtle)` on `.jlpCardKey` | Resolves to `var(--ds-text-subtlest, #6B778C)` | Spec says inactive key = `#44546F` (`color.text.subtle`), not `color.text.subtlest` | `var(--ds-text-subtle, #44546F)` | High |
| `allwork.css` | 426 | `font: 400 13px/16px system-ui` on `.jlpFooterCount` | 13px font | Not on ADS scale | `font-size: 14px` | High |
| `allwork.css` | 434 | `color: #0C66E4` on `.jlpFooterCount strong` | Hardcoded hex | Should be ADS brand text token | `var(--ds-text-brand, #0C66E4)` | High |
| `allwork.css` | 484–503 | Multiple `.dark .jlp*` rules with hardcoded colors: `rgba(12,102,228,0.15)`, `#4C9AFF` | Dark mode one-off overrides | ADS tokens flip dark/light natively via `setGlobalTheme`. These overrides are unnecessary if tokens are used correctly and prevent ADS dark theme from working. | Replace all `.dark .` overrides with proper `var(--ds-*)` tokens | High |
| `allwork.css` | 496 | `background: rgba(12,102,228,0.12)` dark selected | Raw `rgba()` | Not ADS token | `var(--ds-background-selected, ...)` (token auto-darkens) | High |
| `allwork.css` | 499 | `color: #4C9AFF` dark active key | Hardcoded hex | Light-blue for dark mode — not an ADS token | `var(--ds-text-brand, ...)` (token auto-darkens) | High |
| `IssueListPanel.tsx` | 197 | `<JiraIssueTypeIcon type={item.issue_type} size={16}>` | 16px icon size | Spec says 20px | Change to `size={20}` | High |
| `IssueListPanel.tsx` | 200 | `<CatalystOwnerAvatar size="md">` | Custom avatar component | Spec requires `@atlaskit/avatar Avatar size="small"` (28px) with `border: 2px solid #FFFFFF` | Replace with `@atlaskit/avatar` or fix size and add white ring | High |
| `IssueListPanel.tsx` | 247 | `` {sortedItems.length} of <strong>{sortedItems.length >= 1000 ? '1000+' : sortedItems.length}</strong> `` | Logic bug | Both numbers use `sortedItems.length` — `totalCount` prop ignored | Use props: `{loadedCount} of <strong>{totalCount >= 1000 ? '1000+' : totalCount}</strong>` | High |
| `IssueListPanel.tsx` | 2 | `import { ChevronDown, ArrowUpNarrowWide, ArrowDownNarrowWide, RotateCcw } from '@/lib/atlaskit-icons'` | Lucide icons via shim | `@/lib/atlaskit-icons` re-exports Lucide icons — not `@atlaskit/icon`. All icons violate ADS | Replace with `@atlaskit/icon` imports | High |

---

## High-Priority Violation Summary

### P0 — Fix before any PR

1. **`-webkit-line-clamp: 2`** — explicit spec violation. Cards must show full summary.
2. **`overflow-y: scroll !important`** — `!important` is banned per CLAUDE.md.
3. **`totalCount` ignored** — footer count is factually wrong (both sides show rendered count).
4. **Panel width 240px** — below minimum ~360px per spec.

### P1 — Fix in same pass

- Replace all `var(--cp-*)` custom tokens with `var(--ds-*)` ADS tokens
- Replace all raw hex + `rgba()` values with ADS token equivalents
- Remove all `.dark .` override rules — use tokens that auto-flip
- Fix scrollbar width (20px → 6–8px)
- Fix icon sources (Lucide → `@atlaskit/icon`)
- Fix hover token (`--ds-surface-sunken` → `--ds-background-neutral-subtle-hovered`)
- Fix key color token (`color.text.subtlest` → `color.text.subtle`)

### Dark Mode Violations (all `allwork.css` lines 484–503)

Every `.dark .jlp*` rule is a violation. The ADS token system handles dark mode natively — these overrides should not exist. Total count: ~20 dark-mode override rules that need to be deleted once tokens are corrected.
