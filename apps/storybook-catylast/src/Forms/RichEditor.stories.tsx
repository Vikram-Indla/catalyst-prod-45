import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  RichEditor,
  type InsertElement,
  type MentionUser,
  type UploadResult,
} from "@catylast/rich-editor";
import { color, fontFamily, space } from "@catylast/tokens";
import { useState } from "react";

const componentDescription = `A Tiptap-backed rich text editor with a click-to-edit pattern. Renders read-only by default; click anywhere on the content to switch to edit mode (toolbar appears, content becomes editable, Save / Cancel buttons appear at the bottom).

**Toolbar features are dynamic via prop.** Pass a preset (\`"basic"\` / \`"standard"\` / \`"full"\`), a custom array of feature keys, or \`false\` to hide it.

**v0.1 → 0.4 ships:**
- **Formatting** — bold, italic, underline, strikethrough, inline code
- **Block types** — paragraph / H1-H3 dropdown, bullet / numbered / task lists, blockquote, code block (with syntax highlighting via lowlight), horizontal rule
- **Media** — image upload, video upload (\`onUpload\` callback)
- **Mentions** — \`@\` trigger with consumer-supplied \`getMentionSuggestions\`
- **Slash menu** — \`/\` opens an insertable-block picker (headings, lists, panels, code, etc.)
- **Panels** — info / warning / error / success / note callout blocks
- **Link** — toolbar button with URL prompt
- **Block drag-and-drop** — gutter grip handle on hover, drag to reorder siblings (custom-built from scratch via ProseMirror plugin)
- **Inline-edit pattern** — click-to-edit, Save / Cancel
- **Read-only** — \`readOnly\` prop forces view-only display`;

const meta: Meta<typeof RichEditor> = {
  title: "Forms/RichEditor",
  component: RichEditor,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: { component: componentDescription },
    },
  },
};
export default meta;

type Story = StoryObj<typeof RichEditor>;

const wrapStyle = {
  padding: space[24],
  fontFamily: fontFamily.sans,
  background: color.surface.background,
  minHeight: "560px",
};

const sampleContent = `<h1>Welcome to the editor</h1>
<p>This is a <strong>rich text editor</strong> with everything you'd expect — <em>italic</em>, <u>underline</u>, <s>strikethrough</s>, <code>inline code</code>, and <a href="https://example.com">links</a>.</p>
<h2>Lists</h2>
<ul><li>Bullet item one</li><li>Bullet item two</li></ul>
<ol><li>Numbered item</li><li>Another numbered item</li></ol>
<ul data-type="taskList"><li data-checked="true">Task that's done</li><li data-checked="false">Task to do</li></ul>
<h2>Block elements</h2>
<blockquote><p>A blockquote — useful for callouts or quoted text.</p></blockquote>
<pre><code class="language-typescript">function hello(name: string) {
  return \`Hello, \${name}\`;
}</code></pre>
<p>Click anywhere in this content to start editing. Try the gutter grip on the left, the slash <code>/</code> menu, the <code>@</code> mention, and the panel dropdown.</p>`;

// ---------- mock backend helpers ----------

const MOCK_USERS: MentionUser[] = [
  { id: "u1", label: "Wasim Khan", description: "Platform" },
  { id: "u2", label: "Alex Doe", description: "Platform" },
  { id: "u3", label: "Maya Patel", description: "Design" },
  { id: "u4", label: "Sarah Lee", description: "Design" },
  { id: "u5", label: "Tom Williams", description: "Mobile" },
  { id: "u6", label: "Priya Sharma", description: "Mobile" },
  { id: "u7", label: "Jordan Reyes", description: "Backend" },
  { id: "u8", label: "Ben Cooper", description: "Backend" },
];

const mockMentionSuggestions = (query: string): MentionUser[] => {
  const q = query.toLowerCase();
  return MOCK_USERS.filter(
    (u) =>
      u.label.toLowerCase().includes(q) ||
      u.description?.toLowerCase().includes(q),
  ).slice(0, 6);
};

/**
 * Mock upload — converts the picked File to an object URL so the editor
 * can preview it locally. In a real consumer app, this would POST to
 * a storage backend and return the persisted URL.
 *
 * The result `type` decides which node the editor inserts:
 * - `"image"` → inline `<img>` (Tiptap Image extension).
 * - `"video"` → inline `<video controls>` (Catylast Video extension).
 * - `"file"`  → an Attachment card with filename, size, MIME, and a
 *   trailing download link (Catylast Attachment extension).
 */
const mockUpload = async (file: File): Promise<UploadResult> => {
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("video/")) {
    return { url, type: "video", name: file.name, size: file.size, mimeType: file.type };
  }
  if (file.type.startsWith("image/")) {
    return { url, type: "image", name: file.name, size: file.size, mimeType: file.type };
  }
  return {
    url,
    type: "file",
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
};

// ---------- stories ----------

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Default behavior — read-only on mount, click to edit. `"standard"` toolbar preset (most features). Save commits via `onSave`; Cancel reverts. Mentions and uploads use the mock helpers above.',
      },
    },
  },
  render: function DefaultStory() {
    return (
      <div style={wrapStyle}>
        <div style={{ maxWidth: "780px" }}>
          <RichEditor
            defaultValue={sampleContent}
            onSave={async ({ html }) => {
              console.log("Saved HTML:", html);
            }}
            onUpload={mockUpload}
            getMentionSuggestions={mockMentionSuggestions}
          />
        </div>
      </div>
    );
  },
};

export const BasicToolbar: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The minimal `"basic"` preset — bold, italic, link, lists, mention. Use this for short-form content like comments or chat messages.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "640px" }}>
        <RichEditor
          toolbar="basic"
          placeholder="Write a comment…"
          onSave={async ({ html }) => console.log("Saved:", html)}
          getMentionSuggestions={mockMentionSuggestions}
        />
      </div>
    </div>
  ),
};

export const FullToolbar: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The `"full"` preset — every toolbar feature. Heading dropdown, all formatting marks, three list types, blockquote, code block (highlighted), panel dropdown, horizontal rule, link, image upload, video upload, mention, undo/redo. Use for long-form documents.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar="full"
          defaultValue={sampleContent}
          onSave={async ({ html }) => console.log("Saved:", html)}
          onUpload={mockUpload}
          getMentionSuggestions={mockMentionSuggestions}
        />
      </div>
    </div>
  ),
};

export const CustomToolbar: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Pass an array of toolbar item keys for full control. `"separator"` adds visual dividers between groups. The available keys are exposed as the `ToolbarItemKey` union — autocomplete shows every available item.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar={[
            "heading",
            "separator",
            "bold",
            "italic",
            "code",
            "separator",
            "bullet-list",
            "ordered-list",
            "separator",
            "link",
            "mention",
            "panel",
          ]}
          placeholder="Custom toolbar — only the items you choose…"
          onSave={async ({ html }) => console.log("Saved:", html)}
          getMentionSuggestions={mockMentionSuggestions}
        />
      </div>
    </div>
  ),
};

export const SlashMenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Type **`/`** anywhere in the editor to open the slash menu. A searchable list of insertable blocks appears (headings, lists, code, blockquote, horizontal rule, panels). Use **arrow keys** + **Enter** to pick, or click. The default command set covers everything in the toolbar; consumers can override with the `slashCommands` prop.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          placeholder="Type / to open the insert menu…"
          onSave={async ({ html }) => console.log("Saved:", html)}
        />
      </div>
    </div>
  ),
};

export const Mentions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Type **`@`** to open the mention popover. The list filters as you type by name. Pick with arrow-keys + Enter. Each mention is rendered as a styled pill in the document. The user list comes from your `getMentionSuggestions(query)` callback — return synchronously or as a Promise.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          placeholder="Type @ to mention someone…"
          onSave={async ({ html }) => console.log("Saved:", html)}
          getMentionSuggestions={mockMentionSuggestions}
        />
      </div>
    </div>
  ),
};

export const MediaUpload: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Click the **image** or **video** toolbar buttons to open a native file picker. The selected file is passed to your `onUpload(file)` callback, which should upload it to your backend and return `{ url, type }`. The story uses a mock that creates an in-browser object URL so you can preview without a real upload.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar="full"
          placeholder="Click the image or video button to upload…"
          onSave={async ({ html }) => console.log("Saved:", html)}
          onUpload={mockUpload}
        />
      </div>
    </div>
  ),
};

export const Attachments: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Click the **paperclip** toolbar button (or pick **File attachment** in the +Insert menu) to upload any file — PDFs, ZIPs, docs, spreadsheets, source code, audio, anything. The same `onUpload(file)` callback handles all three media types: return `{ type: "image" }` for inline images, `{ type: "video" }` for inline videos, or `{ type: "file" }` for a generic Attachment card. The result includes optional `name`, `size`, and `mimeType` fields that drive the card\'s filename, human-readable size, and the colored extension tile on the left.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar="full"
          defaultValue={`<h2>Project handover</h2>
<p>The latest revision ships with a few files for the QA team — drag them into your tracker once the migration is signed off.</p>
<div data-type="attachment" data-attachment-url="#" data-attachment-name="release-notes.pdf" data-attachment-size="284715" data-attachment-mime-type="application/pdf"></div>
<div data-type="attachment" data-attachment-url="#" data-attachment-name="design-tokens.zip" data-attachment-size="1543210" data-attachment-mime-type="application/zip"></div>
<div data-type="attachment" data-attachment-url="#" data-attachment-name="qa-results.xlsx" data-attachment-size="48230" data-attachment-mime-type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div>
<div data-type="attachment" data-attachment-url="#" data-attachment-name="kickoff-deck.pptx" data-attachment-size="3210444" data-attachment-mime-type="application/vnd.openxmlformats-officedocument.presentationml.presentation"></div>
<div data-type="attachment" data-attachment-url="#" data-attachment-name="setup.sh" data-attachment-size="1840" data-attachment-mime-type="application/x-sh"></div>
<div data-type="attachment" data-attachment-url="#" data-attachment-name="logo.svg" data-attachment-size="6244" data-attachment-mime-type="image/svg+xml"></div>
<div data-type="attachment" data-attachment-url="#" data-attachment-name="brief.docx" data-attachment-size="98430" data-attachment-mime-type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div>
<p>Click any attachment's download icon to fetch it, or drop a new file into the editor to add another one.</p>`}
          onSave={async ({ html }) => console.log("Saved:", html)}
          onUpload={mockUpload}
        />
      </div>
    </div>
  ),
};

export const Panels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Five callout-block variants: **info**, **warning**, **error**, **success**, **note**. Insert via the toolbar's panel dropdown or the slash menu. Panels can contain any block content, including other panels and lists.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar="full"
          defaultValue={`<h2>Callout panels</h2>
<div data-type="panel" data-panel-variant="info"><p>This is an <strong>info</strong> panel — useful for tips or context.</p></div>
<div data-type="panel" data-panel-variant="warning"><p>A <strong>warning</strong> panel for things that need attention.</p></div>
<div data-type="panel" data-panel-variant="error"><p>An <strong>error</strong> panel for things that broke.</p></div>
<div data-type="panel" data-panel-variant="success"><p>A <strong>success</strong> panel for celebratory states.</p></div>
<div data-type="panel" data-panel-variant="note"><p>A <strong>note</strong> panel for asides and reminders.</p></div>
<p>Try the panel dropdown in the toolbar or type <code>/info</code> to insert one inline.</p>`}
          onSave={async ({ html }) => console.log("Saved:", html)}
        />
      </div>
    </div>
  ),
};

export const DragHandle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Hover any top-level block in edit mode and a vertical grip appears in the left gutter. Click and drag to move the block to a new sibling position — drop above or below another block. The drop indicator (a thin accent line) shows where the block will land. Implementation is a custom Tiptap extension (no community drag-handle dependency); the source lives in `packages/rich-editor/src/extensions/DragHandle.ts`.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          defaultValue={`<h1>Drag me — try the gutter grip</h1>
<p>Hover this paragraph and look for the grip icon to its left. Drag it above or below other blocks to rearrange.</p>
<h2>Try moving this heading</h2>
<ul><li>List item one</li><li>List item two</li><li>List item three</li></ul>
<blockquote><p>Drag this blockquote, too — it picks up as a single unit.</p></blockquote>
<p>The drop indicator shows the target location while you drag.</p>`}
          onSave={async ({ html }) => console.log("Saved:", html)}
        />
      </div>
    </div>
  ),
};

export const InlineEditPattern: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the click-to-edit flow end-to-end. Read-only on mount → click → toolbar + Save / Cancel appear → edit → Save commits via `onSave` (logged to console + shown below).",
      },
    },
  },
  render: function InlineEditStory() {
    const [savedHtml, setSavedHtml] = useState<string>(
      "<p>Click on this text to start editing it inline. Try a slash command, an @ mention, or drag a block by its gutter grip.</p>",
    );
    return (
      <div style={wrapStyle}>
        <div style={{ maxWidth: "780px" }}>
          <RichEditor
            defaultValue={savedHtml}
            onSave={async ({ html }) => {
              setSavedHtml(html);
              console.log("Committed HTML:", html);
            }}
            onUpload={mockUpload}
            getMentionSuggestions={mockMentionSuggestions}
          />
          <details
            style={{
              marginTop: space[24],
              padding: space[12],
              background: color.surface.sunken,
              borderRadius: "6px",
              fontFamily: fontFamily.mono,
              fontSize: "12px",
              color: color.text.subtle,
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontFamily: fontFamily.sans,
                color: color.text.primary,
              }}
            >
              Last saved HTML
            </summary>
            <pre
              style={{
                margin: 0,
                marginTop: space[8],
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {savedHtml}
            </pre>
          </details>
        </div>
      </div>
    );
  },
};

export const ReadOnly: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "`readOnly` forces view-only — no toolbar, no click-to-edit, no drag handle. Use when displaying saved content where editing isn't allowed.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor readOnly defaultValue={sampleContent} />
      </div>
    </div>
  ),
};

export const NoToolbar: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Pass `toolbar={false}` to hide the toolbar entirely. The content is still editable; users rely on **keyboard shortcuts** and the slash menu (`/`). Useful for minimal "comment" inputs.',
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "640px" }}>
        <RichEditor
          toolbar={false}
          placeholder="Type / for blocks, or just write…"
          onSave={async ({ html }) => console.log("Saved:", html)}
        />
      </div>
    </div>
  ),
};

export const InsertElementMenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The toolbar's **+** button opens a compact dropdown of insertable elements (icon + title + one-liner) with a search field at the top. Click **Browse all** to open the full modal — sidebar with All / Content / Workspace / External / Development categories, search, and a card grid. Modeled after the *Insert element* surfaces common in modern issue trackers.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar="standard"
          defaultValue={`<h2>Insert any element</h2><p>Click the <strong>+</strong> button on the right side of the toolbar. Type to search, or click <em>Browse all</em> to open the full picker.</p>`}
          onSave={async ({ html }) => console.log("Saved:", html)}
          onUpload={mockUpload}
          getMentionSuggestions={mockMentionSuggestions}
        />
      </div>
    </div>
  ),
};

const customElements: InsertElement[] = [
  {
    id: "deploy-status",
    label: "Deploy status",
    description: "Live status badge for the latest deploy",
    icon: "rocket",
    iconTint: "var(--catylast-color-purple-100)",
    category: "development",
    keywords: ["release", "ship", "ci"],
    run: ({ editor }) =>
      editor.chain().focus().insertContent("[deploy: success] ").run(),
  },
  {
    id: "team-handbook",
    label: "Team handbook",
    description: "Embed the latest version of the handbook",
    icon: "file-text",
    iconTint: "var(--catylast-color-blue-100)",
    category: "workspace",
    keywords: ["docs", "handbook", "guide"],
    run: ({ editor }) =>
      editor
        .chain()
        .focus()
        .insertContent("<p><a href='/handbook'>Team handbook</a></p>")
        .run(),
  },
];

export const CustomInsertElements: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Pass `insertElements` to extend the menu with consumer-specific items. By default they're appended to the built-in set; set `replaceInsertElements` to swap the list entirely. Each item supplies an icon, label, one-line description, category (`content` / `workspace` / `external` / `development`), and a `run({ editor })` callback that drives the insert.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar="standard"
          insertElements={customElements}
          defaultValue={`<p>Click + and look for <em>Deploy status</em> or <em>Team handbook</em> alongside the built-in items.</p>`}
          onSave={async ({ html }) => console.log("Saved:", html)}
          onUpload={mockUpload}
        />
      </div>
    </div>
  ),
};

export const EmojiPicker: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Click the smiley toolbar button to open the emoji picker. Tabs for Smileys, People, Objects, Symbols, Nature; search across all categories. The selected emoji is inserted as inline text — no special node, so the JSON output is portable.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "780px" }}>
        <RichEditor
          toolbar="standard"
          defaultValue={`<p>Click the smile icon in the toolbar — try the Smileys tab or search for <code>fire</code>.</p>`}
          onSave={async ({ html }) => console.log("Saved:", html)}
        />
      </div>
    </div>
  ),
};

export const EmptyPlaceholder: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "When the document is empty, the `placeholder` text appears in the first paragraph. It disappears as soon as the user types.",
      },
    },
  },
  render: () => (
    <div style={wrapStyle}>
      <div style={{ maxWidth: "640px" }}>
        <RichEditor
          placeholder="What needs to be documented?"
          onSave={async ({ html }) => console.log("Saved:", html)}
        />
      </div>
    </div>
  ),
};
