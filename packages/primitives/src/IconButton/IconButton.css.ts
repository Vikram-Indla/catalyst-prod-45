import { style, styleVariants } from "@vanilla-extract/css";

/*
 * IconButton intentionally re-uses the appearance + state contract from
 * Button (same `--btn-*` CSS variables) so the two surfaces stay visually
 * coherent. The only IconButton-specific styles are dimensions: width
 * equals height, no horizontal padding scaling.
 */

export { appearance } from "../Button/Button.css";
export { spacing as buttonSpacing } from "../Button/Button.css";

export const root = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: `var(--btn-border-width, 1px) solid var(--btn-border-color, transparent)`,
  borderRadius: `var(--btn-radius, var(--catylast-radius-sm))`,
  background: `var(--btn-bg, transparent)`,
  color: `var(--btn-color, var(--catylast-color-text-primary))`,
  cursor: "pointer",
  padding: 0,
  margin: 0,
  flexShrink: 0,
  appearance: "none",
  WebkitAppearance: "none",
  width: `var(--btn-size, 32px)`,
  height: `var(--btn-size, 32px)`,
  minHeight: `var(--btn-size, 32px)`,
  boxSizing: "border-box",
  isolation: "isolate",
  transition:
    "background var(--catylast-motion-duration-fast, 150ms) ease, color var(--catylast-motion-duration-fast, 150ms) ease, border-color var(--catylast-motion-duration-fast, 150ms) ease",
  selectors: {
    "&:focus-visible": {
      outline: `2px solid var(--catylast-color-border-focus)`,
      outlineOffset: "2px",
    },
    "&:hover:not([data-disabled='true']):not([data-loading='true'])": {
      background: `var(--btn-bg-hover, var(--btn-bg, transparent))`,
      borderColor: `var(--btn-border-color-hover, var(--btn-border-color, transparent))`,
      color: `var(--btn-color-hover, var(--btn-color))`,
    },
    "&:active:not([data-disabled='true']):not([data-loading='true'])": {
      background: `var(--btn-bg-pressed, var(--btn-bg-hover, var(--btn-bg, transparent)))`,
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
        "--btn-bg": `var(--btn-bg-selected, var(--catylast-color-surface-selected))`,
        "--btn-color": `var(--btn-color-selected, var(--catylast-color-text-accent))`,
        "--btn-border-color": `var(--btn-border-color-selected, var(--catylast-color-border-focus))`,
      },
    },
  },
});

export const size = styleVariants({
  small: {
    vars: {
      "--btn-size": "24px",
      "--btn-icon-size": "14px",
    },
  },
  medium: {
    vars: {
      "--btn-size": "32px",
      "--btn-icon-size": "16px",
    },
  },
  large: {
    vars: {
      "--btn-size": "40px",
      "--btn-icon-size": "20px",
    },
  },
});

/**
 * Wraps the icon glyph so the spinner replaces it cleanly during loading
 * without shifting the surrounding pixels.
 */
export const iconLayer = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "var(--btn-icon-size, 16px)",
  height: "var(--btn-icon-size, 16px)",
  selectors: {
    "[data-loading='true'] &": {
      opacity: 0,
    },
  },
});
