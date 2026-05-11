import { globalStyle, style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  fontWeight,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

/*
 * TimePicker re-uses the same trigger / input visual contract as
 * DatePicker so the two components read as a single family. The full
 * set of `--datepicker-*` style variables also accepts `--timepicker-*`
 * names — both are exposed so consumers can theme each independently.
 */

// ---------- trigger ----------

export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: `var(--timepicker-gap, ${space[6]})`,
  width: `var(--timepicker-width, 160px)`,
  paddingInline: `var(--timepicker-padding-x, ${space[10]})`,
  paddingBlock: `var(--timepicker-padding-y, ${space[6]})`,
  minHeight: `var(--timepicker-min-height, 32px)`,
  background: `var(--timepicker-bg, ${color.surface.background})`,
  color: `var(--timepicker-color, ${color.text.primary})`,
  border: `var(--timepicker-border-width, 1px) solid var(--timepicker-border-color, ${color.border.default})`,
  borderRadius: `var(--timepicker-radius, ${radius.sm})`,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: `var(--timepicker-font-size, ${typography.body.medium.fontSize})`,
  cursor: "text",
  boxSizing: "border-box",
  transition: [
    `background ${motion.duration.fast} ${motion.easing.standard}`,
    `border-color ${motion.duration.fast} ${motion.easing.standard}`,
  ].join(", "),
  selectors: {
    "&:hover:not([data-disabled='true'])": {
      borderColor: `var(--timepicker-border-color-hover, ${color.border.strong})`,
    },
    "&[data-focused='true']": {
      borderColor: `var(--timepicker-border-color-focus, ${color.border.focus})`,
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "-1px",
    },
    "&[data-invalid='true']": {
      borderColor: `var(--timepicker-border-color-invalid, ${color.border.danger})`,
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
  color: `var(--timepicker-icon-color, ${color.text.subtle})`,
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
  background: `var(--timepicker-popover-bg, ${color.surface.overlay})`,
  borderRadius: `var(--timepicker-popover-radius, ${radius.md})`,
  border: `1px solid ${color.border.default}`,
  boxShadow: `var(--timepicker-popover-shadow, 0 8px 24px rgba(22, 25, 28, 0.18))`,
  overflow: "hidden",
  zIndex: 50,
  width: `var(--timepicker-popover-width, 160px)`,
});

export const list = style({
  maxHeight: `var(--timepicker-list-max-height, 240px)`,
  overflowY: "auto",
  padding: space[4],
  margin: 0,
  listStyle: "none",
});

export const listItem = style({
  display: "flex",
  alignItems: "center",
  paddingInline: space[8],
  paddingBlock: space[6],
  borderRadius: radius.sm,
  cursor: "pointer",
  fontFamily: typography.body.medium.fontFamily,
  fontSize: `var(--timepicker-font-size, ${typography.body.medium.fontSize})`,
  color: color.text.primary,
  margin: 0,
  selectors: {
    "&:hover, &[data-highlighted='true']": {
      background: color.surface.hover,
    },
    "&[data-selected='true']": {
      background: color.surface.selected,
      color: color.text.accent,
      fontWeight: fontWeight.semibold,
    },
    "&[data-current='true']": {
      // The currently-typed value inside the input — highlighted on top
      // of any selected styling so the user can see where their typing
      // would land if they pressed Enter.
      vars: {
        "--ring-shadow": `inset 0 0 0 2px ${color.border.focus}`,
      },
      boxShadow: `var(--ring-shadow)`,
    },
  },
});

export const emptyState = style({
  paddingInline: space[12],
  paddingBlock: space[16],
  color: color.text.subtle,
  fontSize: typography.body.medium.fontSize,
  fontFamily: typography.body.medium.fontFamily,
  textAlign: "center",
});

// ---------- size scale ----------

export const size = styleVariants({
  small: {
    vars: {
      "--timepicker-min-height": "24px",
      "--timepicker-padding-y": space[2],
      "--timepicker-padding-x": space[8],
      "--timepicker-font-size": typography.body.small.fontSize,
    },
  },
  medium: {
    vars: {
      "--timepicker-min-height": "32px",
      "--timepicker-padding-y": space[6],
      "--timepicker-padding-x": space[10],
      "--timepicker-font-size": typography.body.medium.fontSize,
    },
  },
  large: {
    vars: {
      "--timepicker-min-height": "40px",
      "--timepicker-padding-y": space[8],
      "--timepicker-padding-x": space[12],
      "--timepicker-font-size": typography.body.large.fontSize,
    },
  },
});

// scrollbar styling for the time list
globalStyle(`${list}::-webkit-scrollbar`, {
  width: "6px",
});
globalStyle(`${list}::-webkit-scrollbar-thumb`, {
  background: color.border.default,
  borderRadius: "3px",
});
globalStyle(`${list}::-webkit-scrollbar-track`, {
  background: "transparent",
});
