import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import {
  color,
  elevation,
  fontFamily,
  fontWeight,
  lineHeight,
  motion,
  radius,
  space,
  typography,
  zIndex,
} from "@catylast/tokens";

// ---------- container ----------

export const container = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${color.border.subtle}`,
  borderRadius: radius.md,
  background: color.surface.background,
  fontFamily: typography.body.medium.fontFamily,
  color: color.text.primary,
  transition: `border-color ${motion.duration.normal} ${motion.easing.standard}, box-shadow ${motion.duration.normal} ${motion.easing.standard}`,
});

export const containerEditing = style({
  borderColor: color.border.focus,
  boxShadow: elevation.sm,
});

export const containerView = style({
  cursor: "text",
  selectors: {
    "&:hover": {
      borderColor: color.border.default,
      boxShadow: elevation.xs,
    },
  },
});

// ---------- toolbar ----------

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: space[2],
  padding: `${space[6]} ${space[10]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
  background: color.surface.raised,
  borderTopLeftRadius: radius.md,
  borderTopRightRadius: radius.md,
});

export const toolbarSeparator = style({
  width: "1px",
  alignSelf: "stretch",
  margin: `${space[4]} ${space[6]}`,
  background: color.border.subtle,
});

export const toolbarButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "30px",
  height: "30px",
  padding: 0,
  border: "1px solid transparent",
  borderRadius: radius.sm,
  background: "transparent",
  color: color.text.secondary,
  cursor: "pointer",
  flexShrink: 0,
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}, transform ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover:not(:disabled)": {
      background: color.surface.hover,
      color: color.text.primary,
    },
    "&:active:not(:disabled)": {
      background: color.surface.pressed,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.4,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
  },
});

export const toolbarButtonActive = style({
  background: color.surface.selected,
  color: color.text.accent,
  selectors: {
    "&:hover:not(:disabled)": {
      background: color.surface.selected,
      color: color.text.accent,
    },
  },
});

export const toolbarHeadingTrigger = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: space[6],
  padding: `0 ${space[10]}`,
  height: "30px",
  border: `1px solid ${color.border.subtle}`,
  borderRadius: radius.sm,
  background: color.surface.background,
  color: color.text.primary,
  cursor: "pointer",
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  fontWeight: fontWeight.medium,
  minWidth: "130px",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, border-color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      borderColor: color.border.default,
    },
    "&:focus-visible": {
      outline: `2px solid ${color.border.focus}`,
      outlineOffset: "1px",
    },
  },
});

// ---------- content area ----------

export const content = style({
  position: "relative",
  padding: `${space[20]} ${space[24]} ${space[20]} ${space[40]}`,
  fontSize: typography.body.medium.fontSize,
  lineHeight: lineHeight.normal,
  minHeight: "140px",
});

export const contentReadOnly = style({
  cursor: "text",
});

// ---------- prose styles inside ProseMirror ----------

globalStyle(`${content} .ProseMirror`, {
  outline: "none",
  minHeight: "100px",
});

// Paragraph
globalStyle(`${content} .ProseMirror p`, {
  margin: `0 0 ${space[8]} 0`,
});

globalStyle(`${content} .ProseMirror p:last-child`, {
  marginBottom: 0,
});

// Headings — map H1 / H2 / H3 to the typography heading slots so the
// editor's preview matches the rest of the design system exactly.
globalStyle(`${content} .ProseMirror h1`, {
  fontSize: typography.heading.large.fontSize,
  fontWeight: typography.heading.large.fontWeight,
  lineHeight: typography.heading.large.lineHeight,
  margin: `${space[20]} 0 ${space[8]} 0`,
});

globalStyle(`${content} .ProseMirror h2`, {
  fontSize: typography.heading.medium.fontSize,
  fontWeight: typography.heading.medium.fontWeight,
  lineHeight: typography.heading.medium.lineHeight,
  margin: `${space[16]} 0 ${space[6]} 0`,
});

globalStyle(`${content} .ProseMirror h3`, {
  fontSize: typography.heading.small.fontSize,
  fontWeight: typography.heading.small.fontWeight,
  lineHeight: typography.heading.small.lineHeight,
  margin: `${space[12]} 0 ${space[4]} 0`,
});

globalStyle(`${content} .ProseMirror h1:first-child`, { marginTop: 0 });
globalStyle(`${content} .ProseMirror h2:first-child`, { marginTop: 0 });
globalStyle(`${content} .ProseMirror h3:first-child`, { marginTop: 0 });

// Lists
globalStyle(`${content} .ProseMirror ul, ${content} .ProseMirror ol`, {
  margin: `${space[4]} 0 ${space[8]} 0`,
  paddingLeft: space[24],
});

globalStyle(`${content} .ProseMirror li`, {
  margin: `${space[2]} 0`,
});

globalStyle(`${content} .ProseMirror li > p`, {
  margin: 0,
});

// Task list
globalStyle(`${content} .ProseMirror ul[data-type="taskList"]`, {
  paddingLeft: 0,
  listStyle: "none",
});

globalStyle(`${content} .ProseMirror ul[data-type="taskList"] li`, {
  display: "flex",
  alignItems: "flex-start",
  gap: space[8],
});

globalStyle(`${content} .ProseMirror ul[data-type="taskList"] li > label`, {
  display: "inline-flex",
  alignItems: "center",
  marginTop: "3px",
  flexShrink: 0,
});

globalStyle(
  `${content} .ProseMirror ul[data-type="taskList"] li > label > input[type="checkbox"]`,
  {
    accentColor: color.accent.background,
    cursor: "pointer",
  },
);

globalStyle(`${content} .ProseMirror ul[data-type="taskList"] li > div`, {
  flex: 1,
});

globalStyle(
  `${content} .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div`,
  {
    color: color.text.subtle,
    textDecoration: "line-through",
  },
);

// Blockquote
globalStyle(`${content} .ProseMirror blockquote`, {
  margin: `${space[8]} 0`,
  paddingLeft: space[16],
  borderLeft: `3px solid ${color.border.strong}`,
  color: color.text.secondary,
  fontStyle: "italic",
});

// Inline code — uses the typography.code slot for the family / size /
// weight; keeps 0.9em so it shrinks slightly relative to surrounding body
// text without dropping below the legibility floor.
globalStyle(`${content} .ProseMirror code`, {
  fontFamily: typography.code.fontFamily,
  fontSize: "0.9em",
  background: color.surface.sunken,
  padding: `${space[1]} ${space[6]}`,
  borderRadius: radius.xs,
  border: `1px solid ${color.border.subtle}`,
});

// Code block
globalStyle(`${content} .ProseMirror pre`, {
  fontFamily: typography.code.fontFamily,
  fontSize: typography.code.fontSize,
  lineHeight: typography.code.lineHeight,
  margin: `${space[8]} 0`,
  padding: `${space[12]} ${space[16]}`,
  background: color.surface.sunken,
  border: `1px solid ${color.border.subtle}`,
  borderRadius: radius.sm,
  overflowX: "auto",
});

globalStyle(`${content} .ProseMirror pre code`, {
  background: "transparent",
  border: "none",
  padding: 0,
  fontSize: "inherit",
});

// Links
globalStyle(`${content} .ProseMirror a`, {
  color: color.text.accent,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
  cursor: "pointer",
});

// Strong / emphasis
globalStyle(`${content} .ProseMirror strong`, {
  fontWeight: fontWeight.semibold,
});

// Horizontal rule
globalStyle(`${content} .ProseMirror hr`, {
  margin: `${space[16]} 0`,
  border: "none",
  height: "1px",
  background: color.border.subtle,
});

// Images
globalStyle(`${content} .ProseMirror img`, {
  maxWidth: "100%",
  height: "auto",
  borderRadius: radius.sm,
  margin: `${space[8]} 0`,
});

// Placeholder (Tiptap empty-doc placeholder uses .is-editor-empty class)
globalStyle(
  `${content} .ProseMirror p.is-editor-empty:first-child::before`,
  {
    content: "attr(data-placeholder)",
    float: "left",
    color: color.text.subtle,
    fontStyle: "italic",
    pointerEvents: "none",
    height: 0,
  },
);

globalStyle(`${content} .ProseMirror video`, {
  maxWidth: "100%",
  height: "auto",
  borderRadius: radius.sm,
  margin: `${space[8]} 0`,
  display: "block",
});

// hljs token classes (lowlight)
globalStyle(`${content} .hljs-comment, ${content} .hljs-quote`, {
  color: color.text.subtle,
  fontStyle: "italic",
});
globalStyle(
  `${content} .hljs-keyword, ${content} .hljs-selector-tag, ${content} .hljs-literal, ${content} .hljs-section, ${content} .hljs-link`,
  { color: color.purple[500] },
);
globalStyle(`${content} .hljs-string, ${content} .hljs-attr`, {
  color: color.green[600],
});
globalStyle(`${content} .hljs-number, ${content} .hljs-symbol`, {
  color: color.yellow[700],
});
globalStyle(
  `${content} .hljs-title, ${content} .hljs-built_in, ${content} .hljs-name, ${content} .hljs-type`,
  { color: color.blue[600] },
);
globalStyle(`${content} .hljs-variable, ${content} .hljs-template-variable`, {
  color: color.red[500],
});

// ---------- panels ----------

globalStyle(`${content} .ProseMirror div[data-type="panel"]`, {
  margin: `${space[10]} 0`,
  padding: `${space[12]} ${space[16]}`,
  borderRadius: radius.md,
  border: "1px solid transparent",
});

globalStyle(
  `${content} .ProseMirror div[data-type="panel"] > p:last-child`,
  { marginBottom: 0 },
);

globalStyle(`${content} .ProseMirror div[data-panel-variant="info"]`, {
  background: color.blue[50],
  borderColor: color.blue[200],
  color: color.blue[800],
});
globalStyle(`${content} .ProseMirror div[data-panel-variant="warning"]`, {
  background: color.yellow[50],
  borderColor: color.yellow[300],
  color: color.yellow[800],
});
globalStyle(`${content} .ProseMirror div[data-panel-variant="error"]`, {
  background: color.red[50],
  borderColor: color.red[200],
  color: color.red[800],
});
globalStyle(`${content} .ProseMirror div[data-panel-variant="success"]`, {
  background: color.green[50],
  borderColor: color.green[200],
  color: color.green[800],
});
globalStyle(`${content} .ProseMirror div[data-panel-variant="note"]`, {
  background: color.purple[50],
  borderColor: color.purple[200],
  color: color.purple[800],
});

// ---------- attachment card ----------

globalStyle(`${content} .ProseMirror div[data-type="attachment"]`, {
  display: "flex",
  alignItems: "center",
  gap: space[12],
  margin: `${space[10]} 0`,
  padding: `${space[10]} ${space[12]}`,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  background: color.surface.background,
  fontFamily: typography.body.medium.fontFamily,
  textDecoration: "none",
  color: "inherit",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, border-color ${motion.duration.fast} ${motion.easing.standard}, box-shadow ${motion.duration.fast} ${motion.easing.standard}`,
});

globalStyle(
  `${content} .ProseMirror div[data-type="attachment"]:hover`,
  {
    borderColor: color.border.strong,
    background: color.surface.hover,
    boxShadow: elevation.xs,
  },
);

globalStyle(
  `${content} .ProseMirror div[data-type="attachment"].ProseMirror-selectednode`,
  {
    borderColor: color.border.focus,
    boxShadow: `0 0 0 2px ${color.border.focus}`,
  },
);

// the colored square tile on the left
globalStyle(`${content} .ProseMirror .ce-attachment__tile`, {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "40px",
  height: "40px",
  flexShrink: 0,
  borderRadius: radius.sm,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.small.fontSize,
  fontWeight: fontWeight.bold,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: color.text.inverse,
  // default fallback for unknown kinds — replaced per kind below
  background: color.surface.sunken,
  border: `1px solid ${color.border.default}`,
});

globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="image"]`,
  {
    background: color.purple[500],
    borderColor: color.purple[500],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="video"]`,
  {
    background: color.blue[600],
    borderColor: color.blue[600],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="audio"]`,
  {
    background: color.green[600],
    borderColor: color.green[600],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="pdf"]`,
  {
    background: color.red[500],
    borderColor: color.red[500],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="archive"]`,
  {
    background: color.yellow[500],
    borderColor: color.yellow[500],
    color: color.text.primary,
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="document"]`,
  {
    background: color.blue[500],
    borderColor: color.blue[500],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="spreadsheet"]`,
  {
    background: color.green[500],
    borderColor: color.green[500],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="presentation"]`,
  {
    background: color.yellow[700],
    borderColor: color.yellow[700],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="code"]`,
  {
    background: color.neutral[800],
    borderColor: color.neutral[800],
  },
);
globalStyle(
  `${content} .ProseMirror .ce-attachment__tile[data-kind="file"]`,
  {
    background: color.surface.sunken,
    borderColor: color.border.default,
    color: color.text.subtle,
  },
);

// the body column — filename + meta
globalStyle(`${content} .ProseMirror .ce-attachment__body`, {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minWidth: 0,
  gap: "2px",
});

globalStyle(`${content} .ProseMirror .ce-attachment__name`, {
  fontSize: typography.body.medium.fontSize,
  fontWeight: fontWeight.medium,
  color: color.text.primary,
  lineHeight: lineHeight.tight,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

globalStyle(`${content} .ProseMirror .ce-attachment__meta`, {
  fontSize: typography.body.small.fontSize,
  color: color.text.subtle,
  lineHeight: lineHeight.snug,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

globalStyle(`${content} .ProseMirror .ce-attachment__meta:empty`, {
  display: "none",
});

// the trailing download button
globalStyle(`${content} .ProseMirror .ce-attachment__download`, {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  flexShrink: 0,
  border: `1px solid ${color.border.subtle}`,
  background: color.surface.background,
  color: color.text.subtle,
  borderRadius: radius.sm,
  textDecoration: "none",
  cursor: "pointer",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}, border-color ${motion.duration.fast} ${motion.easing.standard}`,
});

globalStyle(
  `${content} .ProseMirror .ce-attachment__download:hover`,
  {
    background: color.surface.raised,
    borderColor: color.border.default,
    color: color.text.primary,
  },
);

// ---------- mention pill ----------

globalStyle(`${content} .ProseMirror .catylast-mention`, {
  display: "inline-flex",
  alignItems: "center",
  gap: space[2],
  background: color.surface.selected,
  color: color.text.accent,
  padding: `0 ${space[8]}`,
  borderRadius: radius.full,
  fontSize: "0.92em",
  fontWeight: fontWeight.medium,
  border: `1px solid ${color.border.subtle}`,
});

globalStyle(`${content} .ProseMirror .catylast-mention::before`, {
  content: "'@'",
  color: color.text.subtle,
  marginRight: "1px",
});

// ---------- drop indicator (decoration) ----------

globalStyle(`${content} .catylast-editor-drop-indicator`, {
  display: "block",
  height: "2px",
  background: color.accent.background,
  borderRadius: "1px",
  margin: `${space[2]} 0`,
});

// ---------- drag handle ----------

export const dragHandle = style({
  position: "absolute",
  width: "22px",
  height: "22px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "grab",
  color: color.text.subtle,
  borderRadius: radius.xs,
  background: color.surface.background,
  border: `1px solid ${color.border.subtle}`,
  opacity: 0.6,
  transition: `opacity ${motion.duration.fast} ${motion.easing.standard}, background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}, border-color ${motion.duration.fast} ${motion.easing.standard}`,
  zIndex: 2,
  selectors: {
    "&:hover": {
      opacity: 1,
      background: color.surface.raised,
      color: color.text.primary,
      borderColor: color.border.default,
    },
    "&:active": { cursor: "grabbing", opacity: 1 },
  },
});

// ---------- link bubble ----------

export const linkBubble = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[6],
  padding: `${space[4]} ${space[8]}`,
  background: color.surface.overlay,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.sm,
  boxShadow: elevation.md,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.small.fontSize,
  zIndex: zIndex.popover,
});

export const linkBubbleHref = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[4],
  color: color.text.accent,
  textDecoration: "none",
  maxWidth: "240px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  selectors: { "&:hover": { textDecoration: "underline" } },
});

export const linkBubbleAction = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  padding: 0,
  border: "none",
  background: "transparent",
  color: color.text.subtle,
  cursor: "pointer",
  borderRadius: radius.xs,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      color: color.text.primary,
    },
  },
});

// ---------- suggestion popover ----------

export const suggestionList = style({
  display: "flex",
  flexDirection: "column",
  gap: space[2],
  padding: space[4],
  minWidth: "240px",
  maxWidth: "320px",
  maxHeight: "320px",
  overflowY: "auto",
  background: color.surface.overlay,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  boxShadow: elevation.lg,
  fontFamily: typography.body.medium.fontFamily,
});

export const suggestionEmpty = style({
  padding: `${space[10]} ${space[12]}`,
  fontSize: typography.body.medium.fontSize,
  color: color.text.subtle,
  fontStyle: "italic",
  background: color.surface.overlay,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  boxShadow: elevation.lg,
  fontFamily: typography.body.medium.fontFamily,
});

export const suggestionItem = style({
  display: "flex",
  alignItems: "center",
  gap: space[8],
  padding: `${space[6]} ${space[8]}`,
  border: "none",
  background: "transparent",
  textAlign: "left",
  borderRadius: radius.sm,
  cursor: "pointer",
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  color: color.text.primary,
});

export const suggestionItemActive = style({
  background: color.surface.hover,
});

export const suggestionIcon = style({
  display: "inline-flex",
  alignItems: "center",
  color: color.text.subtle,
  flexShrink: 0,
});

export const suggestionTextGroup = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
});

export const suggestionLabel = style({
  fontWeight: fontWeight.medium,
});

export const suggestionDescription = style({
  fontSize: typography.body.small.fontSize,
  color: color.text.subtle,
});

// ---------- insert-element dropdown ----------

export const insertMenu = style({
  display: "flex",
  flexDirection: "column",
  width: "320px",
  maxHeight: "440px",
  background: color.surface.overlay,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  boxShadow: elevation.lg,
  fontFamily: typography.body.medium.fontFamily,
  padding: 0,
  overflow: "hidden",
});

export const insertSearchRow = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  padding: `${space[8]} ${space[12]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
  background: color.surface.overlay,
  flexShrink: 0,
});

export const insertSearchIcon = style({
  position: "absolute",
  left: space[20],
  color: color.text.subtle,
  pointerEvents: "none",
});

export const insertSearchInput = style({
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  paddingLeft: space[24],
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  color: color.text.primary,
  selectors: {
    "&::placeholder": { color: color.text.subtle },
  },
});

export const insertEmpty = style({
  padding: `${space[16]} ${space[12]}`,
  fontSize: typography.body.medium.fontSize,
  color: color.text.subtle,
  fontStyle: "italic",
  textAlign: "center",
});

export const insertItemList = style({
  flex: 1,
  listStyle: "none",
  margin: 0,
  padding: space[6],
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  overflowY: "auto",
});

export const insertItem = style({
  display: "flex",
  alignItems: "center",
  gap: space[10],
  width: "100%",
  padding: `${space[8]} ${space[10]}`,
  border: "none",
  background: "transparent",
  textAlign: "left",
  borderRadius: radius.sm,
  cursor: "pointer",
  fontFamily: typography.body.medium.fontFamily,
  color: color.text.primary,
  transition: `background ${motion.duration.fast} ${motion.easing.standard}`,
});

export const insertItemActive = style({
  background: color.surface.hover,
});

export const insertItemIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "30px",
  height: "30px",
  borderRadius: radius.sm,
  background: color.surface.sunken,
  color: color.text.primary,
  flexShrink: 0,
  border: `1px solid ${color.border.subtle}`,
});

export const insertItemText = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  flex: 1,
});

export const insertItemLabel = style({
  fontSize: typography.body.medium.fontSize,
  fontWeight: fontWeight.medium,
  color: color.text.primary,
  lineHeight: lineHeight.tight,
});

export const insertItemDescription = style({
  fontSize: typography.body.small.fontSize,
  color: color.text.subtle,
  lineHeight: lineHeight.snug,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const insertFooter = style({
  borderTop: `1px solid ${color.border.subtle}`,
  background: color.surface.raised,
  padding: space[6],
  flexShrink: 0,
});

export const insertFooterButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[6],
  width: "100%",
  padding: `${space[6]} ${space[10]}`,
  border: "none",
  background: "transparent",
  borderRadius: radius.sm,
  color: color.text.accent,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  fontWeight: fontWeight.medium,
  cursor: "pointer",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": { background: color.surface.hover },
  },
});

// ---------- emoji picker ----------

export const emojiPicker = style({
  display: "flex",
  flexDirection: "column",
  width: "320px",
  maxHeight: "360px",
  background: color.surface.overlay,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.md,
  boxShadow: elevation.lg,
  fontFamily: typography.body.medium.fontFamily,
  padding: 0,
  overflow: "hidden",
});

export const emojiTabs = style({
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: `${space[6]} ${space[8]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
  background: color.surface.raised,
  flexShrink: 0,
});

export const emojiTab = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  border: "1px solid transparent",
  background: "transparent",
  borderRadius: radius.sm,
  color: color.text.subtle,
  cursor: "pointer",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      color: color.text.primary,
    },
  },
});

export const emojiTabActive = style({
  background: color.surface.selected,
  color: color.text.accent,
  borderColor: color.border.subtle,
});

export const emojiGrid = style({
  flex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: "2px",
  padding: space[8],
  overflowY: "auto",
});

export const emojiCell = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  border: "1px solid transparent",
  background: "transparent",
  borderRadius: radius.sm,
  cursor: "pointer",
  fontSize: "20px",
  lineHeight: 1,
  padding: 0,
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, transform ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      transform: "scale(1.1)",
    },
  },
});

// ---------- browse modal ----------

const modalFadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

export const modalOverlay = style({
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: space[24],
  zIndex: zIndex.modal,
  animationName: modalFadeIn,
  animationDuration: motion.duration.normal,
  animationTimingFunction: motion.easing.standard,
});

export const modalSurface = style({
  width: "100%",
  maxWidth: "960px",
  maxHeight: "min(720px, 88vh)",
  display: "flex",
  flexDirection: "column",
  background: color.surface.background,
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.lg,
  boxShadow: elevation.xl,
  overflow: "hidden",
  fontFamily: typography.body.medium.fontFamily,
});

export const modalHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${space[16]} ${space[20]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
});

export const modalTitle = style({
  margin: 0,
  fontSize: typography.heading.medium.fontSize,
  fontWeight: typography.heading.medium.fontWeight,
  lineHeight: typography.heading.medium.lineHeight,
  color: color.text.primary,
  letterSpacing: "-0.01em",
});

export const modalCloseTopButton = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  border: "none",
  background: "transparent",
  color: color.text.subtle,
  borderRadius: radius.sm,
  cursor: "pointer",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      color: color.text.primary,
    },
  },
});

export const modalBody = style({
  display: "flex",
  flex: 1,
  minHeight: 0,
});

export const modalSidebar = style({
  width: "200px",
  flexShrink: 0,
  borderRight: `1px solid ${color.border.subtle}`,
  background: color.surface.raised,
  padding: space[12],
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  overflowY: "auto",
});

export const modalSidebarItem = style({
  display: "flex",
  alignItems: "center",
  width: "100%",
  padding: `${space[8]} ${space[12]}`,
  border: "none",
  background: "transparent",
  borderRadius: radius.sm,
  textAlign: "left",
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  fontWeight: fontWeight.medium,
  color: color.text.secondary,
  cursor: "pointer",
  transition: `background ${motion.duration.fast} ${motion.easing.standard}, color ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      background: color.surface.hover,
      color: color.text.primary,
    },
  },
});

export const modalSidebarItemActive = style({
  background: color.surface.selected,
  color: color.text.accent,
  selectors: {
    "&:hover": {
      background: color.surface.selected,
      color: color.text.accent,
    },
  },
});

export const modalContent = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflow: "hidden",
});

export const modalSearchRow = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: space[8],
  padding: `${space[12]} ${space[20]}`,
  borderBottom: `1px solid ${color.border.subtle}`,
  flexShrink: 0,
});

export const modalSearchIcon = style({
  position: "absolute",
  left: `calc(${space[20]} + ${space[10]})`,
  color: color.text.subtle,
  pointerEvents: "none",
});

export const modalSearchInput = style({
  flex: 1,
  border: `1px solid ${color.border.subtle}`,
  outline: "none",
  background: color.surface.raised,
  height: "36px",
  paddingLeft: space[32],
  paddingRight: space[12],
  borderRadius: radius.sm,
  fontFamily: typography.body.medium.fontFamily,
  fontSize: typography.body.medium.fontSize,
  color: color.text.primary,
  selectors: {
    "&::placeholder": { color: color.text.subtle },
    "&:focus": {
      borderColor: color.border.focus,
      boxShadow: `0 0 0 2px ${color.surface.selected}`,
    },
  },
});

export const modalSearchHint = style({
  display: "inline-flex",
  alignItems: "center",
  gap: space[4],
  padding: `${space[2]} ${space[8]}`,
  border: `1px solid ${color.border.subtle}`,
  borderRadius: radius.xs,
  fontSize: typography.body.small.fontSize,
  color: color.text.subtle,
  background: color.surface.background,
  flexShrink: 0,
});

export const modalEmpty = style({
  padding: space[40],
  textAlign: "center",
  fontSize: typography.body.medium.fontSize,
  color: color.text.subtle,
  fontStyle: "italic",
});

export const modalGrid = style({
  flex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: space[10],
  padding: space[20],
  overflowY: "auto",
  alignContent: "start",
});

export const modalCard = style({
  display: "flex",
  alignItems: "flex-start",
  gap: space[10],
  padding: space[12],
  border: `1px solid ${color.border.subtle}`,
  borderRadius: radius.md,
  background: color.surface.background,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: typography.body.medium.fontFamily,
  transition: `border-color ${motion.duration.fast} ${motion.easing.standard}, box-shadow ${motion.duration.fast} ${motion.easing.standard}, background ${motion.duration.fast} ${motion.easing.standard}`,
  selectors: {
    "&:hover": {
      borderColor: color.border.default,
      background: color.surface.hover,
      boxShadow: elevation.xs,
    },
  },
});

export const modalCardActive = style({
  borderColor: color.border.focus,
  background: color.surface.selected,
  boxShadow: `0 0 0 1px ${color.border.focus}`,
  selectors: {
    "&:hover": {
      borderColor: color.border.focus,
      background: color.surface.selected,
    },
  },
});

export const modalCardIcon = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: radius.sm,
  background: color.surface.sunken,
  color: color.text.primary,
  flexShrink: 0,
  border: `1px solid ${color.border.subtle}`,
});

export const modalCardText = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
  flex: 1,
});

export const modalCardLabel = style({
  fontSize: typography.body.medium.fontSize,
  fontWeight: fontWeight.semibold,
  color: color.text.primary,
  lineHeight: lineHeight.tight,
});

export const modalCardDescription = style({
  fontSize: typography.body.small.fontSize,
  color: color.text.subtle,
  lineHeight: lineHeight.snug,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

export const modalFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: space[10],
  padding: `${space[12]} ${space[20]}`,
  borderTop: `1px solid ${color.border.subtle}`,
  background: color.surface.raised,
});

// ---------- bottom action bar ----------

export const actionBar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: space[8],
  padding: `${space[10]} ${space[12]}`,
  borderTop: `1px solid ${color.border.subtle}`,
  background: color.surface.raised,
  borderBottomLeftRadius: radius.md,
  borderBottomRightRadius: radius.md,
});
