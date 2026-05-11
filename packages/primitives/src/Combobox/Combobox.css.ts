import { style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  motion,
  radius,
  space,
  typography,
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
  width: "100%",
  textAlign: "left",
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

export const triggerLabel = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: space[6],
  minWidth: 0,
});

export const triggerIcon = style({
  color: color.text.subtle,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
});

export const placeholder = style({
  color: color.text.subtle,
});

export const popoverContent = style({
  padding: 0,
  minWidth: "260px",
});

export const commandRoot = style({
  display: "flex",
  flexDirection: "column",
});

export const inputWrapper = style({
  display: "flex",
  alignItems: "center",
  gap: space[6],
  padding: `${space[6]} ${space[10]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
});

export const inputIcon = style({
  color: color.text.subtle,
  flexShrink: 0,
  display: "inline-flex",
});

export const input = style({
  flex: 1,
  border: "none",
  background: "transparent",
  padding: `${space[4]} 0`,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  color: color.text.primary,
  outline: "none",
  selectors: {
    "&::placeholder": {
      color: color.text.subtle,
    },
  },
});

export const list = style({
  maxHeight: "260px",
  overflowY: "auto",
  padding: space[4],
});

export const empty = style({
  padding: `${space[16]} ${space[8]}`,
  textAlign: "center",
  fontSize: typography.body.medium.fontSize,
  color: color.text.subtle,
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
  selectors: {
    "&[data-selected='true']": {
      background: color.surface.hover,
    },
    "&[data-disabled='true']": {
      opacity: 0.5,
      pointerEvents: "none",
    },
  },
});

export const itemContent = style({
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const itemIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  color: color.text.accent,
  flexShrink: 0,
});

export const clearItem = style({
  color: color.text.subtle,
  fontStyle: "italic",
});
