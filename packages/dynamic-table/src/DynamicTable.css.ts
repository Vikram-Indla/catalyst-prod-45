import { createVar, style, styleVariants } from "@vanilla-extract/css";
import {
  color,
  fontWeight,
  motion,
  radius,
  space,
  typography,
} from "@catylast/tokens";

const cellPadX = createVar();
const cellPadY = createVar();
const rowHeight = createVar();

export const container = style({
  position: "relative",
  // Flex-column layout so the toolbar, scrolling table region, and
  // pagination footer each get the height they need without the
  // scrolling region pushing pagination out of view. The scrollArea
  // below sets `flex: 1` + `min-height: 0` so it absorbs whatever
  // height the container has after toolbar / pagination take theirs.
  //
  // `height: 100%` is the critical line — without it, the container
  // grows to fit its content (toolbar + every row + pagination) and
  // the parent's bounded height has no effect, so scrolling never
  // happens and pagination ends up below the viewport. With `height:
  // 100%`, the container claims whatever height the parent gives it;
  // if the parent is unbounded (`height: auto`), this resolves to auto
  // and behavior degrades gracefully — table renders all rows in flow
  // with pagination at the bottom, no scroll needed.
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 0,
  background: color.surface.background,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  // Clip inner content (rows, headers) so they respect the rounded
  // corners. Portaled overlays / dropdowns mount to document.body and
  // escape this regardless — `overflow: hidden` on a non-fixed
  // ancestor never clips a portaled element.
  overflow: "hidden",
  // Establish a stacking context so the table's per-cell z-index ladder
  // (sticky headers, pinned columns) is contained locally and can never
  // accidentally compete with portaled menus at the document root.
  isolation: "isolate",
  vars: {
    [cellPadX]: space[12],
    [cellPadY]: space[8],
    [rowHeight]: "36px",
  },
});

export const densityCompact = style({
  vars: {
    [cellPadX]: space[8],
    [cellPadY]: space[4],
    [rowHeight]: "28px",
  },
});

export const densityStandard = style({
  vars: {
    [cellPadX]: space[12],
    [cellPadY]: space[8],
    [rowHeight]: "36px",
  },
});

export const densityComfortable = style({
  vars: {
    [cellPadX]: space[16],
    [cellPadY]: space[12],
    [rowHeight]: "44px",
  },
});

export const scrollArea = style({
  // Flex grow + `min-height: 0` is the standard incantation that lets a
  // flex child shrink below its content size so the inner element can
  // actually scroll. Without `min-height: 0` the body would grow past
  // the container and push the pagination footer off-screen.
  flex: 1,
  minHeight: 0,
  overflowX: "auto",
  overflowY: "auto",
});

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space[8],
  padding: `${space[6]} ${space[8]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
  background: color.surface.background,
  minHeight: "40px",
  boxSizing: "border-box",
});

export const toolbarSide = style({
  display: "flex",
  alignItems: "center",
  gap: space[8],
});

export const columnToggleCheck = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16px",
  height: "16px",
  flexShrink: 0,
  color: color.text.accent,
});

export const table = style({
  borderCollapse: "separate",
  borderSpacing: 0,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  lineHeight: typography.body.medium.lineHeight,
  color: color.text.primary,
  tableLayout: "fixed",
  width: "max-content",
  minWidth: "100%",
});

export const headerCell = style({
  position: "sticky",
  top: 0,
  background: color.surface.raised,
  borderBottom: `1px solid ${color.border.default}`,
  padding: `${cellPadY} ${cellPadX}`,
  textAlign: "left",
  // Eyebrow-style header row — slot is body.small so it stays small and
  // tight, then we overlay semibold + uppercase tracking. Same recipe
  // used by Badge.
  fontSize: typography.body.small.fontSize,
  fontWeight: fontWeight.semibold,
  color: color.text.subtle,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  zIndex: 2,
  userSelect: "none",
  minHeight: rowHeight,
  boxSizing: "border-box",
});

export const headerCellSortable = style({
  cursor: "pointer",
  selectors: {
    "&:hover": { color: color.text.primary },
  },
});

export const headerInner = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[4],
});

export const sortIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  color: color.text.accent,
});

export const sortIndicatorHidden = style({
  visibility: "hidden",
});

export const bodyRow = style({});

export const bodyRowSelected = style({});

export const bodyRowClickable = style({
  cursor: "pointer",
});

export const bodyCell = style({
  padding: `${cellPadY} ${cellPadX}`,
  borderBottom: `1px solid ${color.border.subtle}`,
  background: color.surface.background,
  minHeight: rowHeight,
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    [`${bodyRow}:hover &`]: {
      background: color.surface.hover,
    },
    [`${bodyRowSelected} &`]: {
      background: color.surface.selected,
    },
    [`${bodyRowSelected}:hover &`]: {
      background: color.surface.selected,
    },
  },
});

export const cellPinned = style({
  position: "sticky",
  zIndex: 1,
});

export const headerCellPinned = style({
  zIndex: 3,
});

export const pinnedDivider = style({
  selectors: {
    "&::after": {
      content: "''",
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: "1px",
      background: color.border.default,
    },
  },
});

export const resizeHandle = style({
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: "4px",
  cursor: "col-resize",
  userSelect: "none",
  touchAction: "none",
  opacity: 0,
  transition: `opacity ${motion.duration.fast} ${motion.easing.standard}, background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "th:hover &": {
      opacity: 1,
      background: color.accent.background,
    },
  },
});

export const resizeHandleActive = style({
  opacity: 1,
  background: color.accent.background,
});

export const expandToggle = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  border: "none",
  background: "transparent",
  color: color.text.subtle,
  cursor: "pointer",
  borderRadius: radius.xs,
  padding: 0,
  flexShrink: 0,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      color: color.text.primary,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
  },
});

export const expandSpacer = style({
  display: "inline-block",
  width: "20px",
  height: "20px",
  flexShrink: 0,
});

export const expandableCell = style({
  display: "flex",
  alignItems: "center",
  gap: space[6],
  minWidth: 0,
});

export const expandableCellContent = style({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const stateOverlay = style({
  padding: `${space[40]} ${space[20]}`,
  textAlign: "center",
  color: color.text.subtle,
  fontSize: typography.body.medium.fontSize,
  background: color.surface.background,
});

export const selectionCellWrapper = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

export const rowActions = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[2],
  marginLeft: "auto",
  paddingLeft: space[8],
  flexShrink: 0,
  opacity: 0,
  transition: `opacity ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    [`${bodyRow}:hover &, &:focus-within`]: {
      opacity: 1,
    },
  },
});

export const creatorRow = style({});

export const creatorCell = style({
  position: "sticky",
  left: 0,
  padding: `${space[4]} ${space[8]}`,
  background: color.surface.background,
  borderBottom: "none",
  boxSizing: "border-box",
});

export const creatorButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[6],
  padding: `${space[6]} ${space[8]}`,
  border: "none",
  background: "transparent",
  color: color.text.subtle,
  cursor: "pointer",
  borderRadius: radius.sm,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  fontWeight: fontWeight.medium,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      color: color.text.accent,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
  },
});

export const density = styleVariants({
  compact: [densityCompact],
  standard: [densityStandard],
  comfortable: [densityComfortable],
});

// ---------- pagination footer ----------

export const paginationBar = style({
  display: "flex",
  alignItems: "center",
  padding: `${space[6]} ${space[12]}`,
  borderTop: `1px solid ${color.border.subtle}`,
  background: color.surface.background,
  flexShrink: 0,
});

// Position variants — controls justifyContent so the pagination sits
// at the start, center, or end of the bar. Centered is the default per
// design preference. Always sits in its own fixed-height footer band
// outside the scrolling region.
export const paginationBarPosition = styleVariants({
  start: { justifyContent: "flex-start" },
  center: { justifyContent: "center" },
  end: { justifyContent: "flex-end" },
});
