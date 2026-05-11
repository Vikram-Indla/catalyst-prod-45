import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@catylast/primitives";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DragHandleOverlay } from "./components/DragHandleOverlay";
import { InsertElementModal } from "./components/InsertElementModal";
import * as styles from "./Editor.css";
import { DragHandleExtension } from "./extensions/DragHandle";
import { HighlightedCodeBlock } from "./extensions/createCodeBlock";
import { createMentionExtension } from "./extensions/createMention";
import type { MentionSuggestionsFn } from "./extensions/createMention";
import {
  createSlashMenuExtension,
  type SlashCommand,
} from "./extensions/createSlashMenu";
import { buildDefaultInsertElements } from "./extensions/insertItems";
import { Attachment } from "./extensions/Attachment";
import { Panel, PANEL_VARIANTS } from "./extensions/Panel";
import { Video } from "./extensions/Video";
import { Toolbar } from "./Toolbar";
import type {
  EditorContent as EditorContentValue,
  InsertElement,
  SavePayload,
  ToolbarConfig,
  UploadFn,
} from "./types";

const cx = (...classes: Array<string | false | undefined | null>) =>
  classes.filter((c): c is string => Boolean(c)).join(" ");

const buildDefaultSlashCommands = (): SlashCommand[] => [
  {
    id: "heading-1",
    label: "Heading 1",
    description: "Large section heading",
    keywords: ["h1", "title"],
    run: ({ editor }) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    label: "Heading 2",
    description: "Medium section heading",
    keywords: ["h2"],
    run: ({ editor }) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3",
    label: "Heading 3",
    description: "Small section heading",
    keywords: ["h3"],
    run: ({ editor }) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list",
    label: "Bullet list",
    keywords: ["ul", "unordered"],
    run: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "Numbered list",
    keywords: ["ol", "ordered"],
    run: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task-list",
    label: "Task list",
    description: "A checklist of items",
    keywords: ["checklist", "todo"],
    run: ({ editor }) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "blockquote",
    label: "Blockquote",
    keywords: ["quote"],
    run: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code-block",
    label: "Code block",
    description: "Syntax-highlighted code",
    keywords: ["code", "pre"],
    run: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "horizontal-rule",
    label: "Divider",
    description: "A horizontal rule",
    keywords: ["hr", "rule", "divider"],
    run: ({ editor }) => editor.chain().focus().setHorizontalRule().run(),
  },
  ...PANEL_VARIANTS.map(
    (v): SlashCommand => ({
      id: `panel-${v}`,
      label: `${v.charAt(0).toUpperCase()}${v.slice(1)} panel`,
      description: `${v} callout block`,
      keywords: ["panel", "callout", v],
      run: ({ editor }) => editor.chain().focus().togglePanel(v).run(),
    }),
  ),
];

export type RichEditorProps = {
  /** Initial document — Tiptap JSON object, HTML string, or empty. */
  defaultValue?: EditorContentValue;
  /**
   * Called when the user clicks Save. Receives both the JSON document and
   * its rendered HTML.
   */
  onSave?: (payload: SavePayload) => Promise<void> | void;
  /** Called when the user clicks Cancel after editing. */
  onCancel?: () => void;
  /**
   * Called when the user inserts an image or video. Receives the picked file
   * and returns a `{ url, type }` after upload completes. Without this prop,
   * the toolbar falls back to a URL prompt.
   */
  onUpload?: UploadFn;
  /**
   * Returns the list of users matching `query` for the `@mention` popover.
   * If omitted, the mention extension is not loaded.
   */
  getMentionSuggestions?: MentionSuggestionsFn;
  /**
   * Custom slash commands. If omitted, a sensible default set is used. Pass
   * `false` to disable the slash menu entirely.
   */
  slashCommands?: SlashCommand[] | false;
  /**
   * Items shown in the toolbar's `+ Insert element` dropdown and the browse
   * modal. The default set covers the built-in content/dev/external/workspace
   * items; pass an array to extend, or replace it entirely.
   */
  insertElements?: InsertElement[];
  /**
   * Replace the default insert elements rather than appending. Default `false`
   * (i.e. consumer items are merged on top of the defaults).
   */
  replaceInsertElements?: boolean;
  /** Toolbar configuration. */
  toolbar?: ToolbarConfig;
  /** Empty-document placeholder text. */
  placeholder?: string;
  /** Force read-only — no toolbar, no click-to-edit, no save/cancel. */
  readOnly?: boolean;
  /** Auto-focus the editor when entering edit mode. */
  autoFocusOnEdit?: boolean;
  /** Override the Save button label. */
  saveLabel?: string;
  /** Override the Cancel button label. */
  cancelLabel?: string;
  /** Disable the gutter drag handle (enabled by default in edit mode). */
  disableDragHandle?: boolean;
  className?: string;
};

export function RichEditor({
  defaultValue,
  onSave,
  onCancel,
  onUpload,
  getMentionSuggestions,
  slashCommands,
  insertElements,
  replaceInsertElements = false,
  toolbar = "standard",
  placeholder = "Add a description…",
  readOnly = false,
  autoFocusOnEdit = true,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  disableDragHandle = false,
  className,
}: RichEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [savedContent, setSavedContent] =
    useState<EditorContentValue>(defaultValue);
  const [saving, setSaving] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);

  const resolvedInsertElements = useMemo<InsertElement[]>(() => {
    const defaults = buildDefaultInsertElements({ onUpload });
    if (!insertElements) return defaults;
    if (replaceInsertElements) return insertElements;
    return [...defaults, ...insertElements];
  }, [insertElements, replaceInsertElements, onUpload]);

  const extensions = useMemo(() => {
    const exts: unknown[] = [
      StarterKit.configure({ codeBlock: false }),
      HighlightedCodeBlock,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image,
      Video,
      Attachment,
      Panel,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder, showOnlyWhenEditable: false }),
    ];
    if (!disableDragHandle) {
      exts.push(DragHandleExtension);
    }
    if (getMentionSuggestions) {
      exts.push(createMentionExtension(getMentionSuggestions));
    }
    if (slashCommands !== false) {
      const cmds = slashCommands ?? buildDefaultSlashCommands();
      exts.push(createSlashMenuExtension(cmds));
    }
    return exts as never;
  }, [placeholder, disableDragHandle, getMentionSuggestions, slashCommands]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: defaultValue ?? "",
      editable: false,
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) return;
    const editable = mode === "edit" && !readOnly;
    editor.setEditable(editable);
    if (editable && autoFocusOnEdit) {
      editor.commands.focus("end");
    }
  }, [mode, editor, readOnly, autoFocusOnEdit]);

  const handleViewClick = useCallback(() => {
    if (readOnly) return;
    if (mode === "view") {
      setMode("edit");
    }
  }, [mode, readOnly]);

  const handleSave = useCallback(async () => {
    if (!editor) return;
    const json = editor.getJSON();
    const html = editor.getHTML();
    setSaving(true);
    try {
      if (onSave) {
        await onSave({ json, html });
      }
      setSavedContent(json);
      setMode("view");
    } finally {
      setSaving(false);
    }
  }, [editor, onSave]);

  const handleCancel = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(savedContent ?? "");
    setMode("view");
    onCancel?.();
  }, [editor, savedContent, onCancel]);

  const isEditing = mode === "edit" && !readOnly;
  const showToolbar = isEditing && toolbar !== false && editor !== null;
  const showActions = isEditing && Boolean(onSave);

  return (
    <div
      ref={containerRef}
      className={cx(
        styles.container,
        isEditing ? styles.containerEditing : styles.containerView,
        className,
      )}
    >
      {showToolbar && editor && (
        <Toolbar
          editor={editor}
          config={toolbar}
          onUpload={onUpload}
          insertElements={resolvedInsertElements}
          onBrowseAll={() => setBrowseOpen(true)}
        />
      )}
      {editor && (
        <InsertElementModal
          open={browseOpen}
          editor={editor}
          items={resolvedInsertElements}
          onClose={() => setBrowseOpen(false)}
        />
      )}
      <div
        className={cx(styles.content, !isEditing && styles.contentReadOnly)}
        onClick={!isEditing && !readOnly ? handleViewClick : undefined}
      >
        <EditorContent editor={editor} />
      </div>
      {editor && isEditing && !disableDragHandle && (
        <DragHandleOverlay editor={editor} containerRef={containerRef} />
      )}
      {showActions && (
        <div className={styles.actionBar}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : saveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
