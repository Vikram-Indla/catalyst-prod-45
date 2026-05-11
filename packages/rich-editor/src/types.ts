import type { Editor } from "@tiptap/react";
import type { IconName } from "@catylast/icons";

/** Every toolbar feature shipped in v0.1 + iters 2/3/4. */
export type ToolbarItemKey =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "heading"
  | "bullet-list"
  | "ordered-list"
  | "task-list"
  | "blockquote"
  | "code-block"
  | "link"
  | "image"
  | "video"
  | "attach-file"
  | "emoji"
  | "mention"
  | "panel"
  | "horizontal-rule"
  | "insert-element"
  | "undo"
  | "redo"
  | "separator";

export type ToolbarPreset = "basic" | "standard" | "full";

/** Configures the toolbar. Preset string, custom array, or `false` to hide. */
export type ToolbarConfig = ToolbarPreset | ToolbarItemKey[] | false;

/** Editor content as Tiptap's native JSON, an HTML string, or empty. */
export type EditorContent = string | object | null | undefined;

/** Payload passed to `onSave`. Includes both serializations. */
export type SavePayload = {
  /** Tiptap's native JSON document. Best fidelity for round-tripping. */
  json: object;
  /** Rendered HTML string. Use for read-only display when JSON isn't available. */
  html: string;
};

/**
 * Result of a successful upload. The `type` field tells the editor
 * which node to insert:
 *
 * - `"image"` — inserts an `<img>` (Tiptap Image extension).
 * - `"video"` — inserts a `<video>` (custom Catylast Video extension).
 * - `"file"` — inserts an Attachment card showing filename, size, and
 *   a download link. Pair with the optional `name` / `size` /
 *   `mimeType` fields so the card renders informative metadata.
 *
 * Backwards-compatible: callers that only return `{ url, type }` for
 * image/video uploads continue to work without changes.
 */
export type UploadResult = {
  /** Public URL the editor inserts into the document. */
  url: string;
  /** Which kind of node to insert. */
  type: "image" | "video" | "file";
  /** Original filename. Used as the label for `"file"` attachments. */
  name?: string;
  /** File size in bytes. Renders as a human label ("1.4 MB") on attachments. */
  size?: number;
  /** MIME type. Drives the icon glyph on attachments. */
  mimeType?: string;
};

/** Consumer-supplied uploader for image / video / file uploads. */
export type UploadFn = (file: File) => Promise<UploadResult>;

/** The four browse-modal categories. */
export type InsertElementCategory =
  | "content"
  | "workspace"
  | "external"
  | "development";

/** A single insertable element shown in the +/Browse menu. */
export type InsertElement = {
  /** Stable identifier — used for keys and search. */
  id: string;
  /** Item title shown in the dropdown and modal. */
  label: string;
  /** One-line description shown beneath the label. */
  description: string;
  /** Icon glyph from `@catylast/icons`. */
  icon: IconName;
  /**
   * Optional accent color for the icon tile in the modal grid. CSS color
   * string. If omitted, the default neutral surface is used.
   */
  iconTint?: string;
  /** Which sidebar tab this element appears under in the browse modal. */
  category: InsertElementCategory;
  /** Search keywords (besides label/description) that should match this item. */
  keywords?: string[];
  /** Runs when the user picks the item. Insert content via the editor. */
  run: (ctx: { editor: Editor }) => void;
};
