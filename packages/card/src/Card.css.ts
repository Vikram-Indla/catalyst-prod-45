import { globalStyle, style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  elevation,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

/*
 * Every customizable dimension is exposed as a CSS variable on the root so
 * consumers can override per-instance via inline `style={{ "--card-radius":
 * tokens.radius.lg }}` or via prop, and library defaults still resolve
 * through the token system. The fallback value in each `var()` is the
 * relevant token, NOT a hardcoded literal.
 */

// ---------- root ----------

export const root = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  isolation: "isolate", // contain bg-image overlay z-index
  background: `var(--card-bg, ${color.surface.background})`,
  color: color.text.primary,
  // Card establishes the typography baseline for everything inside it.
  // Consumers compose their own `<Heading>` / `<Text>` inside the slots
  // for finer control; the default here keeps the surface readable
  // without explicit children.
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  lineHeight: typography.body.medium.lineHeight,
  textAlign: "left",
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
  font: "inherit",
  borderRadius: `var(--card-radius, ${radius.md})`,
  border: `var(--card-border-width, 1px) solid var(--card-border-color, transparent)`,
  boxShadow: `var(--card-shadow, none)`,
  overflow: "hidden",
  width: `var(--card-width, auto)`,
  transition: [
    `background ${motion.duration.fast} ${motion.easing.standard}`,
    `border-color ${motion.duration.fast} ${motion.easing.standard}`,
    `box-shadow ${motion.duration.fast} ${motion.easing.standard}`,
    `transform ${motion.duration.fast} ${motion.easing.standard}`,
  ].join(", "),
});

// Tone strip — a thin accent band along the top edge, controlled via
// --card-tone-color. Default height is zero so it's invisible until set.
globalStyle(`${root}::before`, {
  content: "''",
  position: "absolute",
  insetBlockStart: 0,
  insetInline: 0,
  height: `var(--card-tone-height, 0)`,
  background: `var(--card-tone-color, transparent)`,
  pointerEvents: "none",
  zIndex: 2,
});

// ---------- variants (presets — they set CSS variables) ----------

export const variant = styleVariants({
  outlined: {
    vars: {
      "--card-border-color": color.border.subtle,
      "--card-border-width": "1px",
      "--card-shadow": "none",
    },
  },
  elevated: {
    vars: {
      "--card-border-color": "transparent",
      "--card-border-width": "1px",
      "--card-shadow": elevation.sm,
    },
  },
  filled: {
    vars: {
      "--card-border-color": "transparent",
      "--card-border-width": "1px",
      "--card-shadow": "none",
      "--card-bg": color.surface.raised,
    },
  },
});

// ---------- background image layer ----------

// We render the bg-image as an absolutely-positioned layer rather than as
// a background on the root so an overlay can sit between the image and the
// card content. Layer order: bg-image (z-index 0) → overlay (z-index 1) →
// content (z-index 3) → tone strip (z-index 2 above bg, behind content).
export const bgImage = style({
  position: "absolute",
  inset: 0,
  backgroundImage: `var(--card-bg-image)`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  opacity: `var(--card-bg-image-opacity, 1)`,
  zIndex: 0,
  pointerEvents: "none",
});

export const bgOverlay = style({
  position: "absolute",
  inset: 0,
  background: `var(--card-bg-overlay, transparent)`,
  zIndex: 1,
  pointerEvents: "none",
});

// Content layer — children render here so they sit above the bg/overlay.
export const contentLayer = style({
  position: "relative",
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
});

// ---------- interactive (hover, pressed, focus) ----------

export const interactive = style({
  cursor: "pointer",
  selectors: {
    "&:hover": {
      borderColor: color.border.default,
      boxShadow: `var(--card-shadow-hover, ${elevation.md})`,
    },
    "&:active": {
      transform: "translateY(0.5px)",
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "2px",
    },
  },
});

// On filled cards, hover dims the surface slightly.
export const interactiveFilled = style({
  selectors: {
    "&:hover": { background: color.surface.hover },
  },
});

// On elevated cards, hover bumps to the next elevation step.
export const interactiveElevated = style({
  vars: {
    "--card-shadow-hover": elevation.lg,
  },
});

// ---------- selected ----------

export const selected = style({
  vars: {
    "--card-border-color": color.border.focus,
    "--card-bg": color.surface.selected,
  },
  selectors: {
    "&:hover": {
      borderColor: color.border.focus,
      background: color.surface.selected,
    },
  },
});

// ---------- disabled ----------

export const disabled = style({
  cursor: "not-allowed",
  opacity: 0.6,
  selectors: {
    "&:hover": {
      borderColor: "inherit",
      boxShadow: "inherit",
      background: "inherit",
      transform: "none",
    },
    "&:active": {
      transform: "none",
      background: "inherit",
    },
  },
});

// ---------- slot containers ----------

export const cover = style({
  display: "block",
  width: "100%",
  height: `var(--card-cover-height, auto)`,
  overflow: "hidden",
  flexShrink: 0,
});

globalStyle(`${cover} > img, ${cover} > video`, {
  display: "block",
  width: "100%",
  height: "100%",
  objectFit: "cover",
});

export const header = style({
  display: "flex",
  alignItems: "center",
  gap: space[8],
  paddingInline: `var(--card-padding-x, ${space[16]})`,
  paddingBlock: `var(--card-padding-y, ${space[12]})`,
  borderBottom: `1px solid ${color.border.subtle}`,
});

export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: space[8],
  padding: `var(--card-padding, ${space[16]})`,
  flex: 1,
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  gap: space[8],
  paddingInline: `var(--card-padding-x, ${space[16]})`,
  paddingBlock: `var(--card-padding-y, ${space[12]})`,
  borderTop: `1px solid ${color.border.subtle}`,
  color: color.text.subtle,
});
