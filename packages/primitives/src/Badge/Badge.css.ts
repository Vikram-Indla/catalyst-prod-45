import { style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  fontWeight,
  radius,
  space,
  typography,
} from "@catylast/tokens";

export const root = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[4],
  padding: `${space[2]} ${space[6]}`,
  borderRadius: radius.xs,
  // Badge takes its size + line-height + family from the smallest body
  // typography slot, then overlays uppercase tracking and semibold
  // weight to produce the classic eyebrow / tag style. The brand bold
  // (653) is reserved for actual display headings; Badge stays at 600
  // so it doesn't compete visually with adjacent headings.
  fontFamily: typography.body.small.fontFamily,
  fontSize: typography.body.small.fontSize,
  lineHeight: typography.body.small.lineHeight,
  fontWeight: fontWeight.semibold,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  border: "1px solid transparent",
});

export const variant = styleVariants({
  default: {
    background: color.surface.sunken,
    color: color.text.secondary,
    borderColor: color.border.subtle,
  },
  primary: {
    background: color.accent.background,
    color: color.accent.text,
  },
  success: {
    background: color.success.background,
    color: color.success.text,
  },
  warning: {
    background: color.warning.background,
    color: color.warning.text,
  },
  danger: {
    background: color.danger.background,
    color: color.danger.text,
  },
});
