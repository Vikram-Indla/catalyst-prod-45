import { globalStyle, keyframes, style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  fontWeight,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

/*
 * Every customizable dimension is exposed as a CSS variable on the root so
 * consumers can override per-instance via inline `style={{ "--btn-bg": ... }}`
 * or via prop. Library defaults still resolve through the token system —
 * the fallback in each `var()` is the relevant token, never a literal.
 */

// ---------- root ----------

export const root = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: `var(--btn-gap, ${space[6]})`,
  border: `var(--btn-border-width, 1px) solid var(--btn-border-color, transparent)`,
  borderRadius: `var(--btn-radius, ${radius.sm})`,
  // Family + per-size font-size come from the body typography slots
  // (set via `--btn-font-size` in the `size` variants below). Weight
  // stays medium (500) regardless of size — Button text is UI label,
  // not display copy, so we don't promote it to the brand bold (653).
  // Line-height is intentionally tight (1.2) since buttons don't wrap;
  // the slot line-heights (16/20/24) are tuned for reading flow which
  // would leave too much vertical space around a single-line label.
  fontFamily: typography.body.medium.fontFamily,
  fontWeight: `var(--btn-font-weight, ${fontWeight.medium})`,
  fontSize: `var(--btn-font-size, ${typography.body.medium.fontSize})`,
  lineHeight: 1.2,
  paddingInline: `var(--btn-padding-x, ${space[12]})`,
  paddingBlock: `var(--btn-padding-y, ${space[6]})`,
  minHeight: `var(--btn-min-height, 32px)`,
  width: `var(--btn-width, auto)`,
  background: `var(--btn-bg, transparent)`,
  color: `var(--btn-color, ${color.text.primary})`,
  boxShadow: `var(--btn-shadow, none)`,
  textDecoration: `var(--btn-text-decoration, none)`,
  cursor: "pointer",
  whiteSpace: "nowrap",
  userSelect: "none",
  margin: 0,
  font: "inherit",
  fontFeatureSettings: "inherit",
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
  textAlign: "center",
  verticalAlign: "middle",
  isolation: "isolate",
  transition: [
    `background ${motion.duration.fast} ${motion.easing.standard}`,
    `color ${motion.duration.fast} ${motion.easing.standard}`,
    `border-color ${motion.duration.fast} ${motion.easing.standard}`,
    `box-shadow ${motion.duration.fast} ${motion.easing.standard}`,
    `transform ${motion.duration.fast} ${motion.easing.standard}`,
  ].join(", "),
  selectors: {
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "2px",
    },
    "&:hover:not([data-disabled='true']):not([data-loading='true'])": {
      background: `var(--btn-bg-hover, var(--btn-bg, transparent))`,
      borderColor: `var(--btn-border-color-hover, var(--btn-border-color, transparent))`,
      color: `var(--btn-color-hover, var(--btn-color))`,
      textDecoration: `var(--btn-text-decoration-hover, var(--btn-text-decoration, none))`,
    },
    "&:active:not([data-disabled='true']):not([data-loading='true'])": {
      background: `var(--btn-bg-pressed, var(--btn-bg-hover, var(--btn-bg, transparent)))`,
      transform: "translateY(0.5px)",
    },
    "&[data-disabled='true']": {
      cursor: "not-allowed",
      opacity: 0.5,
      pointerEvents: "none",
    },
    "&[data-loading='true']": {
      cursor: "progress",
      pointerEvents: "none",
    },
    "&[data-selected='true']": {
      vars: {
        "--btn-bg": `var(--btn-bg-selected, ${color.surface.selected})`,
        "--btn-color": `var(--btn-color-selected, ${color.text.accent})`,
        "--btn-border-color": `var(--btn-border-color-selected, ${color.border.focus})`,
      },
    },
  },
});

// ---------- size (font, min-height, padding scale) ----------

export const size = styleVariants({
  small: {
    vars: {
      "--btn-font-size": typography.body.small.fontSize,
      "--btn-min-height": "24px",
      "--btn-padding-y": space[4],
      "--btn-padding-x": space[8],
      "--btn-icon-size": "14px",
      "--btn-gap": space[4],
    },
  },
  medium: {
    vars: {
      "--btn-font-size": typography.body.medium.fontSize,
      "--btn-min-height": "32px",
      "--btn-padding-y": space[6],
      "--btn-padding-x": space[12],
      "--btn-icon-size": "16px",
      "--btn-gap": space[6],
    },
  },
  large: {
    vars: {
      "--btn-font-size": typography.body.large.fontSize,
      "--btn-min-height": "40px",
      "--btn-padding-y": space[8],
      "--btn-padding-x": space[16],
      "--btn-icon-size": "20px",
      "--btn-gap": space[8],
    },
  },
});

// ---------- spacing (horizontal padding density) ----------

export const spacing = styleVariants({
  default: {},
  compact: {
    vars: {
      "--btn-padding-x": space[6],
    },
  },
  none: {
    vars: {
      "--btn-padding-x": "0",
      "--btn-padding-y": "0",
      "--btn-min-height": "auto",
    },
  },
});

// ---------- appearance (color preset) ----------

export const appearance = styleVariants({
  default: {
    vars: {
      "--btn-bg": color.surface.raised,
      "--btn-bg-hover": color.surface.hover,
      "--btn-bg-pressed": color.surface.pressed,
      "--btn-color": color.text.primary,
      "--btn-border-color": color.border.default,
      "--btn-border-color-hover": color.border.strong,
    },
  },
  primary: {
    vars: {
      "--btn-bg": color.accent.background,
      "--btn-bg-hover": color.accent.backgroundHover,
      "--btn-bg-pressed": color.accent.backgroundPressed,
      "--btn-color": color.accent.text,
      "--btn-border-color": "transparent",
      "--btn-border-color-hover": "transparent",
    },
  },
  subtle: {
    vars: {
      "--btn-bg": "transparent",
      "--btn-bg-hover": color.surface.hover,
      "--btn-bg-pressed": color.surface.pressed,
      "--btn-color": color.text.primary,
      "--btn-border-color": "transparent",
      "--btn-border-color-hover": "transparent",
    },
  },
  "subtle-link": {
    vars: {
      "--btn-bg": "transparent",
      "--btn-bg-hover": "transparent",
      "--btn-bg-pressed": "transparent",
      "--btn-color": color.text.primary,
      "--btn-color-hover": color.text.primary,
      "--btn-border-color": "transparent",
      "--btn-border-color-hover": "transparent",
      "--btn-text-decoration-hover": "underline",
      "--btn-padding-x": "0",
      "--btn-padding-y": "0",
      "--btn-min-height": "auto",
    },
  },
  link: {
    vars: {
      "--btn-bg": "transparent",
      "--btn-bg-hover": "transparent",
      "--btn-bg-pressed": "transparent",
      "--btn-color": color.text.accent,
      "--btn-color-hover": color.text.accent,
      "--btn-border-color": "transparent",
      "--btn-border-color-hover": "transparent",
      "--btn-text-decoration-hover": "underline",
      "--btn-padding-x": "0",
      "--btn-padding-y": "0",
      "--btn-min-height": "auto",
    },
  },
  warning: {
    vars: {
      "--btn-bg": color.warning.background,
      "--btn-bg-hover": "var(--catylast-color-yellow-400)",
      "--btn-bg-pressed": "var(--catylast-color-yellow-500)",
      "--btn-color": color.warning.text,
      "--btn-border-color": "transparent",
      "--btn-border-color-hover": "transparent",
    },
  },
  danger: {
    vars: {
      "--btn-bg": color.danger.background,
      "--btn-bg-hover": color.danger.backgroundHover,
      "--btn-bg-pressed": color.danger.backgroundPressed,
      "--btn-color": color.danger.text,
      "--btn-border-color": "transparent",
      "--btn-border-color-hover": "transparent",
    },
  },
  discovery: {
    vars: {
      "--btn-bg": "var(--catylast-color-purple-500)",
      "--btn-bg-hover": "var(--catylast-color-purple-600)",
      "--btn-bg-pressed": "var(--catylast-color-purple-700)",
      "--btn-color": color.text.inverse,
      "--btn-border-color": "transparent",
      "--btn-border-color-hover": "transparent",
    },
  },
});

// ---------- shouldFitContainer ----------

export const fullWidth = style({
  vars: {
    "--btn-width": "100%",
  },
});

// ---------- iconBefore / iconAfter wrappers ----------

export const iconSlot = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

// ---------- loading ----------

export const labelWrap = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "inherit",
  transition: `opacity ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "[data-loading='true'] &": {
      opacity: 0,
    },
  },
});

const spinnerSpin = keyframes({
  to: { transform: "rotate(360deg)" },
});

export const spinner = style({
  position: "absolute",
  inset: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
});

globalStyle(`${spinner} > svg`, {
  width: "var(--btn-icon-size, 16px)",
  height: "var(--btn-icon-size, 16px)",
  animation: `${spinnerSpin} 0.8s linear infinite`,
});
