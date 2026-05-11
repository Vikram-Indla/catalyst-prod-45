# @catylast/rich-editor

## 0.2.0

### Minor Changes

- First Beta release of `@catylast/rich-editor` — Tiptap-backed rich text editor with a click-to-edit pattern.

  **Editing pattern:** read-only by default; clicking the content switches to edit mode (toolbar appears, content becomes editable, Save / Cancel buttons render at the bottom).

  **Toolbar:** dynamic via prop — `"basic"` / `"standard"` / `"full"` preset, custom `ToolbarItemKey[]` array, or `false` to hide. 21 item keys covering formatting, blocks, media, mention, emoji, panel, link, hr, undo/redo, and the +Insert element menu.

  **Features shipped:**
  - Formatting: bold, italic, underline, strikethrough, inline code
  - Blocks: paragraph / H1–H3, bullet / numbered / task lists, blockquote, syntax-highlighted code blocks (lowlight), horizontal rule
  - Media: image and video with consumer-supplied `onUpload` callback (URL prompt fallback)
  - Mentions: `@` trigger with consumer-supplied `getMentionSuggestions`
  - Slash menu: `/` opens insertable-block picker
  - Panels: info / warning / error / success / note callout blocks
  - Links with bubble menu
  - Block drag-and-drop: gutter grip on hover, drag to reorder siblings — custom-built ProseMirror plugin (no third-party DnD library)
  - Browse-all modal for the +Insert element menu (content / workspace / external / development categories)
  - Read-only mode

  **Tokens-driven:** every color, radius, shadow, and font size resolves through `@catylast/tokens` semantic tokens — dark mode and theme swaps work without component changes.
