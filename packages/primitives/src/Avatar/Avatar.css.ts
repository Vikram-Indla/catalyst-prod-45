import { style, styleVariants } from "@vanilla-extract/css";
import { color, fontFamily, fontWeight, radius } from "@catylast/tokens";

/*
 * Every styling dimension on Avatar is exposed as a CSS variable so
 * consumers can override per-instance via inline `style={{
 * "--avatar-bg": "..." }}` or via prop. Defaults flow through
 * `@catylast/tokens` semantic tokens so dark mode and theme swaps
 * work without component changes.
 */

export const root = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--avatar-size, 32px)`,
  height: `var(--avatar-size, 32px)`,
  borderRadius: `var(--avatar-radius, ${radius.full})`,
  background: `var(--avatar-bg, ${color.surface.sunken})`,
  color: `var(--avatar-color, ${color.text.secondary})`,
  border: `var(--avatar-border-width, 1px) solid var(--avatar-border-color, ${color.border.subtle})`,
  fontFamily: fontFamily.sans,
  fontWeight: `var(--avatar-font-weight, ${fontWeight.semibold})`,
  fontSize: `var(--avatar-font-size, 13px)`,
  letterSpacing: "0.02em",
  overflow: "hidden",
  flexShrink: 0,
  userSelect: "none",
  textTransform: "uppercase",
});

export const image = style({
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const size = styleVariants({
  xs: {
    vars: {
      "--avatar-size": "16px",
      "--avatar-font-size": "8px",
    },
  },
  sm: {
    vars: {
      "--avatar-size": "24px",
      "--avatar-font-size": "11px",
    },
  },
  md: {
    vars: {
      "--avatar-size": "32px",
      "--avatar-font-size": "13px",
    },
  },
  lg: {
    vars: {
      "--avatar-size": "40px",
      "--avatar-font-size": "16px",
    },
  },
  xl: {
    vars: {
      "--avatar-size": "56px",
      "--avatar-font-size": "22px",
    },
  },
});

// ---------- appearance presets (named colors) ----------
//
// Each preset sets the same `--avatar-bg` / `--avatar-color` variables
// that the deterministic-by-name "auto" mode writes inline. So consumer
// inline overrides via `style` always win cleanly regardless of which
// path produced the colors.

export const appearance = styleVariants({
  neutral: {},
  blue: {
    vars: {
      "--avatar-bg": "var(--catylast-color-blue-100)",
      "--avatar-color": "var(--catylast-color-blue-700)",
      "--avatar-border-color": "transparent",
    },
  },
  green: {
    vars: {
      "--avatar-bg": "var(--catylast-color-green-100)",
      "--avatar-color": "var(--catylast-color-green-700)",
      "--avatar-border-color": "transparent",
    },
  },
  red: {
    vars: {
      "--avatar-bg": "var(--catylast-color-red-100)",
      "--avatar-color": "var(--catylast-color-red-700)",
      "--avatar-border-color": "transparent",
    },
  },
  yellow: {
    vars: {
      "--avatar-bg": "var(--catylast-color-yellow-100)",
      "--avatar-color": "var(--catylast-color-yellow-700)",
      "--avatar-border-color": "transparent",
    },
  },
  purple: {
    vars: {
      "--avatar-bg": "var(--catylast-color-purple-100)",
      "--avatar-color": "var(--catylast-color-purple-700)",
      "--avatar-border-color": "transparent",
    },
  },
});
