import { style, styleVariants } from "@vanilla-extract/css";
import { color, typography } from "@catylast/tokens";

// ---------------------------------------------------------------------------
// Shared base — every typography component carries the same escape-hatch
// CSS variables so consumers can override per-instance without touching
// the global token layer.
// ---------------------------------------------------------------------------

const base = style({
  margin: 0,
  // Per the design-system customization rule, every styling axis is
  // exposed as both an enum prop AND a CSS variable. Consumers set the
  // var on a wrapper to override without prop drilling.
  color: "var(--catylast-typography-color, currentColor)",
  textAlign: "var(--catylast-typography-text-align, inherit)" as never,
  // Inter ships with proper tabular figures on its `tnum` axis; turning
  // it on globally on Metric (and optionally Text) keeps numeric columns
  // visually aligned without per-component CSS.
  fontVariantNumeric: "var(--catylast-typography-font-variant-numeric, normal)" as never,
});

// ---------------------------------------------------------------------------
// Heading — 7 sizes, semantic <h1>–<h6> level controlled separately.
// All slots ship with `fontWeight: 653` baked into the token; consumers
// only pick the size.
// ---------------------------------------------------------------------------

export const headingRoot = style([base, { fontFamily: typography.heading.medium.fontFamily }]);

export const headingSize = styleVariants({
  xxlarge: {
    fontSize: typography.heading.xxlarge.fontSize,
    fontWeight: typography.heading.xxlarge.fontWeight,
    lineHeight: typography.heading.xxlarge.lineHeight,
  },
  xlarge: {
    fontSize: typography.heading.xlarge.fontSize,
    fontWeight: typography.heading.xlarge.fontWeight,
    lineHeight: typography.heading.xlarge.lineHeight,
  },
  large: {
    fontSize: typography.heading.large.fontSize,
    fontWeight: typography.heading.large.fontWeight,
    lineHeight: typography.heading.large.lineHeight,
  },
  medium: {
    fontSize: typography.heading.medium.fontSize,
    fontWeight: typography.heading.medium.fontWeight,
    lineHeight: typography.heading.medium.lineHeight,
  },
  small: {
    fontSize: typography.heading.small.fontSize,
    fontWeight: typography.heading.small.fontWeight,
    lineHeight: typography.heading.small.lineHeight,
  },
  xsmall: {
    fontSize: typography.heading.xsmall.fontSize,
    fontWeight: typography.heading.xsmall.fontWeight,
    lineHeight: typography.heading.xsmall.lineHeight,
  },
  xxsmall: {
    fontSize: typography.heading.xxsmall.fontSize,
    fontWeight: typography.heading.xxsmall.fontWeight,
    lineHeight: typography.heading.xxsmall.lineHeight,
  },
});

// ---------------------------------------------------------------------------
// Text — 4 sizes, 3 weights, color preset. Default <span>.
// ---------------------------------------------------------------------------

export const textRoot = style([base, { fontFamily: typography.body.medium.fontFamily }]);

export const textSize = styleVariants({
  xlarge: {
    fontSize: typography.body.xlarge.fontSize,
    lineHeight: typography.body.xlarge.lineHeight,
  },
  large: {
    fontSize: typography.body.large.fontSize,
    lineHeight: typography.body.large.lineHeight,
  },
  medium: {
    fontSize: typography.body.medium.fontSize,
    lineHeight: typography.body.medium.lineHeight,
  },
  small: {
    fontSize: typography.body.small.fontSize,
    lineHeight: typography.body.small.lineHeight,
  },
});

export const textWeight = styleVariants({
  regular: { fontWeight: "var(--catylast-typography-weight, 400)" as never },
  medium: { fontWeight: "var(--catylast-typography-weight, 500)" as never },
  bold: { fontWeight: "var(--catylast-typography-weight, 653)" as never },
});

export const textColor = styleVariants({
  primary: { color: color.text.primary },
  secondary: { color: color.text.secondary },
  subtle: { color: color.text.subtle },
  disabled: { color: color.text.disabled },
  inverse: { color: color.text.inverse },
  accent: { color: color.text.accent },
  danger: { color: color.text.danger },
  warning: { color: color.text.warning },
  success: { color: color.text.success },
  inherit: { color: "inherit" },
});

// ---------------------------------------------------------------------------
// Metric — bold display numerals, always tabular-nums for vertical
// alignment in tables and dashboards.
// ---------------------------------------------------------------------------

export const metricRoot = style([
  base,
  {
    fontFamily: typography.metric.medium.fontFamily,
    // tabular-nums baked into Metric by default — KPIs and progress
    // percentages stack into clean columns. Override via the
    // `--catylast-typography-font-variant-numeric` escape hatch.
    fontVariantNumeric: "var(--catylast-typography-font-variant-numeric, tabular-nums)" as never,
  },
]);

export const metricSize = styleVariants({
  large: {
    fontSize: typography.metric.large.fontSize,
    fontWeight: typography.metric.large.fontWeight,
    lineHeight: typography.metric.large.lineHeight,
  },
  medium: {
    fontSize: typography.metric.medium.fontSize,
    fontWeight: typography.metric.medium.fontWeight,
    lineHeight: typography.metric.medium.lineHeight,
  },
  small: {
    fontSize: typography.metric.small.fontSize,
    fontWeight: typography.metric.small.fontWeight,
    lineHeight: typography.metric.small.lineHeight,
  },
});

// ---------------------------------------------------------------------------
// Code — monospace inline or block. Both lean on the same `code` slot;
// `block` toggles between `<code>` and `<pre><code>` plus the appropriate
// padding / wrapping behavior.
// ---------------------------------------------------------------------------

export const codeRoot = style([
  base,
  {
    fontFamily: typography.code.fontFamily,
    fontSize: typography.code.fontSize,
    fontWeight: typography.code.fontWeight,
    lineHeight: typography.code.lineHeight,
  },
]);

export const codeInline = style({
  display: "inline",
  padding: "1px 6px",
  borderRadius: "3px",
  background: color.surface.sunken,
  color: color.text.primary,
  border: `1px solid ${color.border.subtle}`,
});

export const codeBlock = style({
  display: "block",
  padding: "12px 16px",
  borderRadius: "6px",
  background: color.surface.sunken,
  color: color.text.primary,
  border: `1px solid ${color.border.subtle}`,
  overflowX: "auto",
  whiteSpace: "pre",
});
