/**
 * CAT-DS-TOKEN-POISON-20260710-001 — Goal 3, R9 typography sweep.
 *
 * Ground truth (verified against node_modules/@atlaskit/tokens):
 *  - `@atlaskit/tokens/token-names` exposes NO `font.size.*` role — ADS never
 *    ships a standalone numeric font-size custom property. It only ships
 *    composite `font.*` role tokens (font.body, font.body.small,
 *    font.body.large, font.heading.xxsmall..xxlarge, font.metric.small/
 *    medium/large, font.code) which resolve to a full CSS `font` SHORTHAND
 *    string: "normal <weight> <size>/<line-height> <family-list>".
 *  - The app's `--ds-font-size-*` / `--ds-line-height-body` tokens in
 *    src/styles/theme-tokens.css are 100% app-invented — not real ADS names
 *    (confirmed: absent from `@atlaskit/tokens/token-names`). This is a
 *    RENAME job, not a strip-fallback job (contrast with R10, where the
 *    token NAMES were real and only the fallback value was the poison).
 *  - Therefore every CSS `font-size:` / TS `fontSize:` consumer of these
 *    temp tokens must become the `font` shorthand property consuming the
 *    matching `--ds-font-<role>` composite var.
 *
 * Slot -> px, sourced verbatim from the temp definitions being retired:
 *   50:11  100:12  200:12  300:14  400:14  500:17  600:18  700:22  800:28
 *
 * Role assignment (nearest-fit against the ADS typography theme's actual
 * emitted px, see node_modules/@atlaskit/tokens/dist/esm/artifacts/themes/
 * atlassian-typography.js):
 *   body-small     12px (0.75rem/1rem,   weight 400)
 *   body           14px (0.875rem/1.25rem, weight 400)
 *   heading-small  16px (1rem/1.25rem,   weight 653)
 *   heading-medium 20px (1.25rem/1.5rem, weight 653)
 *   heading-large  24px (1.5rem/1.75rem, weight 653)
 *   heading-xlarge 28px (1.75rem/2rem,   weight 653)
 *   metric-small   16px (1rem/1.25rem,   weight 653)
 *   metric-medium  24px (1.5rem/1.75rem, weight 653)
 *   metric-large   28px (1.75rem/2rem,   weight 653)
 *
 * 11px (slot 50) has no ADS token below 12px — rounds UP to body-small (the
 * documented ADS floor); this was already the app's own stated rationale
 * ("real ADS has no 11px body token", theme-tokens.css comment on slot 100).
 *
 * 17px/18px (slots 500/600) and 22px (slot 700) sit between two ADS steps;
 * ties are broken toward the role matching the token's own doc comment
 * ("medium heading — panel headers" / "section heading" / "large heading —
 * modal titles, page sections") rather than pure arithmetic midpoint, since
 * both candidates are equidistant for 600 (16 vs 20, both diff=2) and 700
 * (20 vs 24, both diff=2).
 */

export const SLOT_PX = {
  50: 11, 100: 12, 200: 12, 300: 14, 400: 14, 500: 17, 600: 18, 700: 22, 800: 28,
};

/** Slot -> base (non-metric) ADS role suffix, as used in `--ds-font-<role>`. */
export const BASE_ROLE_BY_SLOT = {
  50: 'body-small',
  100: 'body-small',
  200: 'body-small',
  300: 'body',
  400: 'body',
  500: 'heading-small',
  600: 'heading-medium',
  700: 'heading-large',
  800: 'heading-xlarge',
};

/**
 * Slot -> metric ADS role suffix, applied only when the consumer sits in a
 * KPI/metric/score/gauge/hero-number context AND the slot is >=500 (metric
 * roles exist only at 16/24/28px — there is no metric role for label-sized
 * text, so 50-400 always fall back to BASE_ROLE_BY_SLOT even in metric
 * contexts; those are the labels *around* the metric, not the number itself).
 */
export const METRIC_ROLE_BY_SLOT = {
  500: 'metric-small',
  600: 'metric-small',
  700: 'metric-medium',
  800: 'metric-large',
};

export const ALL_SLOTS = Object.keys(SLOT_PX).map(Number).sort((a, b) => a - b);

/** Nearest slot for an arbitrary raw px number (raw numeric fontSize sites). */
export function nearestSlot(px) {
  let best = ALL_SLOTS[0];
  let bestDiff = Infinity;
  for (const slot of ALL_SLOTS) {
    const diff = Math.abs(SLOT_PX[slot] - px);
    if (diff < bestDiff) { bestDiff = diff; best = slot; }
  }
  return best;
}

/** Role suffix for a slot, honoring metric-context override where applicable. */
export function roleForSlot(slot, isMetric) {
  if (isMetric && METRIC_ROLE_BY_SLOT[slot]) return METRIC_ROLE_BY_SLOT[slot];
  return BASE_ROLE_BY_SLOT[slot];
}

/** `--ds-font-<role>` CSS custom-property name for a role suffix. */
export function roleVar(role) {
  return `--ds-font-${role}`;
}

/** Plain numeric px mirror of each role's own font-size component — for APIs
 * that structurally cannot consume the `font` shorthand (SVG presentation
 * attributes, numeric-typed component props). Lives in src/theme/tokens.ts
 * as `fontSizePx`, NOT as a new --ds-* custom property (would resurrect R1). */
export const ROLE_PX = {
  'body-small': 12,
  body: 14,
  'heading-small': 16,
  'heading-medium': 20,
  'heading-large': 24,
  'heading-xlarge': 28,
  'metric-small': 16,
  'metric-medium': 24,
  'metric-large': 28,
};

/** Component/file-name heuristic for the KPI/metric/hero-number special case. */
export const METRIC_CONTEXT_RE = /score|metric|kpi|hero-?number|gauge/i;
