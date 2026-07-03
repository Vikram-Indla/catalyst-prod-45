/**
 * ADS chart theme — the ONLY color source for chart surfaces.
 * Feature: CAT-REPORTS-HUB-20260703-001 (S1.4).
 *
 * Every value is an ADS token (no hex, no rgb, no fallbacks — GLOBAL COLOR LAW).
 * Recharts resolves `var(--…)` in SVG fill/stroke presentation attributes via
 * the CSS cascade, so tokens theme correctly in light AND dark mode.
 */
export const ADS_SERIES = Array.from({ length: 8 }, (_, i) => `var(--ds-chart-categorical-${i + 1})`);

export const ADS_CHART = {
  grid: 'var(--ds-border)',
  axisText: 'var(--ds-text-subtlest)',
  tooltipBg: 'var(--ds-surface-raised)',
  tooltipText: 'var(--ds-text)',
  success: 'var(--ds-chart-success)',
  danger: 'var(--ds-chart-danger)',
  warning: 'var(--ds-chart-warning)',
  neutral: 'var(--ds-chart-neutral)',
  information: 'var(--ds-chart-information)',
} as const;
