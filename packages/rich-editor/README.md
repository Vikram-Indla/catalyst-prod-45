# @catylast/rich-editor

A Tiptap-backed rich text editor for the Catylast component library.
Inline-edit pattern (click to edit, Save / Cancel) by default. Toolbar
features are dynamic via prop — pick a preset or supply your own subset.

## Install

```bash
# pnpm
pnpm add @catylast/rich-editor @catylast/primitives @catylast/tokens

# npm
npm install @catylast/rich-editor @catylast/primitives @catylast/tokens

# yarn
yarn add @catylast/rich-editor @catylast/primitives @catylast/tokens
```

Import the CSS once:

```ts
import "@catylast/tokens/tokens.css";
import "@catylast/primitives/styles.css";
import "@catylast/rich-editor/styles.css";
```

## Use

```tsx
import { RichEditor } from "@catylast/rich-editor";

<RichEditor
  defaultValue={initialContent}
  onSave={async (content) => save(content)}
  toolbar="standard"
  placeholder="Add a description"
/>;
```

By default the editor renders read-only. Click anywhere on the rendered
content to switch to edit mode — the toolbar appears, the content becomes
editable, and Save / Cancel buttons appear at the bottom. Save commits via
`onSave`; Cancel reverts.

## Toolbar

Pass one of the presets or a custom array of feature keys:

```tsx
<RichEditor toolbar="basic" />        {/* bold, italic, link, lists */}
<RichEditor toolbar="standard" />     {/* default — most features */}
<RichEditor toolbar="full" />         {/* everything we ship */}
<RichEditor toolbar={["bold", "italic", "heading", "bullet-list", "link"]} />
<RichEditor toolbar={false} />        {/* no toolbar — useful for read-only */}
```

Available keys: `bold`, `italic`, `underline`, `strikethrough`, `code`,
`heading`, `bullet-list`, `ordered-list`, `task-list`, `blockquote`,
`code-block`, `link`, `image`, `horizontal-rule`, `undo`, `redo`,
`separator` (for visual grouping).

## Roadmap

- **v0.1** (this release) — core editor, dynamic toolbar, click-to-edit pattern.
- **v0.2** — image and video upload via callback, mention `@`, link popover,
  markdown import/export, code-block syntax highlighting.
- **v0.3** — custom block-level drag-and-drop with gutter grip handle.
- **v0.4** — slash command `/` menu, emoji picker, info/warning/note panels.
