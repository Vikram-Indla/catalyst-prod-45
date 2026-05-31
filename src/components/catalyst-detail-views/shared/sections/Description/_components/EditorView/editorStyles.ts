/**
 * One-time style injection for the Tiptap editor surface.
 *
 * Covers:
 *   - ProseMirror placeholder rendering (data-placeholder attribute from
 *     @tiptap/extension-placeholder needs this CSS to be visible).
 *   - List bullet/number rendering (ProseMirror resets list-style by
 *     default).
 *   - Headings, blockquote, code, task list checkboxes.
 *   - Mention chip styling — reuses the same look as the legacy
 *     CatalystDescriptionSection mention chip (information background).
 *   - Focus outline removal (the toolbar IS the focus indicator).
 *
 * Bump STYLE_ID when the rules below change so HMR re-injects.
 */
const STYLE_ID = "catalyst-tiptap-editor-styles-v48";

export function injectEditorStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    .catalyst-tiptap-editor {
      outline: none;
      font-size: 14px;
      line-height: 24px;
      color: var(--ds-text, #292A2E);
      font-family: "Atlassian Sans", ui-sans-serif, -apple-system,
        "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif;
      min-height: 120px;
    }
    .catalyst-tiptap-editor p { margin: 0 0 8px; }
    .catalyst-tiptap-editor h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; line-height: 1.3; }
    .catalyst-tiptap-editor h2 { font-size: 20px; font-weight: 600; margin: 14px 0 8px; line-height: 1.3; }
    .catalyst-tiptap-editor h3 { font-size: 16px; font-weight: 600; margin: 12px 0 6px; line-height: 1.4; }
    .catalyst-tiptap-editor h4 { font-size: 14px; font-weight: 600; margin: 10px 0 4px; }
    .catalyst-tiptap-editor h5 { font-size: 13px; font-weight: 600; margin: 8px 0 4px; }
    .catalyst-tiptap-editor h6 { font-size: 12px; font-weight: 600; margin: 8px 0 4px;
                                 color: var(--ds-text-subtle, #5E6C84); }
    .catalyst-tiptap-editor ul,
    .catalyst-tiptap-editor ol { margin: 4px 0 8px; padding-inline-start: 24px; }
    .catalyst-tiptap-editor ul { list-style-type: disc; }
    .catalyst-tiptap-editor ol { list-style-type: decimal; }
    .catalyst-tiptap-editor ul ul { list-style-type: circle; }
    .catalyst-tiptap-editor ul ul ul { list-style-type: square; }
    .catalyst-tiptap-editor ol ol { list-style-type: lower-alpha; }
    .catalyst-tiptap-editor ol ol ol { list-style-type: lower-roman; }
    .catalyst-tiptap-editor li { margin-bottom: 4px; }
    .catalyst-tiptap-editor blockquote {
      border-inline-start: 2px solid var(--ds-border, #DFE1E6);
      padding-block: 8px;
      padding-inline: 12px;
      margin: 8px 0;
      color: var(--ds-text-subtle, #5E6C84);
    }
    /* Code block with line-number gutter.
       Font, font-size and line-height live on the wrapper and are
       forced via 'font: inherit !important' on both the gutter and
       the <pre> so the two grid columns share IDENTICAL font metrics.

       padding/margin on the <pre> AND the gutter MUST carry
       !important — story-detail-extensions.css declares
       [data-sdm-scope] .ProseMirror pre { padding: 12px 16px;
       margin: 8px 0 } at specificity 0,2,1 which beats this
       rule's 0,2,0 without !important. The external padding
       shifts the code text 4px down + 4px right relative to the
       gutter and is the proven cause of the line-number
       misalignment after re-entering edit mode. */
    .catalyst-tiptap-editor .catalyst-code-block {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: stretch;
      background: var(--ds-surface-sunken, #F7F8F9);
      margin: 4px 0 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 20px;
      border: 0 !important;
      outline: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .catalyst-tiptap-editor .catalyst-code-block-gutter {
      background: var(--ds-background-neutral, #E4E6EA);
      color: var(--ds-text-subtle, #6B778C);
      padding: 8px 10px !important;
      margin: 0 !important;
      text-align: right;
      user-select: none;
      -webkit-user-select: none;
      font: inherit !important;
      font-variant-numeric: tabular-nums;
      border: 0 !important;
      outline: 0 !important;
      border-radius: 0 !important;
    }
    .catalyst-tiptap-editor .catalyst-code-block-ln {
      display: block;
      font: inherit !important;
      line-height: 20px !important;
      border: 0 !important;
      outline: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .catalyst-tiptap-editor .catalyst-code-block-pre {
      background: transparent !important;
      padding: 8px 12px !important;
      margin: 0 !important;
      overflow-x: auto;
      min-width: 0;
      font: inherit !important;
      line-height: 20px !important;
      border: 0 !important;
      outline: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    /* Override the global .catalyst-tiptap-editor code rule which
       sets background, padding 2/4 and border-radius 3 on every
       code element. We need ZERO of those inside the code block,
       and we force 'font: inherit' so the code text uses the exact
       same family + size + line-height as the gutter spans. */
    .catalyst-tiptap-editor .catalyst-code-block-pre code {
      background: none !important;
      padding: 0 !important;
      margin: 0 !important;
      font: inherit !important;
      line-height: 20px !important;
      border: 0 !important;
      outline: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    /* Kill the contenteditable focus outline that ProseMirror adds
       to the <code> element when the cursor is inside it. */
    .catalyst-tiptap-editor .catalyst-code-block-pre code:focus,
    .catalyst-tiptap-editor .catalyst-code-block-pre code:focus-visible,
    .catalyst-tiptap-editor .catalyst-code-block-pre code:focus-within {
      outline: 0 !important;
      border: 0 !important;
      box-shadow: none !important;
    }
    /* ── Prism syntax-highlight theme ──
       Token class names match Prism's emit. Palette tuned to match
       Jira's edit-mode code-block colours (subtle, light, AA contrast
       against the sunken bg). Both the edit decorations and the read
       renderer use the same .token.* classes so colours are identical
       across surfaces. */
    .catalyst-tiptap-editor .catalyst-code-block .token.comment,
    .catalyst-tiptap-editor .catalyst-code-block .token.prolog,
    .catalyst-tiptap-editor .catalyst-code-block .token.doctype,
    .catalyst-tiptap-editor .catalyst-code-block .token.cdata,
    .adf-light-renderer .catalyst-code-block .token.comment,
    .adf-light-renderer .catalyst-code-block .token.prolog,
    .adf-light-renderer .catalyst-code-block .token.doctype,
    .adf-light-renderer .catalyst-code-block .token.cdata {
      color: #6B778C;
      font-style: italic;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.punctuation,
    .adf-light-renderer .catalyst-code-block .token.punctuation {
      color: #5E6C84;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.namespace,
    .adf-light-renderer .catalyst-code-block .token.namespace {
      opacity: 0.7;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.property,
    .catalyst-tiptap-editor .catalyst-code-block .token.tag,
    .catalyst-tiptap-editor .catalyst-code-block .token.constant,
    .catalyst-tiptap-editor .catalyst-code-block .token.symbol,
    .catalyst-tiptap-editor .catalyst-code-block .token.deleted,
    .adf-light-renderer .catalyst-code-block .token.property,
    .adf-light-renderer .catalyst-code-block .token.tag,
    .adf-light-renderer .catalyst-code-block .token.constant,
    .adf-light-renderer .catalyst-code-block .token.symbol,
    .adf-light-renderer .catalyst-code-block .token.deleted {
      color: #AE2A19;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.boolean,
    .catalyst-tiptap-editor .catalyst-code-block .token.number,
    .adf-light-renderer .catalyst-code-block .token.boolean,
    .adf-light-renderer .catalyst-code-block .token.number {
      color: #974F0C;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.selector,
    .catalyst-tiptap-editor .catalyst-code-block .token.attr-name,
    .catalyst-tiptap-editor .catalyst-code-block .token.string,
    .catalyst-tiptap-editor .catalyst-code-block .token.char,
    .catalyst-tiptap-editor .catalyst-code-block .token.builtin,
    .catalyst-tiptap-editor .catalyst-code-block .token.inserted,
    .adf-light-renderer .catalyst-code-block .token.selector,
    .adf-light-renderer .catalyst-code-block .token.attr-name,
    .adf-light-renderer .catalyst-code-block .token.string,
    .adf-light-renderer .catalyst-code-block .token.char,
    .adf-light-renderer .catalyst-code-block .token.builtin,
    .adf-light-renderer .catalyst-code-block .token.inserted {
      color: #216E4E;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.operator,
    .catalyst-tiptap-editor .catalyst-code-block .token.entity,
    .catalyst-tiptap-editor .catalyst-code-block .token.url,
    .catalyst-tiptap-editor .catalyst-code-block .language-css .token.string,
    .catalyst-tiptap-editor .catalyst-code-block .style .token.string,
    .adf-light-renderer .catalyst-code-block .token.operator,
    .adf-light-renderer .catalyst-code-block .token.entity,
    .adf-light-renderer .catalyst-code-block .token.url {
      color: #5E4DB2;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.atrule,
    .catalyst-tiptap-editor .catalyst-code-block .token.attr-value,
    .catalyst-tiptap-editor .catalyst-code-block .token.keyword,
    .adf-light-renderer .catalyst-code-block .token.atrule,
    .adf-light-renderer .catalyst-code-block .token.attr-value,
    .adf-light-renderer .catalyst-code-block .token.keyword {
      color: #0055CC;
      font-weight: 500;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.function,
    .catalyst-tiptap-editor .catalyst-code-block .token.class-name,
    .adf-light-renderer .catalyst-code-block .token.function,
    .adf-light-renderer .catalyst-code-block .token.class-name {
      color: #5E4DB2;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.regex,
    .catalyst-tiptap-editor .catalyst-code-block .token.important,
    .catalyst-tiptap-editor .catalyst-code-block .token.variable,
    .adf-light-renderer .catalyst-code-block .token.regex,
    .adf-light-renderer .catalyst-code-block .token.important,
    .adf-light-renderer .catalyst-code-block .token.variable {
      color: #B65C02;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.important,
    .catalyst-tiptap-editor .catalyst-code-block .token.bold,
    .adf-light-renderer .catalyst-code-block .token.important,
    .adf-light-renderer .catalyst-code-block .token.bold {
      font-weight: 600;
    }
    .catalyst-tiptap-editor .catalyst-code-block .token.italic,
    .adf-light-renderer .catalyst-code-block .token.italic {
      font-style: italic;
    }

    /* Wrap toggle — when the toolbar wrap icon is ON, the wrapper sets
       data-wrapped="true" and we soft-wrap both the <pre> and <code>
       so long lines break at the right edge instead of scrolling
       horizontally. Default ('false') keeps the original
       overflow-x: auto behaviour. */
    .catalyst-tiptap-editor .catalyst-code-block[data-wrapped="true"] .catalyst-code-block-pre {
      overflow-x: hidden !important;
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }
    .catalyst-tiptap-editor .catalyst-code-block[data-wrapped="true"] .catalyst-code-block-pre code {
      white-space: pre-wrap !important;
      word-break: break-word !important;
    }
    .catalyst-tiptap-editor code {
      background: var(--ds-surface-sunken, #F7F8F9);
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .catalyst-tiptap-editor pre code { background: none; padding: 0; }
    .catalyst-tiptap-editor a {
      color: var(--ds-link, #0C66E4);
      text-decoration: none;
    }
    .catalyst-tiptap-editor a:hover { text-decoration: underline; }
    .catalyst-tiptap-editor hr {
      border: none;
      border-top: 1px solid var(--ds-border, #DFE1E6);
      margin: 16px 0;
    }
    .catalyst-tiptap-editor img {
      max-width: 95%;
      border-radius: 4px;
      display: block;
    }
    /* Image alignment — driven by data-alignment attr set by CatalystImage.
       'wide' / 'full-width' are read but visually identical to center for v1. */
    .catalyst-tiptap-editor img[data-alignment="center"] {
      margin-left: auto;
      margin-right: auto;
    }
    .catalyst-tiptap-editor img[data-alignment="align-start"] {
      margin-inline-end: auto;
      margin-inline-start: 0;
    }
    .catalyst-tiptap-editor img[data-alignment="align-end"] {
      margin-inline-start: auto;
      margin-inline-end: 0;
    }
    .catalyst-tiptap-editor img[data-alignment="wrap-left"] {
      float: left;
      margin: 0 16px 8px 0;
    }
    .catalyst-tiptap-editor img[data-alignment="wrap-right"] {
      float: right;
      margin: 0 0 8px 16px;
    }
    /* When the user has explicitly resized the image (width attr present),
       it should win over the default max-width:100% so the user can
       intentionally make it wider than the natural fit. */
    .catalyst-tiptap-editor img[width] {
      max-width: none;
    }
    .catalyst-tiptap-editor img[data-alignment="wide"],
    .catalyst-tiptap-editor img[data-alignment="full-width"] {
      width: 100%;
      max-width: 100%;
      margin: 8px auto;
    }
    /* Selected image gets a clear blue halo — comes from
       .ProseMirror-selectednode rule above. */
    .catalyst-tiptap-editor ul[data-type="taskList"] {
      list-style: none;
      padding-inline-start: 8px;
    }
    .catalyst-tiptap-editor ul[data-type="taskList"] li {
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }
    .catalyst-tiptap-editor ul[data-type="taskList"] li > label {
      flex-shrink: 0;
      margin-top: 4px;
    }
    .catalyst-tiptap-editor ul[data-type="taskList"] li > div {
      flex: 1;
    }

    /* Placeholder — Tiptap's @tiptap/extension-placeholder writes a
       data-placeholder attribute on the first empty paragraph; the visible
       text is rendered via this ::before pseudo-element. */
    .catalyst-tiptap-editor p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--ds-text-subtlest, #97A0AF);
      pointer-events: none;
      height: 0;
    }

    /* Mention chip — informational blue background, matches the existing
       CatalystDescriptionSection mention styling for visual continuity
       across surfaces. */
    .catalyst-tiptap-editor span[data-mention-id] {
      background: var(--ds-background-information, #DEEBFF);
      color: var(--ds-text-information, #1868DB);
      border-radius: 3px;
      padding: 0 4px;
      font-weight: 500;
      cursor: pointer;
    }
    .catalyst-tiptap-editor span[data-mention-id]:hover {
      background: var(--ds-background-information-hovered, #CCE0FF);
    }

    /* SmallText mark renders as <small>; the inline style block on the
       mark itself sets the size/color, this rule just removes the browser
       default fontStyle. */
    .catalyst-tiptap-editor small {
      font-style: normal;
    }

    /* Selected node halo — scoped to images only. Block-level node
       selections set by the drag handle (paragraph, list, table, panel,
       etc.) intentionally render with NO halo so the drag UX stays
       clean; images keep the halo so delete-on-select is discoverable. */
    .catalyst-tiptap-editor img.ProseMirror-selectednode {
      outline: 2px solid var(--ds-border-selected, #0C66E4);
      outline-offset: 2px;
    }

    /* Voice-to-text recording dot pulse. */
    @keyframes catalyst-voice-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    /* Translating border — cycles through ADS link blue, discovery
       purple, and accent orange via box-shadow color cycling. Sits
       OUTSIDE the editor shell so the shell's overflow:hidden doesn't
       clip it. */
    .catalyst-description-editor-shell.is-translating {
      animation: catalyst-translate-border 1.6s ease-in-out infinite;
    }
    @keyframes catalyst-translate-border {
      0% {
        box-shadow:
          0 0 0 2px #0C66E4,
          0 0 14px 3px rgba(12,102,228,0.30);
      }
      33% {
        box-shadow:
          0 0 0 2px #8270DB,
          0 0 14px 3px rgba(130,112,219,0.30);
      }
      66% {
        box-shadow:
          0 0 0 2px #E56910,
          0 0 14px 3px rgba(229,105,16,0.30);
      }
      100% {
        box-shadow:
          0 0 0 2px #0C66E4,
          0 0 14px 3px rgba(12,102,228,0.30);
      }
    }

    /* Drop cursor — blue color/width come from the dropcursor config
       in useTiptapEditor (inline-style, no CSS war). The .catalyst-
       drop-line class is added via the dropcursor config too — gives
       us an unambiguous selector for the circle pseudo. Selector is
       GLOBAL because PM appends the element to view.dom.offsetParent
       (the editor body), not inside the contenteditable. */
    .catalyst-drop-line {
      overflow: visible !important;
    }
    .catalyst-drop-line::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 50%;
      width: 8px;
      height: 8px;
      margin-top: -4px;
      border: 1px solid #0C66E4;
      border-radius: 50%;
      background: transparent;
      box-sizing: border-box;
      pointer-events: none;
      z-index: 1000;
    }

    /* ── Tables ── */
    .catalyst-tiptap-editor table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      margin: 12px 0;
      overflow: hidden;
    }
    .catalyst-tiptap-editor table td,
    .catalyst-tiptap-editor table th {
      border: 1px solid var(--ds-border, #DFE1E6);
      padding: 6px 10px;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;
      min-width: 60px;
    }
    .catalyst-tiptap-editor table th {
      background: var(--ds-surface-sunken, #F7F8F9);
      font-weight: 600;
      text-align: start;
    }

    /* ─── Table toolbar-driven attributes ─── */

    /* Header Row ON: first <tr>'s cells get sunken gray + bold. */
    .catalyst-tiptap-editor table[data-header-row="true"] tbody > tr:first-child > td,
    .catalyst-tiptap-editor table[data-header-row="true"] tbody > tr:first-child > th {
      background: var(--ds-surface-sunken, #F7F8F9);
      font-weight: 600;
    }
    /* Header Row OFF: the <th> elements in the first row would still
       render with the global th styling (bg + bold). Force them to
       look like regular cells. */
    .catalyst-tiptap-editor table[data-header-row="false"] tbody > tr:first-child > th {
      background: transparent;
      font-weight: 400;
    }

    /* Header Column ON: first cell of every row gets sunken gray + bold. */
    .catalyst-tiptap-editor table[data-header-column="true"] tbody > tr > td:first-child,
    .catalyst-tiptap-editor table[data-header-column="true"] tbody > tr > th:first-child {
      background: var(--ds-surface-sunken, #F7F8F9);
      font-weight: 600;
    }

    /* Table cell selection (from TableSelection PM plugin).
       Decorations add the class on cells in the selected column/row.
       Background goes light blue, the cell's existing 1px border-color
       is swapped from gray to blue — no extra outline, no overlay,
       no doubled lines. !important ensures it beats the default
       table-cell border rule. */
    /* Use OUTLINE (with negative offset so it overlays the cell's
       existing 1px gray border) — outlines don't participate in
       border-collapse so all 4 sides of the highlight always draw,
       even where the gray neighbour border would otherwise win the
       collapse resolution. */
    .catalyst-tiptap-editor table .catalyst-cell-selected {
      background: rgba(135, 184, 255, 0.18) !important;
      outline: 1px solid #85B8FF !important;
      outline-offset: -1px !important;
    }
    /* Danger / delete-preview highlight — paints cells red. Declared
       AFTER .catalyst-cell-selected so when both classes apply (the
       column is blue-selected AND the user is hovering "Delete
       column"), red wins by source order. */
    .catalyst-tiptap-editor table .catalyst-cell-danger {
      background: rgba(255, 86, 48, 0.18) !important;
      outline: 1px solid #F15B50 !important;
      outline-offset: -1px !important;
    }

    /* Numbered Rows — rendered as a ::before INSIDE the first cell of
       each row. Because it's part of the cell, the browser's table
       layout aligns it perfectly with the row — no JS measurement, no
       fight with PM. The first cell gets extra padding-inline-start
       to reserve space for the number, and the ::before is absolutely
       positioned inside the cell to fill that reserved space. */
    .catalyst-tiptap-editor table[data-numbered-rows="true"] {
      counter-reset: catalyst-row;
    }
    .catalyst-tiptap-editor table[data-numbered-rows="true"] tbody > tr {
      counter-increment: catalyst-row;
    }
    .catalyst-tiptap-editor table[data-numbered-rows="true"] tbody > tr > td:first-child,
    .catalyst-tiptap-editor table[data-numbered-rows="true"] tbody > tr > th:first-child {
      position: relative;
      padding-inline-start: 40px !important;
    }
    .catalyst-tiptap-editor table[data-numbered-rows="true"] tbody > tr > td:first-child::before,
    .catalyst-tiptap-editor table[data-numbered-rows="true"] tbody > tr > th:first-child::before {
      content: counter(catalyst-row);
      position: absolute;
      inset-inline-start: 0;
      top: 0;
      bottom: 0;
      width: 32px;
      background: var(--ds-surface-sunken, #F7F8F9);
      border-inline-end: 1px solid var(--ds-border, #DFE1E6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--ds-text, #292A2E);
      font-weight: 500;
      user-select: none;
      -webkit-user-select: none;
    }
    /* Header row + numbered: blank out the header's number and shift
       the counter so row right after the header is "1". */
    .catalyst-tiptap-editor table[data-numbered-rows="true"][data-header-row="true"] {
      counter-reset: catalyst-row -1;
    }
    .catalyst-tiptap-editor table[data-numbered-rows="true"][data-header-row="true"] tbody > tr:first-child > td:first-child::before,
    .catalyst-tiptap-editor table[data-numbered-rows="true"][data-header-row="true"] tbody > tr:first-child > th:first-child::before {
      content: '';
    }
    .catalyst-tiptap-editor .tableWrapper {
      position: relative;
    }

    /* Table alignment — apply margin auto rules to the TABLE itself
       (not the wrapper). Wrapper is full-width block; the table
       inside may be narrower after a resize, and only inline auto
       margins on the table will shift it within the wrapper. Default
       (left) keeps margin-inline-start: 0 explicitly so it overrides
       any inherited rules. */
    .catalyst-tiptap-editor table[data-alignment="left"] {
      margin-inline-start: 0 !important;
      margin-inline-end: auto !important;
    }
    .catalyst-tiptap-editor table[data-alignment="center"] {
      margin-inline-start: auto !important;
      margin-inline-end: auto !important;
    }
    .catalyst-tiptap-editor table[data-alignment="right"] {
      margin-inline-start: auto !important;
      margin-inline-end: 0 !important;
    }
    /* Multi-cell selection (PM's CellSelection class). Matches the
       grip-selection / chevron-hover blue exactly. */
    .catalyst-tiptap-editor table .selectedCell {
      background: rgba(135, 184, 255, 0.18) !important;
      outline: 1px solid #85B8FF !important;
      outline-offset: -1px !important;
    }
    .catalyst-tiptap-editor table .column-resize-handle {
      position: absolute;
      inset-inline-end: -2px;
      top: 0;
      bottom: -2px;
      width: 4px;
      background: var(--ds-border-selected, #0C66E4);
      pointer-events: none;
    }
    .catalyst-tiptap-editor .tableWrapper {
      overflow-x: auto;
    }
    .catalyst-tiptap-editor.resize-cursor {
      cursor: col-resize;
    }

    /* ── Panels (info/warning/success/error/note) ──
       Each panel gets a leading icon via the ::before pseudo-element.
       The icon is a colored SVG (data URI) that matches the panel type.
       padding-left: 40px reserves room for the icon at left.  */
    .catalyst-tiptap-editor .catalyst-panel {
      border-inline-start: 3px solid;
      border-radius: 4px;
      padding-block: 10px;
      padding-inline: 40px 12px;
      margin: 12px 0;
      position: relative;
    }
    .catalyst-tiptap-editor .catalyst-panel::before {
      content: '';
      position: absolute;
      inset-inline-start: 12px;
      top: 12px;
      width: 20px;
      height: 20px;
      background-repeat: no-repeat;
      background-position: center;
      background-size: 20px 20px;
      pointer-events: none;
    }
    .catalyst-tiptap-editor .catalyst-panel > * { margin: 0 0 4px; }
    .catalyst-tiptap-editor .catalyst-panel > *:last-child { margin-bottom: 0; }

    .catalyst-tiptap-editor .catalyst-panel-info {
      background: var(--ds-background-information, #DEEBFF);
      border-color: var(--ds-border-information, #1868DB);
      color: var(--ds-text-information, #0C66E4);
    }
    .catalyst-tiptap-editor .catalyst-panel-info::before {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231868DB'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'/></svg>");
    }

    .catalyst-tiptap-editor .catalyst-panel-warning {
      background: var(--ds-background-warning, #FFF7D6);
      border-color: var(--ds-border-warning, #FFAB00);
      color: var(--ds-text-warning, #946F00);
    }
    .catalyst-tiptap-editor .catalyst-panel-warning::before {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23E56910'><path d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'/></svg>");
    }

    .catalyst-tiptap-editor .catalyst-panel-success {
      background: var(--ds-background-success, #DFFCF0);
      border-color: var(--ds-border-success, #22A06B);
      color: var(--ds-text-success, #216E4E);
    }
    .catalyst-tiptap-editor .catalyst-panel-success::before {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322A06B'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>");
    }

    .catalyst-tiptap-editor .catalyst-panel-error {
      background: var(--ds-background-danger, #FFEBE6);
      border-color: var(--ds-border-danger, #C9372C);
      color: var(--ds-text-danger, #AE2A19);
    }
    .catalyst-tiptap-editor .catalyst-panel-error::before {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23C9372C'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z'/></svg>");
    }

    .catalyst-tiptap-editor .catalyst-panel-note {
      background: var(--ds-background-discovery, #DFD8FD);
      border-color: var(--ds-border-discovery, #8270DB);
      color: var(--ds-text-discovery, #5E4DB2);
    }
    .catalyst-tiptap-editor .catalyst-panel-note::before {
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%238270DB'><path d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z'/></svg>");
    }

    /* Inside-panel text takes the panel's own color (text-information,
       text-warning, etc.) which are ADS tokens specifically tuned for
       readable contrast against the matching background-* tokens.
       Force the color through child paragraphs / lists / links so
       inherited "currentColor" wins over the editor's default text. */
    .catalyst-tiptap-editor .catalyst-panel,
    .catalyst-tiptap-editor .catalyst-panel p,
    .catalyst-tiptap-editor .catalyst-panel li,
    .catalyst-tiptap-editor .catalyst-panel strong,
    .catalyst-tiptap-editor .catalyst-panel em,
    .catalyst-tiptap-editor .catalyst-panel a {
      color: inherit;
    }
    /* Per-type strong text colors (darker than the accent for AA contrast
       against the panel's light background). */
    .catalyst-tiptap-editor .catalyst-panel-info {
      color: var(--ds-text-information, #0055CC);
    }
    .catalyst-tiptap-editor .catalyst-panel-warning {
      color: var(--ds-text-warning, #7F5F01);
    }
    .catalyst-tiptap-editor .catalyst-panel-success {
      color: var(--ds-text-success, #216E4E);
    }
    .catalyst-tiptap-editor .catalyst-panel-error {
      color: var(--ds-text-danger, #AE2A19);
    }
    .catalyst-tiptap-editor .catalyst-panel-note {
      color: var(--ds-text-discovery, #5E4DB2);
    }
  `;
  document.head.appendChild(s);
}
