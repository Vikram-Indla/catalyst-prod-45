import { globalStyle, style, styleVariants } from "@vanilla-extract/css";
import { color, radius, space } from "@catylast/tokens";

export const root = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  isolation: "isolate",
  borderRadius: `var(--btn-group-radius, ${radius.sm})`,
});

export const orientation = styleVariants({
  horizontal: {
    flexDirection: "row",
  },
  vertical: {
    flexDirection: "column",
    alignItems: "stretch",
  },
});

// ---------- gap mode (default — buttons sit side by side with a gap) ----------

export const gap = styleVariants({
  default: {
    gap: space[8],
  },
  compact: {
    gap: space[4],
  },
  none: {
    gap: 0,
  },
});

// ---------- segmented mode (no gap, shared seams, rounded outside) ----------

export const segmented = style({
  gap: 0,
  borderRadius: `var(--btn-group-radius, ${radius.sm})`,
});

// horizontal segmented
globalStyle(`${segmented}${orientation.horizontal} > *`, {
  borderRadius: 0,
  marginLeft: "-1px",
  position: "relative",
});

globalStyle(`${segmented}${orientation.horizontal} > *:first-child`, {
  marginLeft: 0,
  borderTopLeftRadius: `var(--btn-group-radius, ${radius.sm})`,
  borderBottomLeftRadius: `var(--btn-group-radius, ${radius.sm})`,
});

globalStyle(`${segmented}${orientation.horizontal} > *:last-child`, {
  borderTopRightRadius: `var(--btn-group-radius, ${radius.sm})`,
  borderBottomRightRadius: `var(--btn-group-radius, ${radius.sm})`,
});

// vertical segmented
globalStyle(`${segmented}${orientation.vertical} > *`, {
  borderRadius: 0,
  marginTop: "-1px",
  position: "relative",
});

globalStyle(`${segmented}${orientation.vertical} > *:first-child`, {
  marginTop: 0,
  borderTopLeftRadius: `var(--btn-group-radius, ${radius.sm})`,
  borderTopRightRadius: `var(--btn-group-radius, ${radius.sm})`,
});

globalStyle(`${segmented}${orientation.vertical} > *:last-child`, {
  borderBottomLeftRadius: `var(--btn-group-radius, ${radius.sm})`,
  borderBottomRightRadius: `var(--btn-group-radius, ${radius.sm})`,
});

// Lift the focused or selected segment so its outline / accent border
// isn't clipped by the neighboring segment's overlapping border.
globalStyle(
  `${segmented} > *:focus-visible, ${segmented} > [data-selected='true'], ${segmented} > [aria-pressed='true']`,
  {
    zIndex: 1,
  },
);

// Visual divider between segments when none of them sets its own border
// (e.g. all-`subtle` segments) — fall back to a token-driven seam.
globalStyle(`${segmented} > * + *`, {
  borderLeftColor: `var(--btn-group-divider-color, ${color.border.default})`,
});
