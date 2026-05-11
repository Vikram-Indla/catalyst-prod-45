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
 * Every styling dimension is exposed as a CSS variable on the root so
 * consumers can override per-instance via inline `style={{ "--pagination-gap":
 * "2px" }}` or via prop. Defaults flow through `@catylast/tokens` semantic
 * tokens — dark mode and theme swaps work without component changes.
 */

// ---------- root ----------

export const root = style({
  display: "inline-flex",
  alignItems: "center",
  gap: `var(--pagination-gap, ${space[2]})`,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  color: color.text.primary,
  userSelect: "none",
});

// ---------- item button (page numbers + prev/next) ----------

export const item = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--pagination-item-size, 28px)`,
  height: `var(--pagination-item-size, 28px)`,
  padding: 0,
  margin: 0,
  border: `var(--pagination-item-border-width, 1px) solid var(--pagination-item-border-color, transparent)`,
  borderRadius: `var(--pagination-item-radius, ${radius.sm})`,
  background: `var(--pagination-item-bg, transparent)`,
  color: `var(--pagination-item-color, ${color.text.primary})`,
  fontFamily: "inherit",
  fontSize: `var(--pagination-item-font-size, ${typography.body.medium.fontSize})`,
  fontWeight: `var(--pagination-item-font-weight, ${fontWeight.medium})`,
  lineHeight: 1,
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  flexShrink: 0,
  boxSizing: "border-box",
  transition: [
    `background ${motion.duration.fast} ${motion.easing.standard}`,
    `border-color ${motion.duration.fast} ${motion.easing.standard}`,
    `color ${motion.duration.fast} ${motion.easing.standard}`,
  ].join(", "),
  selectors: {
    "&:hover:not([data-disabled='true']):not([data-active='true'])": {
      background: `var(--pagination-item-bg-hover, ${color.surface.hover})`,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
    "&[data-disabled='true']": {
      cursor: "not-allowed",
      opacity: 0.4,
      pointerEvents: "none",
    },
    // The current page — uses the accent surface to flag itself as
    // selected. Bordered so it reads as a button still, just an active
    // one. Same treatment as the `1` cell in the reference design.
    "&[data-active='true']": {
      vars: {
        "--pagination-item-bg": `var(--pagination-item-bg-active, ${color.surface.selected})`,
        "--pagination-item-color": `var(--pagination-item-color-active, ${color.text.accent})`,
        "--pagination-item-border-color": `var(--pagination-item-border-color-active, ${color.border.focus})`,
      },
      cursor: "default",
    },
  },
});

// ---------- ellipsis (non-interactive) ----------

export const ellipsis = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--pagination-item-size, 28px)`,
  height: `var(--pagination-item-size, 28px)`,
  color: color.text.subtle,
  flexShrink: 0,
  userSelect: "none",
});

// ---------- size scale ----------

export const size = styleVariants({
  small: {
    vars: {
      "--pagination-item-size": "24px",
      "--pagination-item-font-size": typography.body.small.fontSize,
      "--pagination-gap": "2px",
    },
  },
  medium: {
    vars: {
      "--pagination-item-size": "28px",
      "--pagination-item-font-size": typography.body.medium.fontSize,
      "--pagination-gap": space[2],
    },
  },
  large: {
    vars: {
      "--pagination-item-size": "36px",
      "--pagination-item-font-size": typography.body.medium.fontSize,
      "--pagination-gap": space[4],
    },
  },
});
