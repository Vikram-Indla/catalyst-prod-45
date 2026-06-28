# Phase 5 Exception Audit — Escape Hatch Classification
**Feature Work ID:** CAT-ADS-COMPLIANCE-20260627-001
**Date:** 2026-06-28

Total escape hatches: 293

---

## CATEGORY A — Elevation Shadows (48 hatches, LOW risk)

**Pattern:** `rgba(9, 30, 66, 0.*)` — Jira Cloud elevation shadow palette

**Reason:** No ADS shadow token maps to this exact rgba series. This is the Jira Design System elevation palette, intentionally preserved for Jira-parity surfaces. The ADS provides `var(--ds-shadow-overlay)` and `var(--ds-shadow-raised)` but these are shorthand tokens, not the raw rgba values, and many Catalyst surfaces require the raw value for exact shadow stacking.

**Files affected (sample):**
- `ReleaseSidePanel.tsx`
- `WorkItemsSection.tsx`
- `releases/ReleaseDetailPanel.tsx` (16+ files total)

**Risk:** LOW — these are visual elevation only, not semantic color. Incorrect shadow weight doesn't indicate wrong state or mislead the user.

**Action:** KEEP — escape hatch is legitimate. If ADS ever adds a direct `--ds-shadow-*` token for these exact values, convert then.

---

## CATEGORY B — Chat / Empty State Brand Colors (17 hatches, LOW risk)

**Pattern:** Slack green `#4A154B`, `#ECB22E`, Jira blue `#0052CC` — all channel/integration empty states

**File:** `src/modules/workhub/ChannelEmptyState.tsx`

**Reason:** These are third-party brand colors (Slack, Jira, Google) used in integration illustration/icons. No ADS token maps to an external brand color. Using an ADS token here would be factually wrong.

**Risk:** LOW — brand colors, not UI state colors

**Action:** KEEP — escape hatch is mandatory for third-party brand accuracy.

---

## CATEGORY C — Timeline / Gantt Chart Palette (20 hatches, LOW risk)

**Pattern:** `#FA8C16`, `#52C41A`, `#00B8D9`, `#13C2C2`, `#7B2FCC`, etc. — data visualization colors

**Files:** `Timeline.module.css`, `src/components/timeline/types.ts`, `ReplayWidget.tsx`

**Reason:** Data visualization requires a stable, perceptually-distinct color palette. These are chart series colors used for Gantt bars and status bands. ADS chart tokens (`var(--ds-chart-*)`) exist but many values here have no exact chart token equivalent. The chart tokens that do exist were applied where possible in Phases 3–5.

**Risk:** LOW — chart colors only; they don't carry semantic meaning (danger, success, warning)

**Action:** KEEP escape hatches for true chart palette colors. The `var(--ds-chart-*)` conversions done in Phase 5 should be verified for theme correctness (chart tokens do invert in dark mode).

---

## CATEGORY D — Focus / Ring Interactions (11 hatches, LOW risk)

**Pattern:** `rgba(0, 82, 204, 0.*)` — keyboard focus rings

**Reason:** ADS provides `var(--ds-border-focused)` for borders, but some components use a box-shadow-based focus ring with an alpha rgba value for the outer glow. The ADS token is solid, not alpha.

**Risk:** LOW — accessibility-critical but not a color accuracy problem; the glow is additive/decorative

**Action:** KEEP. Consider converting to `var(--ds-border-focused)` with `outline:` in a future a11y pass.

---

## CATEGORY E — Drag / Drop Overlay (10 hatches, LOW risk)

**Pattern:** `rgba(9, 30, 66, 0.04)` — very faint overlay during drag

**Reason:** This is an interaction state with near-zero alpha that doesn't correspond to any ADS semantic token.

**Risk:** LOW — nearly invisible, interaction-only

**Action:** KEEP.

---

## CATEGORY F — Editor / Syntax Highlight (6 hatches, LOW risk)

**Pattern:** Code editor token colors (string green, keyword blue, comment gray)

**Files:** `ReplayWidget.tsx` diff view, `EvidenceToExecution*.tsx` code blocks

**Reason:** Syntax highlight colors are a code-editor-specific palette, not a UI surface palette. ADS has no syntax token set.

**Risk:** LOW — applies only to code blocks

**Action:** KEEP. If a code theme library is added, revisit.

---

## CATEGORY G — Avatar Palette Fallbacks (4 hatches, LOW risk)

**Pattern:** `var(--ds-background-discovery, #6b8b7a)` — hex value is inside var() as fallback

**Files:** `ForYouInlineFilters.tsx`, `ResourceListingPage.tsx`, `ForYouPage.tsx`, `IssueViewShell.tsx`

**Note:** These are NOT bare hex violations — the scanner allows hex inside var() fallback position. These entries were in the escape hatch list from batch processing but are not actual violations. They were kept as-is (no action needed on these 4).

**Risk:** NONE — these are valid ADS token patterns with a fallback

---

## CATEGORY H — HIGH RISK (4 hatches, MANUAL REVIEW REQUIRED)

These are the only escape hatches classified as requiring code change in Phase 6:

### H1 — `linked-work-items.css` dark error surface
```css
/* Score: 9/10 — CRITICAL */
.dark .lwi-error { background: #3B1F1C; color: #FFB9B0 }
```
- `#3B1F1C` is a custom near-black-red. Should be `var(--ds-background-danger)`.
- `#FFB9B0` is a custom salmon-pink. Should be `var(--ds-text-danger)`.
- **Action:** Convert both in Phase 6.

### H2 — `ReleaseWorkNavigatorPage.tsx` info blue
```tsx
/* Score: 7/10 — HIGH */
color: '#8FB8F6' // ads-scanner:ignore-line
```
- Light-mode info-blue. May be a statusPalette value used outside the protected file.
- **Action:** Probe source; if not from statusPalette, convert to `var(--ds-text-information)`.

### H3 — `GlobalProgressIndicator.tsx`
```tsx
/* Score: 7/10 — HIGH */
backgroundColor: '#BCDFFB' // ads-scanner:ignore-line
```
- Light info-blue background. Clear ADS equivalent: `var(--ds-background-information)`.
- **Action:** Convert in Phase 6.

### H4 — `ActionTooltip.tsx`
```tsx
/* Score: 6/10 — HIGH */
background: '#1D1D1F' // ads-scanner:ignore-line
```
- Near-black tooltip bg. Should be `var(--ds-surface-overlay)` which resolves to `#1D2125` in dark.
- **Action:** Convert in Phase 6.

---

## Summary

| Category | Count | Action |
|---|---|---|
| A — Elevation shadow | 48 | KEEP |
| B — Chat/brand colors | 17 | KEEP |
| C — Chart/timeline palette | 20 | KEEP |
| D — Focus rings | 11 | KEEP |
| E — Drag/drop overlay | 10 | KEEP |
| F — Editor syntax | 6 | KEEP |
| G — Avatar var() fallbacks | 4 | NO ACTION (not violations) |
| H — High risk | 4 | CONVERT in Phase 6 |
| Other MEDIUM | 173 | KEEP (accept debt) |
| **TOTAL** | **293** | |
