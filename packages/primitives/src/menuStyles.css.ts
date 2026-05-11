/** Shared styles for `Menu` (DropdownMenu) and `ContextMenu`. */
import { style } from "@vanilla-extract/css";
import {
  color,
  elevation,
  fontWeight,
  motion,
  radius,
  space,
  typography,
  zIndex,
} from "@catylast/tokens";

export const content = style({
  background: color.surface.overlay,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  padding: space[4],
  boxShadow: elevation.lg,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  lineHeight: typography.body.medium.lineHeight,
  color: color.text.primary,
  minWidth: "180px",
  maxHeight: "var(--radix-popper-available-height, 70vh)",
  overflowY: "auto",
  overscrollBehavior: "contain",
  zIndex: zIndex.dropdown,
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: space[8],
  padding: `${space[6]} ${space[8]}`,
  borderRadius: radius.sm,
  cursor: "pointer",
  outline: "none",
  userSelect: "none",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&[data-highlighted]": {
      background: color.surface.hover,
    },
    "&[data-disabled]": {
      cursor: "not-allowed",
      opacity: 0.5,
      pointerEvents: "none",
    },
  },
});

export const itemDanger = style({
  color: color.text.danger,
  selectors: {
    "&[data-highlighted]": {
      background: color.danger.background,
      color: color.danger.text,
    },
  },
});

export const separator = style({
  height: "1px",
  background: color.border.subtle,
  margin: `${space[4]} ${space[2]}`,
});

export const label = style({
  padding: `${space[6]} ${space[8]}`,
  fontSize: typography.body.small.fontSize,
  fontWeight: fontWeight.semibold,
  color: color.text.subtle,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const subTriggerArrow = style({
  marginLeft: "auto",
  paddingLeft: space[12],
  display: "inline-flex",
  alignItems: "center",
  color: color.text.subtle,
});
