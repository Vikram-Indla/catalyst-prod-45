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
const STYLE_ID = 'catalyst-tiptap-editor-styles-v04';

export function injectEditorStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const s = document.createElement('style');
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
    .catalyst-tiptap-editor ol { margin: 4px 0 8px; padding-left: 24px; }
    .catalyst-tiptap-editor ul { list-style-type: disc; }
    .catalyst-tiptap-editor ol { list-style-type: decimal; }
    .catalyst-tiptap-editor ul ul { list-style-type: circle; }
    .catalyst-tiptap-editor ul ul ul { list-style-type: square; }
    .catalyst-tiptap-editor ol ol { list-style-type: lower-alpha; }
    .catalyst-tiptap-editor ol ol ol { list-style-type: lower-roman; }
    .catalyst-tiptap-editor li { margin-bottom: 4px; }
    .catalyst-tiptap-editor blockquote {
      border-left: 2px solid var(--ds-border, #DFE1E6);
      padding: 8px 12px;
      margin: 8px 0;
      color: var(--ds-text-subtle, #5E6C84);
    }
    .catalyst-tiptap-editor pre {
      background: var(--ds-surface-sunken, #F7F8F9);
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      overflow-x: auto;
      margin: 4px 0 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
      max-width: 100%;
      border-radius: 4px;
    }
    .catalyst-tiptap-editor ul[data-type="taskList"] {
      list-style: none;
      padding-left: 8px;
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

    /* Selected node halo (e.g. an image selected for delete) — Tiptap's
       default is hard to see in light mode; brighten it to ADS link blue. */
    .catalyst-tiptap-editor .ProseMirror-selectednode {
      outline: 2px solid var(--ds-border-selected, #0C66E4);
      outline-offset: 2px;
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
      text-align: left;
    }
    .catalyst-tiptap-editor table .selectedCell {
      background: var(--ds-background-selected, #E9F2FE);
    }
    .catalyst-tiptap-editor table .column-resize-handle {
      position: absolute;
      right: -2px;
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
      border-left: 3px solid;
      border-radius: 4px;
      padding: 10px 12px 10px 40px;
      margin: 12px 0;
      position: relative;
    }
    .catalyst-tiptap-editor .catalyst-panel::before {
      content: '';
      position: absolute;
      left: 12px;
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
