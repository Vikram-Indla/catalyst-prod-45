import { keyframes, style } from "@vanilla-extract/css";
import { motion, space, typography } from "@catylast/tokens";

// Spec colours — exact hex/rgba per the design handoff. The strap is a
// dark surface that floats over both light and dark themes, so the
// values aren't theme-swapped today; they live outside the semantic
// palette deliberately. If a `color.surface.inverse` token lands later,
// these can move to token references without touching consumers.
const STRAP_BG = "rgba(41, 42, 46, 1)";
const COUNT_BADGE_BG = "rgba(61, 63, 67, 1)";
const COUNT_TEXT = "rgba(206, 207, 210, 1)";
const LABEL_TEXT = "rgba(150, 153, 158, 1)";
const LABEL_TEXT_HOVER = "rgba(206, 207, 210, 1)";
const DIVIDER_COLOR = "rgba(255, 255, 255, 0.14)";
const HOVER_BG = "rgba(255, 255, 255, 0.08)";
const FOCUS_RING = "rgba(132, 169, 255, 0.85)";

// Slide-up + fade-in. Consumer positions the strap; the keyframe only
// translates on the Y axis (translateY) so it composes with whatever
// X-centring transform the parent applies.
const slideUp = keyframes({
  from: {
    opacity: 0,
    transform: "translateY(calc(100% + 24px))",
  },
  to: {
    opacity: 1,
    transform: "translateY(0)",
  },
});

export const strap = style({
  display: "inline-flex",
  alignItems: "center",
  // Spec: gap 24px between every item in the strap.
  gap: space[24],
  // Spec: paddingTop/Bottom = space.150 (12px), Left/Right = space.300 (24px).
  padding: `${space[12]} ${space[24]}`,
  background: STRAP_BG,
  // Spec: radius 12px.
  borderRadius: "12px",
  // 1px translucent-white border + strong drop shadow keeps the strap
  // legible on both themes — on light surfaces the shadow does most
  // of the work, on dark surfaces (where the strap could blend with
  // the page background) the bright border edge gives the silhouette.
  border: "1px solid rgba(255, 255, 255, 0.10)",
  boxShadow:
    "0 12px 32px rgba(0, 0, 0, 0.35), 0 4px 8px rgba(0, 0, 0, 0.18)",
  whiteSpace: "nowrap",
  // Animation runs once on mount; `both` keeps the final state stable
  // after the keyframe finishes.
  animation: `${slideUp} ${motion.duration.normal} ${motion.easing.entrance} both`,
});

export const countBadge = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "24px",
  height: "24px",
  padding: "0 8px",
  borderRadius: "3px",
  background: COUNT_BADGE_BG,
  color: COUNT_TEXT,
  // Spec: font body/L/Regular, line-height Body L, letter-spacing 0%.
  fontFamily: typography.body.large.fontFamily,
  fontSize: typography.body.large.fontSize,
  fontWeight: typography.body.large.fontWeight,
  lineHeight: typography.body.large.lineHeight,
  letterSpacing: 0,
  // Tabular nums so the badge width stays stable as the count changes
  // (1 → 12 → 123 don't reflow neighbouring items).
  fontVariantNumeric: "tabular-nums",
});

// Shared body/M weight 500 type for the "selected" word and every
// action label. Pulled out so the two declarations stay in lockstep.
const labelTypography = {
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  lineHeight: typography.body.medium.lineHeight,
  fontWeight: 500,
} as const;

export const selectedLabel = style({
  ...labelTypography,
  color: LABEL_TEXT,
});

export const actionButton = style({
  ...labelTypography,
  display: "inline-flex",
  alignItems: "center",
  // Tighter 6px gap inside a button (icon ↔ label) than the 24px gap
  // between strap items.
  gap: "6px",
  padding: "4px 6px",
  margin: "-4px -6px",
  border: "none",
  background: "transparent",
  color: LABEL_TEXT,
  cursor: "pointer",
  borderRadius: "4px",
  transition: `color ${motion.duration.fast} ${motion.easing.standard}, background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      color: LABEL_TEXT_HOVER,
      background: HOVER_BG,
    },
    "&:focus-visible": {
      outline: `2px solid ${FOCUS_RING}`,
      outlineOffset: "1px",
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
});

// Icon stroke inherits from the button colour via `currentColor`, so
// label text and glyph recolour together on hover.
export const actionIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  color: "currentColor",
});

export const divider = style({
  width: "1px",
  height: "20px",
  background: DIVIDER_COLOR,
  flexShrink: 0,
});

export const closeButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  border: "none",
  background: "transparent",
  color: LABEL_TEXT,
  cursor: "pointer",
  borderRadius: "4px",
  padding: 0,
  transition: `color ${motion.duration.fast} ${motion.easing.standard}, background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      color: LABEL_TEXT_HOVER,
      background: HOVER_BG,
    },
    "&:focus-visible": {
      outline: `2px solid ${FOCUS_RING}`,
      outlineOffset: "1px",
    },
  },
});
