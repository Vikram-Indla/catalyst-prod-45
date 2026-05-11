import { style } from "@vanilla-extract/css";
import {
  color,
  elevation,
  radius,
  space,
  typography,
  zIndex,
} from "@catylast/tokens";

export const content = style({
  background: color.surface.overlay,
  color: color.text.primary,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  boxShadow: elevation.lg,
  padding: space[12],
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  lineHeight: typography.body.medium.lineHeight,
  minWidth: "220px",
  zIndex: zIndex.popover,
  outline: "none",
});

export const arrow = style({
  fill: color.surface.overlay,
});
