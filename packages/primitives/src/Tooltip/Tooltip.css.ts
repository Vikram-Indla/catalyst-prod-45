import { style } from "@vanilla-extract/css";
import {
  color,
  elevation,
  fontWeight,
  radius,
  space,
  typography,
  zIndex,
} from "@catylast/tokens";

export const content = style({
  background: color.surface.overlay,
  color: color.text.primary,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.sm,
  boxShadow: elevation.md,
  padding: `${space[4]} ${space[8]}`,
  // Body-small slot for size + line-height + family. Override the
  // weight to medium (500) so the floating tooltip reads slightly
  // heavier than surrounding body text without using the brand bold.
  fontFamily: typography.body.small.fontFamily,
  fontSize: typography.body.small.fontSize,
  lineHeight: typography.body.small.lineHeight,
  fontWeight: fontWeight.medium,
  maxWidth: "240px",
  zIndex: zIndex.tooltip,
});

export const arrow = style({
  fill: color.surface.overlay,
});
