import { style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  fontWeight,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

/*
 * Every customisable dimension on Calendar is exposed as a CSS variable
 * so consumers can override per-instance via inline `style` or via prop.
 * Defaults flow through `@catylast/tokens` semantic tokens — dark mode
 * and theme swaps work without touching component code.
 */

// ---------- root ----------

export const root = style({
  display: "inline-flex",
  flexDirection: "column",
  background: `var(--cal-bg, ${color.surface.background})`,
  color: `var(--cal-color, ${color.text.primary})`,
  fontFamily: typography.body.medium.fontFamily,
  border: `var(--cal-border-width, 1px) solid var(--cal-border-color, ${color.border.subtle})`,
  borderRadius: `var(--cal-radius, ${radius.md})`,
  padding: `var(--cal-padding, ${space[12]})`,
  width: `var(--cal-width, auto)`,
  boxShadow: `var(--cal-shadow, none)`,
  userSelect: "none",
  selectors: {
    "&:focus": {
      outline: "none",
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "2px",
    },
  },
});

// ---------- size variants ----------

export const size = styleVariants({
  small: {
    vars: {
      "--cal-cell-size": "28px",
      "--cal-day-font-size": typography.body.small.fontSize,
      "--cal-header-font-size": typography.body.medium.fontSize,
      "--cal-padding": space[8],
    },
  },
  medium: {
    vars: {
      "--cal-cell-size": "36px",
      "--cal-day-font-size": typography.body.medium.fontSize,
      "--cal-header-font-size": typography.heading.small.fontSize,
      "--cal-padding": space[12],
    },
  },
  large: {
    vars: {
      "--cal-cell-size": "44px",
      "--cal-day-font-size": typography.body.large.fontSize,
      "--cal-header-font-size": typography.heading.medium.fontSize,
      "--cal-padding": space[16],
    },
  },
});

// ---------- header ----------

export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space[8],
  marginBottom: `var(--cal-header-margin, ${space[8]})`,
});

export const monthLabel = style({
  fontSize: `var(--cal-header-font-size, ${typography.heading.small.fontSize})`,
  fontWeight: `var(--cal-header-font-weight, ${fontWeight.semibold})`,
  color: `var(--cal-header-color, ${color.text.primary})`,
  textAlign: "center",
  flex: 1,
  margin: 0,
  textTransform: "none",
});

export const navButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--cal-nav-size, 28px)`,
  height: `var(--cal-nav-size, 28px)`,
  padding: 0,
  margin: 0,
  border: "1px solid transparent",
  borderRadius: radius.sm,
  background: "transparent",
  color: color.text.primary,
  cursor: "pointer",
  flexShrink: 0,
  appearance: "none",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover:not([disabled])": {
      background: color.surface.hover,
    },
    "&:active:not([disabled])": {
      background: color.surface.pressed,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
    "&[disabled]": {
      cursor: "not-allowed",
      opacity: 0.4,
    },
  },
});

// ---------- weekday header row ----------

export const weekdayRow = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 0,
  marginBottom: space[4],
});

export const weekdayCell = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--cal-cell-size, 36px)`,
  height: `var(--cal-cell-size, 36px)`,
  fontSize: `var(--cal-weekday-font-size, ${typography.body.small.fontSize})`,
  fontWeight: `var(--cal-weekday-font-weight, ${fontWeight.medium})`,
  color: `var(--cal-weekday-color, ${color.text.subtle})`,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

// ---------- day grid ----------

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 0,
});

export const dayCellWrap = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--cal-cell-size, 36px)`,
  height: `var(--cal-cell-size, 36px)`,
  position: "relative",
});

export const dayCell = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "calc(var(--cal-cell-size, 36px) - 4px)",
  height: "calc(var(--cal-cell-size, 36px) - 4px)",
  margin: 0,
  padding: 0,
  border: "1px solid transparent",
  borderRadius: `var(--cal-day-radius, 50%)`,
  background: `var(--cal-day-bg, transparent)`,
  color: `var(--cal-day-color, ${color.text.primary})`,
  fontFamily: "inherit",
  fontSize: `var(--cal-day-font-size, ${typography.body.medium.fontSize})`,
  fontWeight: `var(--cal-day-font-weight, ${fontWeight.regular})`,
  cursor: "pointer",
  appearance: "none",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}, border-color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover:not([data-disabled='true']):not([data-selected='true'])": {
      background: `var(--cal-day-bg-hover, ${color.surface.hover})`,
      color: `var(--cal-day-color-hover, ${color.text.primary})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
    "&[data-outside='true']": {
      vars: {
        "--cal-day-color": color.text.disabled,
      },
    },
    "&[data-today='true']": {
      vars: {
        "--cal-day-border-color": color.border.focus,
      },
      borderColor: `var(--cal-day-border-color, transparent)`,
      fontWeight: fontWeight.semibold,
    },
    "&[data-selected='true']": {
      vars: {
        "--cal-day-bg": `var(--cal-day-bg-selected, ${color.accent.background})`,
        "--cal-day-color": `var(--cal-day-color-selected, ${color.accent.text})`,
      },
      fontWeight: fontWeight.semibold,
    },
    "&[data-selected='true']:hover": {
      vars: {
        "--cal-day-bg": `var(--cal-day-bg-selected-hover, ${color.accent.backgroundHover})`,
      },
    },
    "&[data-disabled='true']": {
      cursor: "not-allowed",
      opacity: 0.35,
      textDecoration: "line-through",
    },
  },
});

/**
 * Marker for `previouslySelected` dates — a small dot under the day
 * number. Implemented as an absolutely-positioned span so it survives
 * any inner content the consumer might inject in the future.
 */
export const previousMarker = style({
  position: "absolute",
  bottom: "4px",
  left: "50%",
  transform: "translateX(-50%)",
  width: "4px",
  height: "4px",
  borderRadius: "50%",
  background: `var(--cal-previous-marker-color, ${color.text.subtle})`,
  pointerEvents: "none",
  selectors: {
    "[data-selected='true'] &": {
      background: `var(--cal-previous-marker-color-selected, ${color.accent.text})`,
    },
  },
});
