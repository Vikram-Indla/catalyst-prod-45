import { style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

/*
 * Every styling dimension on DatePicker is exposed as a CSS variable
 * on the trigger root so consumers can override per-instance via
 * inline `style` or via prop. Defaults flow through `@catylast/tokens`
 * semantic tokens — dark mode and theme swaps work without component
 * changes.
 */

// ---------- trigger / input ----------

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: `var(--datepicker-gap, ${space[6]})`,
  width: `var(--datepicker-width, 240px)`,
  paddingInline: `var(--datepicker-padding-x, ${space[10]})`,
  paddingBlock: `var(--datepicker-padding-y, ${space[6]})`,
  minHeight: `var(--datepicker-min-height, 32px)`,
  background: `var(--datepicker-bg, ${color.surface.background})`,
  color: `var(--datepicker-color, ${color.text.primary})`,
  border: `var(--datepicker-border-width, 1px) solid var(--datepicker-border-color, ${color.border.default})`,
  borderRadius: `var(--datepicker-radius, ${radius.sm})`,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: `var(--datepicker-font-size, ${typography.body.medium.fontSize})`,
  cursor: "text",
  boxSizing: "border-box",
  transition: [
    `background ${motion.duration.fast} ${motion.easing.standard}`,
    `border-color ${motion.duration.fast} ${motion.easing.standard}`,
  ].join(", "),
  selectors: {
    "&:hover:not([data-disabled='true'])": {
      borderColor: `var(--datepicker-border-color-hover, ${color.border.strong})`,
    },
    "&[data-focused='true']": {
      borderColor: `var(--datepicker-border-color-focus, ${color.border.focus})`,
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "-1px",
    },
    "&[data-invalid='true']": {
      borderColor: `var(--datepicker-border-color-invalid, ${color.border.danger})`,
    },
    "&[data-disabled='true']": {
      cursor: "not-allowed",
      opacity: 0.5,
      background: color.surface.sunken,
    },
  },
});

export const triggerIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: `var(--datepicker-icon-color, ${color.text.subtle})`,
  flexShrink: 0,
  pointerEvents: "none",
});

export const input = style({
  flex: 1,
  minWidth: 0,
  padding: 0,
  margin: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  appearance: "none",
  selectors: {
    "&::placeholder": {
      color: color.text.subtle,
    },
    "&:disabled": {
      cursor: "not-allowed",
    },
  },
});

export const clearButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  padding: 0,
  margin: 0,
  border: "1px solid transparent",
  borderRadius: radius.sm,
  background: "transparent",
  color: color.text.subtle,
  cursor: "pointer",
  flexShrink: 0,
  appearance: "none",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      color: color.text.primary,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
  },
});

// ---------- popover content ----------

export const popoverContent = style({
  background: `var(--datepicker-popover-bg, ${color.surface.overlay})`,
  borderRadius: `var(--datepicker-popover-radius, ${radius.md})`,
  border: `1px solid ${color.border.default}`,
  boxShadow: `var(--datepicker-popover-shadow, 0 8px 24px rgba(22, 25, 28, 0.18))`,
  padding: 0,
  overflow: "hidden",
  zIndex: 50,
});

// ---------- size scale ----------

export const size = styleVariants({
  small: {
    vars: {
      "--datepicker-min-height": "24px",
      "--datepicker-padding-y": space[2],
      "--datepicker-padding-x": space[8],
      "--datepicker-font-size": typography.body.small.fontSize,
    },
  },
  medium: {
    vars: {
      "--datepicker-min-height": "32px",
      "--datepicker-padding-y": space[6],
      "--datepicker-padding-x": space[10],
      "--datepicker-font-size": typography.body.medium.fontSize,
    },
  },
  large: {
    vars: {
      "--datepicker-min-height": "40px",
      "--datepicker-padding-y": space[8],
      "--datepicker-padding-x": space[12],
      "--datepicker-font-size": typography.body.large.fontSize,
    },
  },
});
