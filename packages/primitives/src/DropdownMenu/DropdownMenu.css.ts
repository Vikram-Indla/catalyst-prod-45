import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  elevation,
  fontWeight,
  motion,
  radius,
  space,
  typography,
  zIndex,
} from "@catylast/tokens";

/*
 * Every styling dimension on DropdownMenu is exposed as a CSS variable
 * on the content root and on the items, so consumers can override per-
 * instance via inline `style` or via prop. Defaults flow through
 * `@catylast/tokens` semantic tokens — dark mode and theme swaps work
 * without component changes.
 */

// ---------- entrance / exit animation ----------

const fadeIn = keyframes({
  from: { opacity: 0, transform: "translateY(-2px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

// ---------- content surface ----------

export const content = style({
  background: `var(--ddm-bg, ${color.surface.overlay})`,
  border: `var(--ddm-border-width, 1px) solid var(--ddm-border-color, ${color.border.default})`,
  borderRadius: `var(--ddm-radius, ${radius.md})`,
  padding: `var(--ddm-padding, ${space[4]})`,
  boxShadow: `var(--ddm-shadow, ${elevation.lg})`,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: `var(--ddm-font-size, ${typography.body.medium.fontSize})`,
  lineHeight: typography.body.medium.lineHeight,
  color: `var(--ddm-color, ${color.text.primary})`,
  minWidth: `var(--ddm-min-width, 200px)`,
  maxWidth: `var(--ddm-max-width, 360px)`,
  maxHeight: "var(--radix-popper-available-height, 70vh)",
  overflowY: "auto",
  overscrollBehavior: "contain",
  zIndex: zIndex.dropdown,
  outline: "none",
  selectors: {
    "&[data-state='open']": {
      animation: `${fadeIn} ${motion.duration.fast} ${motion.easing.standard}`,
    },
  },
});

// ---------- group + label + separator ----------

export const group = style({
  display: "flex",
  flexDirection: "column",
});

export const groupTitle = style({
  paddingInline: `var(--ddm-item-padding-x, ${space[8]})`,
  paddingBlock: `var(--ddm-group-title-padding-y, ${space[6]})`,
  fontSize: `var(--ddm-group-title-font-size, ${typography.body.small.fontSize})`,
  fontWeight: `var(--ddm-group-title-font-weight, ${fontWeight.semibold})`,
  color: `var(--ddm-group-title-color, ${color.text.subtle})`,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const separator = style({
  height: "1px",
  background: `var(--ddm-separator-color, ${color.border.subtle})`,
  margin: `${space[4]} ${space[2]}`,
});

// ---------- base item shape (shared by Item / CheckboxItem / RadioItem / SubTrigger) ----------

export const item = style({
  display: "flex",
  alignItems: "center",
  gap: `var(--ddm-item-gap, ${space[8]})`,
  paddingInline: `var(--ddm-item-padding-x, ${space[8]})`,
  paddingBlock: `var(--ddm-item-padding-y, ${space[6]})`,
  borderRadius: `var(--ddm-item-radius, ${radius.sm})`,
  color: `var(--ddm-item-color, ${color.text.primary})`,
  background: `var(--ddm-item-bg, transparent)`,
  cursor: "pointer",
  outline: "none",
  userSelect: "none",
  position: "relative",
  fontWeight: `var(--ddm-item-font-weight, ${fontWeight.regular})`,
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&[data-highlighted]": {
      background: `var(--ddm-item-bg-hover, ${color.surface.hover})`,
    },
    "&[data-disabled]": {
      cursor: "not-allowed",
      color: `var(--ddm-item-color-disabled, ${color.text.disabled})`,
      pointerEvents: "none",
    },
  },
});

// ---------- icon + label + description layout ----------

export const itemIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--ddm-item-icon-size, 16px)`,
  height: `var(--ddm-item-icon-size, 16px)`,
  flexShrink: 0,
  color: "currentColor",
});

export const itemBody = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
});

export const itemLabel = style({
  // Allow long labels to wrap rather than being truncated; consumers can
  // override with --ddm-item-label-overflow if they want a one-liner.
  overflow: `var(--ddm-item-label-overflow, visible)`,
  whiteSpace: `var(--ddm-item-label-whitespace, normal)`,
  textOverflow: `var(--ddm-item-label-text-overflow, clip)`,
});

export const itemDescription = style({
  marginTop: "1px",
  fontSize: `var(--ddm-item-description-font-size, ${typography.body.small.fontSize})`,
  color: `var(--ddm-item-description-color, ${color.text.subtle})`,
  fontWeight: fontWeight.regular,
  whiteSpace: "normal",
});

export const itemTrailing = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[6],
  marginLeft: "auto",
  paddingLeft: space[12],
  color: color.text.subtle,
  flexShrink: 0,
});

// ---------- appearance variants (color presets for items) ----------

export const itemAppearance = styleVariants({
  default: {},
  primary: {
    vars: {
      "--ddm-item-color": color.text.accent,
      "--ddm-item-bg-hover": color.surface.hover,
    },
  },
  danger: {
    vars: {
      "--ddm-item-color": color.text.danger,
      "--ddm-item-bg-hover": color.danger.background,
      "--ddm-item-color-hover": color.danger.text,
    },
    selectors: {
      "&[data-highlighted]": {
        color: `var(--ddm-item-color-hover, ${color.danger.text})`,
      },
    },
  },
});

// ---------- checkbox / radio glyph slot ----------

/**
 * Reserves a fixed-width column on the left of every checkable item so
 * the labels of selected and unselected items align. Same dimensions as
 * an icon slot — either column slot can carry an icon glyph.
 */
export const checkmarkSlot = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: `var(--ddm-item-icon-size, 16px)`,
  height: `var(--ddm-item-icon-size, 16px)`,
  flexShrink: 0,
  color: `var(--ddm-checkmark-color, ${color.text.accent})`,
});

// ---------- sub-trigger arrow ----------

export const subTriggerArrow = style({
  marginLeft: "auto",
  paddingLeft: space[12],
  display: "inline-flex",
  alignItems: "center",
  color: color.text.subtle,
});

// ---------- size scale ----------

export const size = styleVariants({
  small: {
    vars: {
      "--ddm-padding": space[2],
      "--ddm-item-padding-y": space[4],
      "--ddm-item-padding-x": space[6],
      "--ddm-font-size": typography.body.small.fontSize,
      "--ddm-min-width": "160px",
    },
  },
  medium: {
    vars: {
      "--ddm-padding": space[4],
      "--ddm-item-padding-y": space[6],
      "--ddm-item-padding-x": space[8],
      "--ddm-font-size": typography.body.medium.fontSize,
      "--ddm-min-width": "200px",
    },
  },
  large: {
    vars: {
      "--ddm-padding": space[6],
      "--ddm-item-padding-y": space[8],
      "--ddm-item-padding-x": space[12],
      "--ddm-font-size": typography.body.large.fontSize,
      "--ddm-min-width": "240px",
    },
  },
});
