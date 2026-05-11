import { globalStyle, style } from "@vanilla-extract/css";
import { color, radius } from "@catylast/tokens";

export const root = style({
  display: "inline-flex",
  flexDirection: "row",
  alignItems: "stretch",
  isolation: "isolate",
  borderRadius: `var(--split-radius, ${radius.sm})`,
});

// Apply the seam treatment to direct button children — round outside
// corners, square inside corners, share a 1px divider on the inner edge.
// Selectors match `.cat-split` so consumers can pass any element type.
globalStyle(`${root} > *`, {
  borderRadius: 0,
  position: "relative",
});

globalStyle(`${root} > *:first-child`, {
  borderTopLeftRadius: `var(--split-radius, ${radius.sm})`,
  borderBottomLeftRadius: `var(--split-radius, ${radius.sm})`,
});

globalStyle(`${root} > *:last-child`, {
  borderTopRightRadius: `var(--split-radius, ${radius.sm})`,
  borderBottomRightRadius: `var(--split-radius, ${radius.sm})`,
});

// Seam — a 1px divider between adjacent halves. Implemented as a left
// border on every child after the first, scoped to the SplitButton root
// so we don't need a wrapping element.
globalStyle(`${root} > * + *`, {
  marginLeft: "0",
  borderLeft: `1px solid var(--split-divider-color, ${color.border.default})`,
});

// When focused, raise the focused half so its outline isn't clipped by the
// adjacent half.
globalStyle(`${root} > *:focus-visible`, {
  zIndex: 1,
});
