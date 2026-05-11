import type { Editor } from "@tiptap/react";
import { Icon } from "@catylast/icons";
import type { IconName } from "@catylast/icons";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "@catylast/primitives";

import { EmojiPicker } from "./components/EmojiPicker";
import { InsertElementMenu } from "./components/InsertElementMenu";
import * as styles from "./Editor.css";
import type { PanelVariant } from "./extensions/Panel";
import { PANEL_VARIANTS } from "./extensions/Panel";
import type {
  InsertElement,
  ToolbarConfig,
  ToolbarItemKey,
  ToolbarPreset,
  UploadFn,
} from "./types";

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter((c): c is string => Boolean(c)).join(" ");

const PRESETS: Record<ToolbarPreset, ToolbarItemKey[]> = {
  basic: [
    "bold",
    "italic",
    "separator",
    "bullet-list",
    "ordered-list",
    "separator",
    "link",
    "mention",
    "emoji",
    "separator",
    "insert-element",
  ],
  standard: [
    "heading",
    "separator",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "separator",
    "bullet-list",
    "ordered-list",
    "task-list",
    "separator",
    "blockquote",
    "code",
    "code-block",
    "panel",
    "separator",
    "link",
    "image",
    "video",
    "attach-file",
    "mention",
    "emoji",
    "separator",
    "insert-element",
  ],
  full: [
    "heading",
    "separator",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "code",
    "separator",
    "bullet-list",
    "ordered-list",
    "task-list",
    "separator",
    "blockquote",
    "code-block",
    "panel",
    "horizontal-rule",
    "separator",
    "link",
    "image",
    "video",
    "attach-file",
    "mention",
    "emoji",
    "separator",
    "insert-element",
    "separator",
    "undo",
    "redo",
  ],
};

function resolveItems(config: ToolbarConfig | undefined): ToolbarItemKey[] {
  if (!config) return [];
  if (typeof config === "string") return PRESETS[config];
  return config;
}

type ItemDef = {
  icon: IconName;
  label: string;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
  onAction: (editor: Editor) => void;
};

type ButtonKey = Exclude<
  ToolbarItemKey,
  | "separator"
  | "heading"
  | "panel"
  | "image"
  | "video"
  | "attach-file"
  | "emoji"
  | "insert-element"
>;

const ITEM_DEFS: Record<ButtonKey, ItemDef> = {
  bold: {
    icon: "bold",
    label: "Bold",
    isActive: (e) => e.isActive("bold"),
    onAction: (e) => e.chain().focus().toggleBold().run(),
  },
  italic: {
    icon: "italic",
    label: "Italic",
    isActive: (e) => e.isActive("italic"),
    onAction: (e) => e.chain().focus().toggleItalic().run(),
  },
  underline: {
    icon: "underline",
    label: "Underline",
    isActive: (e) => e.isActive("underline"),
    onAction: (e) => e.chain().focus().toggleUnderline().run(),
  },
  strikethrough: {
    icon: "strikethrough",
    label: "Strikethrough",
    isActive: (e) => e.isActive("strike"),
    onAction: (e) => e.chain().focus().toggleStrike().run(),
  },
  code: {
    icon: "code",
    label: "Inline code",
    isActive: (e) => e.isActive("code"),
    onAction: (e) => e.chain().focus().toggleCode().run(),
  },
  "bullet-list": {
    icon: "list",
    label: "Bullet list",
    isActive: (e) => e.isActive("bulletList"),
    onAction: (e) => e.chain().focus().toggleBulletList().run(),
  },
  "ordered-list": {
    icon: "list-ordered",
    label: "Numbered list",
    isActive: (e) => e.isActive("orderedList"),
    onAction: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  "task-list": {
    icon: "list-checks",
    label: "Task list",
    isActive: (e) => e.isActive("taskList"),
    onAction: (e) => e.chain().focus().toggleTaskList().run(),
  },
  blockquote: {
    icon: "quote",
    label: "Blockquote",
    isActive: (e) => e.isActive("blockquote"),
    onAction: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  "code-block": {
    icon: "code-block",
    label: "Code block",
    isActive: (e) => e.isActive("codeBlock"),
    onAction: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  link: {
    icon: "link",
    label: "Link",
    isActive: (e) => e.isActive("link"),
    onAction: (e) => {
      const previous = (e.getAttributes("link").href as string) ?? "";
      const url = window.prompt("URL", previous);
      if (url === null) return;
      if (url === "") {
        e.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      e.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    },
  },
  mention: {
    icon: "at-sign",
    label: "Mention",
    onAction: (e) => {
      e.chain().focus().insertContent("@").run();
    },
  },
  "horizontal-rule": {
    icon: "minus",
    label: "Horizontal rule",
    onAction: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  undo: {
    icon: "undo",
    label: "Undo",
    isDisabled: (e) => !e.can().undo(),
    onAction: (e) => e.chain().focus().undo().run(),
  },
  redo: {
    icon: "redo",
    label: "Redo",
    isDisabled: (e) => !e.can().redo(),
    onAction: (e) => e.chain().focus().redo().run(),
  },
};

type HeadingOption = {
  label: string;
  isActive: (editor: Editor) => boolean;
  onSelect: (editor: Editor) => void;
};

const HEADING_OPTIONS: HeadingOption[] = [
  {
    label: "Paragraph",
    isActive: (e) =>
      !e.isActive("heading") &&
      !e.isActive("blockquote") &&
      !e.isActive("codeBlock"),
    onSelect: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    label: "Heading 1",
    isActive: (e) => e.isActive("heading", { level: 1 }),
    onSelect: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    isActive: (e) => e.isActive("heading", { level: 2 }),
    onSelect: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Heading 3",
    isActive: (e) => e.isActive("heading", { level: 3 }),
    onSelect: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
];

function HeadingDropdown({ editor }: { editor: Editor }) {
  const current =
    HEADING_OPTIONS.find((o) => o.isActive(editor)) ?? HEADING_OPTIONS[0]!;
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          className={styles.toolbarHeadingTrigger}
          type="button"
          aria-label="Text style"
          onMouseDown={(e) => e.preventDefault()}
        >
          <span>{current.label}</span>
          <Icon name="chevron-down" size={14} />
        </button>
      </MenuTrigger>
      <MenuContent align="start">
        {HEADING_OPTIONS.map((opt) => (
          <MenuItem key={opt.label} onSelect={() => opt.onSelect(editor)}>
            {opt.label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

const PANEL_LABELS: Record<PanelVariant, { label: string; icon: IconName }> = {
  info: { label: "Info", icon: "info" },
  warning: { label: "Warning", icon: "alert-triangle" },
  error: { label: "Error", icon: "alert-circle" },
  success: { label: "Success", icon: "check-circle" },
  note: { label: "Note", icon: "bookmark" },
};

function PanelDropdown({ editor }: { editor: Editor }) {
  const isActive = editor.isActive("panel");
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          className={cx(
            styles.toolbarButton,
            isActive && styles.toolbarButtonActive,
          )}
          type="button"
          aria-label="Insert panel"
          title="Insert panel"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Icon name="info" size={16} />
        </button>
      </MenuTrigger>
      <MenuContent align="start">
        <MenuLabel>Insert panel</MenuLabel>
        {PANEL_VARIANTS.map((variant) => (
          <MenuItem
            key={variant}
            onSelect={() => editor.chain().focus().togglePanel(variant).run()}
          >
            <Icon name={PANEL_LABELS[variant].icon} size={14} />
            {PANEL_LABELS[variant].label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function pickFile(accept: string, onPick: (file: File) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) onPick(file);
  };
  input.click();
}

function ImageButton({
  editor,
  onUpload,
}: {
  editor: Editor;
  onUpload: UploadFn | undefined;
}) {
  const handleClick = () => {
    if (onUpload) {
      pickFile("image/*", async (file) => {
        try {
          const result = await onUpload(file);
          editor.chain().focus().setImage({ src: result.url }).run();
        } catch (err) {
          console.error("Image upload failed:", err);
          window.alert("Image upload failed");
        }
      });
    } else {
      const url = window.prompt("Image URL");
      if (!url) return;
      editor.chain().focus().setImage({ src: url }).run();
    }
  };
  return (
    <button
      type="button"
      className={styles.toolbarButton}
      aria-label="Insert image"
      title="Insert image"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
    >
      <Icon name="image" size={16} />
    </button>
  );
}

function VideoButton({
  editor,
  onUpload,
}: {
  editor: Editor;
  onUpload: UploadFn | undefined;
}) {
  const handleClick = () => {
    if (onUpload) {
      pickFile("video/*", async (file) => {
        try {
          const result = await onUpload(file);
          editor.chain().focus().setVideo({ src: result.url }).run();
        } catch (err) {
          console.error("Video upload failed:", err);
          window.alert("Video upload failed");
        }
      });
    } else {
      const url = window.prompt("Video URL");
      if (!url) return;
      editor.chain().focus().setVideo({ src: url }).run();
    }
  };
  return (
    <button
      type="button"
      className={styles.toolbarButton}
      aria-label="Insert video"
      title="Insert video"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
    >
      <Icon name="video" size={16} />
    </button>
  );
}

/**
 * Insert a generic file attachment. Accepts any file type — the consumer's
 * `onUpload` callback decides what to do with it. If `onUpload` returns a
 * result with `type: "image"` or `"video"`, we route it to the matching
 * node so users can drop a PNG into the attach button and still get an
 * inline image. Otherwise the file inserts as an Attachment card.
 *
 * Without an upload handler, falls back to a URL prompt and inserts a
 * minimal Attachment card pointing at the URL.
 */
function AttachFileButton({
  editor,
  onUpload,
}: {
  editor: Editor;
  onUpload: UploadFn | undefined;
}) {
  const handleClick = () => {
    if (onUpload) {
      pickFile("*/*", async (file) => {
        try {
          const result = await onUpload(file);
          if (result.type === "image") {
            editor.chain().focus().setImage({ src: result.url }).run();
            return;
          }
          if (result.type === "video") {
            editor.chain().focus().setVideo({ src: result.url }).run();
            return;
          }
          editor
            .chain()
            .focus()
            .setAttachment({
              url: result.url,
              name: result.name ?? file.name,
              size: result.size ?? file.size,
              mimeType: result.mimeType ?? file.type,
            })
            .run();
        } catch (err) {
          console.error("Attachment upload failed:", err);
          window.alert("Attachment upload failed");
        }
      });
    } else {
      const url = window.prompt("File URL");
      if (!url) return;
      const name = window.prompt("File name (optional)") ?? undefined;
      editor
        .chain()
        .focus()
        .setAttachment({
          url,
          ...(name ? { name } : {}),
        })
        .run();
    }
  };
  return (
    <button
      type="button"
      className={styles.toolbarButton}
      aria-label="Attach file"
      title="Attach file"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
    >
      <Icon name="paperclip" size={16} />
    </button>
  );
}

export type ToolbarProps = {
  editor: Editor;
  config: ToolbarConfig;
  onUpload: UploadFn | undefined;
  insertElements: InsertElement[];
  onBrowseAll: () => void;
};

export function Toolbar({
  editor,
  config,
  onUpload,
  insertElements,
  onBrowseAll,
}: ToolbarProps) {
  const items = resolveItems(config);
  return (
    <div
      className={styles.toolbar}
      role="toolbar"
      aria-label="Editor toolbar"
    >
      {items.map((key, i) => {
        if (key === "separator") {
          return (
            <span
              key={`sep-${i}`}
              className={styles.toolbarSeparator}
              aria-hidden="true"
            />
          );
        }
        if (key === "heading") {
          return <HeadingDropdown key={`heading-${i}`} editor={editor} />;
        }
        if (key === "panel") {
          return <PanelDropdown key={`panel-${i}`} editor={editor} />;
        }
        if (key === "image") {
          return (
            <ImageButton key={`image-${i}`} editor={editor} onUpload={onUpload} />
          );
        }
        if (key === "video") {
          return (
            <VideoButton key={`video-${i}`} editor={editor} onUpload={onUpload} />
          );
        }
        if (key === "attach-file") {
          return (
            <AttachFileButton
              key={`attach-${i}`}
              editor={editor}
              onUpload={onUpload}
            />
          );
        }
        if (key === "emoji") {
          return <EmojiPicker key={`emoji-${i}`} editor={editor} />;
        }
        if (key === "insert-element") {
          return (
            <InsertElementMenu
              key={`insert-${i}`}
              editor={editor}
              items={insertElements}
              onBrowseAll={onBrowseAll}
            />
          );
        }
        const def = ITEM_DEFS[key];
        const active = def.isActive?.(editor) ?? false;
        const disabled = def.isDisabled?.(editor) ?? false;
        return (
          <button
            key={`${key}-${i}`}
            type="button"
            className={cx(
              styles.toolbarButton,
              active && styles.toolbarButtonActive,
            )}
            aria-label={def.label}
            aria-pressed={active}
            title={def.label}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => def.onAction(editor)}
          >
            <Icon name={def.icon} size={16} />
          </button>
        );
      })}
    </div>
  );
}
