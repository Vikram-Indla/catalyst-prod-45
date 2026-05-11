import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

/*
 * Every customisable dimension is exposed as a CSS variable on the root
 * so consumers can override per-instance via inline `style={{
 * "--checkbox-size": "20px" }}` or via prop. Defaults flow through
 * `@catylast/tokens` semantic tokens — dark mode and theme swaps work
 * without component changes.
 */

// ---------- wrapper (when label is present) ----------

export const wrapper = style({
  display: "inline-flex",
  alignItems: "flex-start",
  gap: `var(--checkbox-gap, ${space[8]})`,
  cursor: "pointer",
  fontFamily: typography.body.medium.fontFamily,
  fontSize: `var(--checkbox-label-font-size, ${typography.body.medium.fontSize})`,
  lineHeight: typography.body.medium.lineHeight,
  color: `var(--checkbox-label-color, ${color.text.primary})`,
  userSelect: "none",
  selectors: {
    "&:has(:disabled)": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
});

// ---------- the box itself (Radix root) ----------

export const root = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--checkbox-size, 16px)`,
  height: `var(--checkbox-size, 16px)`,
  flexShrink: 0,
  border: `var(--checkbox-border-width, 1.5px) solid var(--checkbox-border-color, ${color.border.strong})`,
  background: `var(--checkbox-bg, ${color.surface.background})`,
  color: `var(--checkbox-color-checked, ${color.accent.text})`,
  borderRadius: `var(--checkbox-radius, ${radius.xs})`,
  cursor: "pointer",
  padding: 0,
  margin: 0,
  appearance: "none",
  WebkitAppearance: "none",
  transition: [
    `background ${motion.duration.fast} ${motion.easing.standard}`,
    `border-color ${motion.duration.fast} ${motion.easing.standard}`,
  ].join(", "),
  // Vertically nudge the checkbox up so its top aligns with the first
  // line of the label, even when the label wraps to multiple lines.
  marginTop: "2px",
  selectors: {
    "&:hover:not(:disabled)": {
      borderColor: `var(--checkbox-border-color-hover, ${color.accent.background})`,
    },
    '&[data-state="checked"], &[data-state="indeterminate"]': {
      background: `var(--checkbox-bg-checked, ${color.accent.background})`,
      borderColor: `var(--checkbox-border-color-checked, ${color.accent.background})`,
    },
    '&[data-state="checked"]:hover:not(:disabled), &[data-state="indeterminate"]:hover:not(:disabled)':
      {
        background: `var(--checkbox-bg-checked-hover, ${color.accent.backgroundHover})`,
        borderColor: `var(--checkbox-border-color-checked-hover, ${color.accent.backgroundHover})`,
      },
    "&:disabled": {
      cursor: "not-allowed",
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "2px",
    },
    // Invalid state — red border, even when checked
    "&[data-invalid='true']": {
      borderColor: `var(--checkbox-border-color-invalid, ${color.border.danger})`,
    },
    "&[data-invalid='true'][data-state='checked'], &[data-invalid='true'][data-state='indeterminate']":
      {
        background: `var(--checkbox-bg-checked-invalid, ${color.danger.background})`,
        borderColor: `var(--checkbox-border-color-invalid, ${color.danger.background})`,
      },
  },
});

// ---------- size ----------

export const size = styleVariants({
  small: {
    vars: {
      "--checkbox-size": "14px",
      "--checkbox-icon-size": "10px",
      "--checkbox-label-font-size": typography.body.small.fontSize,
    },
  },
  medium: {
    vars: {
      "--checkbox-size": "16px",
      "--checkbox-icon-size": "12px",
      "--checkbox-label-font-size": typography.body.medium.fontSize,
    },
  },
  large: {
    vars: {
      "--checkbox-size": "20px",
      "--checkbox-icon-size": "14px",
      "--checkbox-label-font-size": typography.body.large.fontSize,
    },
  },
});

// ---------- indicator (the check / dash glyph) ----------

const popIn = keyframes({
  from: { opacity: 0, transform: "scale(0.6)" },
  to: { opacity: 1, transform: "scale(1)" },
});

export const indicator = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  color: "currentColor",
  animation: `${popIn} ${motion.duration.fast} ${motion.easing.standard}`,
});

export const checkOnly = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  selectors: {
    [`${indicator}[data-state="indeterminate"] &`]: {
      display: "none",
    },
  },
});

export const indeterminateOnly = style({
  display: "none",
  alignItems: "center",
  justifyContent: "center",
  selectors: {
    [`${indicator}[data-state="indeterminate"] &`]: {
      display: "flex",
    },
  },
});

// ---------- label text ----------

export const label = style({
  cursor: "inherit",
  // Pull the label up so it aligns with the box's first text line.
  paddingTop: "1px",
});

export const required = style({
  color: `var(--checkbox-required-color, ${color.text.danger})`,
  marginLeft: "2px",
});
