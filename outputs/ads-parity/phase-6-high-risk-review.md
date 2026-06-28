# Phase 6 High-Risk Color Exception Review
**Feature Work ID:** CAT-ADS-COMPLIANCE-20260627-001
**Date:** 2026-06-28
**Phase:** 6 — Manual review closure of Phase 5 high-risk escape hatches

---

## Starting Baseline

- Branch: `feat/ads-compliance-light-dark`
- HEAD: `878bc1b90`
- Color gate: 34 = baseline 34 (CLEAN)
- TypeScript: 181 (unchanged)

---

## Four High-Risk Items Reviewed

### H1 — linked-work-items dark error surface

| Field | Value |
|---|---|
| File | `src/modules/project-work-hub/components/linked-work-items/linked-work-items.css:562` |
| Category | error surface + error text (dark mode) |
| Before | `background: #3B1F1C; color: #FFB9B0;` |
| After | `background: var(--ds-background-danger); color: var(--ds-text-danger);` |
| Escape hatch | REMOVED |
| Decision | CONVERT |
| Reason | Both values have direct ADS semantic equivalents. `--ds-background-danger` resolves to `#FFECEB` (light) / `#42221F` (dark). `--ds-text-danger` resolves to `#AE2E24` (light) / `#FD9891` (dark). Theme-correct in both modes. |
| Visual validation (light) | VALIDATED — `#FFECEB` + `#AE2E24` high-contrast red surface |
| Visual validation (dark) | VALIDATED — `#42221F` + `#FD9891` high-contrast danger |
| Remaining risk | NONE |

---

### H2 — ReleaseWorkNavigatorPage count badge

| Field | Value |
|---|---|
| File | `src/pages/release-hub/ReleaseWorkNavigatorPage.tsx:639` |
| Category | count badge on selected filter chip |
| Before | `background: '#8FB8F6'; color: var(--ds-text, #172B4D)` |
| After | `background: 'var(--ds-background-brand-bold, #0C66E4)'; color: 'var(--ds-text-inverse, #FFFFFF)'` |
| Escape hatch | REMOVED |
| Decision | CONVERT |
| Reason | `#8FB8F6` was a hardcoded medium-blue that breaks in dark mode (theme resolves chip bg to dark blue, making the badge nearly invisible). Jira pattern for selected-chip count badge is brand-bold bg + inverse text. `--ds-background-brand-bold` resolves to `#1868DB` (light) / `#669DF1` (dark). `--ds-text-inverse` resolves to `#FFFFFF` (light) / `#161A1D` (dark) — both are high contrast. |
| Visual validation (light) | VALIDATED — `#1868DB` badge + `#FFFFFF` text — clear Jira-parity badge pattern |
| Visual validation (dark) | VALIDATED — `#669DF1` (lighter blue) + `#161A1D` text — theme-correct |
| Remaining risk | LOW — dark mode badge text color `#161A1D` against `#669DF1` has acceptable contrast ratio (~4.5:1) |

---

### H3 — GlobalProgressIndicator progress track

| Field | Value |
|---|---|
| File | `src/pages/dev/components/GlobalProgressIndicator.tsx:109` |
| Category | progress bar track background |
| Before | `backgroundColor: '#BCDFFB'` |
| After | `backgroundColor: 'var(--ds-background-information, #E9F2FF)'` |
| Escape hatch | REMOVED |
| Decision | CONVERT |
| Reason | `#BCDFFB` is a light info-blue progress track. ADS `--ds-background-information` resolves to `#E9F2FE` (light) / `#1C2B42` (dark). In dark mode, the hardcoded `#BCDFFB` would appear as a bright blue strip on a dark surface — visually wrong. Token resolves correctly in both modes. |
| Visual validation (light) | VALIDATED — `#E9F2FE` track + `var(--ds-link)` fill — visually distinct ✅ |
| Visual validation (dark) | VALIDATED — `#1C2B42` dark track + blue fill — correct dark-mode pattern ✅ |
| Remaining risk | NONE |

---

### H4 — ActionTooltip dark tooltip surface

| Field | Value |
|---|---|
| File | `src/features/chat-v2/components/shared/ActionTooltip.tsx:55,71` |
| Category | tooltip surface (dark overlay pill) |
| Before | `background: '#1D1D1F'` (× 2, with basic ignore comment) |
| After | `background: '#1D1D1F'` (× 2, with upgraded structured exception comment) |
| Escape hatch | RETAINED (upgraded comment) |
| Decision | APPROVED EXCEPTION |
| Reason | This is a Slack-style always-dark hover tooltip. ADS `--ds-surface-overlay` resolves to `#FFFFFF` in light mode — using it would produce a white tooltip on a white background (invisible, unusable). The `#1D1D1F` value is intentionally theme-invariant: it must be dark in both light and dark UI to serve its overlay purpose. Text uses `var(--ds-text-inverse, #FFFFFF)` (ADS token) — contrast is correct in both modes. Category: decorative/interaction overlay where ADS overlay token is semantically inverted. |
| Visual validation (light) | VALIDATED via DOM — `--ds-text-inverse: #FFFFFF` confirms white-on-dark tooltip ✅ |
| Visual validation (dark) | VALIDATED via DOM — same near-black on any bg ✅ |
| Remaining risk | LOW — monitored. If ADS adds `--ds-surface-overlay-inverse` token, convert. |

---

## Escape Hatch Changes

| Status | Count | Items |
|---|---|---|
| REMOVED | 3 | H1 (lwi-error bg+text as one rule), H2 (badge bg+text), H3 (track bg) |
| UPGRADED | 2 | H4 (tooltip container + shortcut chip — structured exception replacing bare comment) |
| RETAINED | 0 | — |

---

## Code Changes Made

1. `linked-work-items.css:562` — replaced `#3B1F1C` + `#FFB9B0` with `var(--ds-background-danger)` + `var(--ds-text-danger)`; removed `/* ads-scanner:ignore-line */`
2. `GlobalProgressIndicator.tsx:109` — replaced `'#BCDFFB'` with `'var(--ds-background-information, #E9F2FF)'`; removed `// ads-scanner:ignore-line`
3. `ReleaseWorkNavigatorPage.tsx:639` — replaced `'#8FB8F6'` with `'var(--ds-background-brand-bold, #0C66E4)'`; `color` updated from `var(--ds-text, #172B4D)` to `var(--ds-text-inverse, #FFFFFF)`; removed `// ads-scanner:ignore-line`
4. `ActionTooltip.tsx:55` — escape hatch comment upgraded with structured exception rationale
5. `ActionTooltip.tsx:71` — escape hatch comment upgraded with structured exception rationale

---

## Validation Results

| Check | Result |
|---|---|
| Color gate | ✅ PASS — 34 = baseline 34 |
| Audit gate | ✅ PASS — tokens 28704/28706 (improved), others at baseline; baseline ratcheted down |
| TypeScript | ✅ PASS — 181 = baseline 181 |
| Lint | NOT RUN |
| Build | NOT RUN |

---

## Gate Decision

```
GATE DECISION: PASS

- Color gate: CLEAN (34 protected-only, unchanged)
- Audit gate: IMPROVED (tokens 28706→28704)
- TypeScript: UNCHANGED (181)
- H1, H2, H3: Converted to ADS semantic tokens
- H4: Approved exception with structured justification
- Escape hatches net: -3 removed, 2 upgraded
- No new bare hex colors introduced
- No protected files touched
- No business logic changed
```
