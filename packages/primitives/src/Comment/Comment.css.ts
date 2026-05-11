import { keyframes, style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  fontWeight,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

/*
 * Every styling dimension is exposed as a CSS variable on the comment
 * root so consumers can override per-instance via inline `style` or via
 * prop. Defaults flow through `@catylast/tokens` semantic tokens — dark
 * mode and theme swaps work without component changes.
 */

// ---------- root ----------

export const root = style({
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  gap: `var(--comment-gap, ${space[12]})`,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: `var(--comment-font-size, ${typography.body.medium.fontSize})`,
  lineHeight: typography.body.medium.lineHeight,
  color: `var(--comment-color, ${color.text.primary})`,
  padding: `var(--comment-padding, ${space[8]})`,
  background: `var(--comment-bg, transparent)`,
  borderRadius: `var(--comment-radius, ${radius.md})`,
  borderInlineStart:
    "var(--comment-accent-width, 0) solid var(--comment-accent-color, transparent)",
  paddingInlineStart:
    "calc(var(--comment-padding, " +
    space[8] +
    ") + var(--comment-accent-width, 0))",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, border-color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&[data-highlighted='true']": {
      vars: {
        "--comment-bg": `var(--comment-bg-highlighted, ${color.surface.selected})`,
        "--comment-accent-width": `var(--comment-accent-width-highlighted, 3px)`,
        "--comment-accent-color": `var(--comment-accent-color-highlighted, ${color.accent.background})`,
      },
    },
    "&[data-saving='true']": {
      pointerEvents: "none",
    },
  },
});

// ---------- avatar slot ----------

export const avatarSlot = style({
  flexShrink: 0,
  // Keep the avatar centred on the first line of the header rather than
  // the centre of the entire comment block.
  marginTop: "1px",
});

// ---------- main column (header + body + actions) ----------

export const main = style({
  display: "flex",
  flexDirection: "column",
  gap: `var(--comment-row-gap, ${space[4]})`,
  flex: 1,
  minWidth: 0,
});

// ---------- header row (author, type, restricted, time) ----------

export const header = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: `var(--comment-header-gap, ${space[6]})`,
  fontSize: `var(--comment-header-font-size, ${typography.body.small.fontSize})`,
  color: `var(--comment-header-color, ${color.text.subtle})`,
  lineHeight: 1.4,
});

export const author = style({
  fontWeight: `var(--comment-author-weight, ${fontWeight.semibold})`,
  color: `var(--comment-author-color, ${color.text.primary})`,
  margin: 0,
});

export const typeTag = style({
  display: "inline-flex",
  alignItems: "center",
  paddingInline: space[6],
  paddingBlock: "1px",
  borderRadius: radius.sm,
  background: `var(--comment-type-bg, ${color.surface.raised})`,
  color: `var(--comment-type-color, ${color.text.subtle})`,
  border: `1px solid ${color.border.subtle}`,
  fontSize: typography.body.small.fontSize,
  fontWeight: fontWeight.medium,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const restricted = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: `var(--comment-restricted-color, ${color.text.warning})`,
  fontSize: typography.body.small.fontSize,
  fontWeight: fontWeight.medium,
});

export const headerSeparator = style({
  color: color.text.disabled,
  selectors: {
    "&::before": {
      content: '"·"',
    },
  },
});

export const time = style({
  color: `var(--comment-time-color, ${color.text.subtle})`,
  textDecoration: "none",
  fontSize: typography.body.small.fontSize,
  selectors: {
    "&:is(a):hover": {
      textDecoration: "underline",
      color: color.text.accent,
    },
  },
});

// ---------- content body ----------

export const content = style({
  color: `var(--comment-content-color, ${color.text.primary})`,
  lineHeight: 1.5,
  wordBreak: "break-word",
  margin: 0,
});

// ---------- actions row ----------

export const actions = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: `var(--comment-actions-gap, ${space[4]})`,
  marginTop: `var(--comment-actions-margin-top, ${space[4]})`,
});

export const actionItem = style({
  display: "inline-flex",
  alignItems: "center",
});

export const actionSeparator = style({
  color: color.text.disabled,
  paddingInline: space[4],
  selectors: {
    "&::before": {
      content: '"·"',
    },
  },
});

// ---------- saving state ----------

const pulse = keyframes({
  "0%, 100%": { opacity: 0.5 },
  "50%": { opacity: 1 },
});

export const savingOverlay = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  marginTop: space[4],
  fontSize: typography.body.small.fontSize,
  color: color.text.subtle,
  animation: `${pulse} 1.4s ease-in-out infinite`,
});

export const savingDot = style({
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  background: "currentColor",
});

// ---------- nested replies ----------

export const nested = style({
  display: "flex",
  flexDirection: "column",
  gap: `var(--comment-nested-gap, ${space[4]})`,
  marginTop: `var(--comment-nested-margin-top, ${space[8]})`,
  // Indentation comes from the parent. Consumers that want a hairline
  // thread guide can also set `--comment-nested-border-color`.
  paddingInlineStart: `var(--comment-nested-indent, ${space[8]})`,
  borderInlineStart:
    "var(--comment-nested-border-width, 0) solid var(--comment-nested-border-color, transparent)",
});

// ---------- size scale ----------

export const size = styleVariants({
  small: {
    vars: {
      "--comment-font-size": typography.body.small.fontSize,
      "--comment-header-font-size": typography.body.small.fontSize,
      "--comment-padding": space[6],
      "--comment-gap": space[8],
    },
  },
  medium: {
    vars: {
      "--comment-font-size": typography.body.medium.fontSize,
      "--comment-header-font-size": typography.body.small.fontSize,
      "--comment-padding": space[8],
      "--comment-gap": space[12],
    },
  },
  large: {
    vars: {
      "--comment-font-size": typography.body.large.fontSize,
      "--comment-header-font-size": typography.body.medium.fontSize,
      "--comment-padding": space[12],
      "--comment-gap": space[16],
    },
  },
});
