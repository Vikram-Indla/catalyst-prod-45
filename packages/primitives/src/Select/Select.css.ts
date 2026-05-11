import { style, styleVariants } from "@vanilla-extract/css";
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

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space[6],
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.sm,
  background: color.surface.background,
  color: color.text.primary,
  cursor: "pointer",
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  lineHeight: typography.body.medium.lineHeight,
  whiteSpace: "nowrap",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, border-color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: color.border.strong,
      background: color.surface.hover,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "2px",
    },
    '&[data-state="open"]': {
      borderColor: color.border.focus,
    },
  },
});

export const triggerSize = styleVariants({
  sm: { padding: `${space[2]} ${space[8]}`, minHeight: "24px" },
  md: { padding: `${space[6]} ${space[10]}`, minHeight: "32px" },
});

export const triggerVariant = styleVariants({
  default: {},
  ghost: {
    border: "none",
    background: "transparent",
    padding: `${space[2]} ${space[4]}`,
    selectors: {
      "&:hover:not(:disabled)": {
        background: color.surface.hover,
        borderColor: "transparent",
      },
      '&[data-state="open"]': {
        background: color.surface.hover,
        borderColor: "transparent",
      },
    },
  },
});

export const triggerIcon = style({
  color: color.text.subtle,
  flexShrink: 0,
});

export const placeholder = style({
  color: color.text.subtle,
});

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
  minWidth: "var(--radix-select-trigger-width)",
  maxHeight: "var(--radix-select-content-available-height)",
  overflow: "hidden",
  zIndex: zIndex.dropdown,
});

export const viewport = style({
  padding: space[2],
});

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: space[8],
  padding: `${space[6]} ${space[8]}`,
  paddingRight: space[24],
  borderRadius: radius.sm,
  cursor: "pointer",
  outline: "none",
  userSelect: "none",
  position: "relative",
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

export const itemIndicator = style({
  position: "absolute",
  right: space[8],
  display: "inline-flex",
  alignItems: "center",
  color: color.text.accent,
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
