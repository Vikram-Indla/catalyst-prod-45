import { Node, mergeAttributes } from "@tiptap/core";

export interface AttachmentOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (options: {
        url: string;
        name?: string;
        size?: number;
        mimeType?: string;
      }) => ReturnType;
    };
  }
}

/**
 * Generic file-attachment block. Renders as a card-like row containing:
 *
 * - a square "tile" with the file kind (PDF, ZIP, DOC, …) drawn as text
 *   on a colored background — the same affordance issue trackers and
 *   docs apps use for attachments,
 * - the filename,
 * - a meta line with the human file size and MIME type,
 * - a trailing download anchor that opens the URL in a new tab.
 *
 * The node stores `url`, `name`, `size`, and `mimeType` as attributes
 * so the document JSON / HTML round-trips losslessly through Tiptap's
 * persistence layer.
 *
 * Inserted via:
 *
 * ```ts
 * editor.chain().focus().setAttachment({
 *   url, name, size, mimeType,
 * }).run();
 * ```
 */
export const Attachment = Node.create<AttachmentOptions>({
  name: "attachment",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      url: { default: null },
      name: { default: null },
      size: { default: null },
      mimeType: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="attachment"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const url = (node.attrs.url as string | null) ?? "#";
    const name = (node.attrs.name as string | null) ?? "Untitled file";
    const size = node.attrs.size as number | null;
    const mimeType = (node.attrs.mimeType as string | null) ?? "";

    const kind = pickKind(mimeType, name);
    const tileLabel = pickTileLabel(name, mimeType);
    const sizeLabel = formatFileSize(size);
    const metaPieces = [sizeLabel, KIND_LABEL[kind]].filter(Boolean);

    const attrs = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        "data-type": "attachment",
        "data-attachment-url": url,
        "data-attachment-name": name,
        "data-attachment-size": size === null ? "" : String(size),
        "data-attachment-mime-type": mimeType,
        "data-attachment-kind": kind,
        class: "ce-attachment",
        contenteditable: "false",
        // Make the whole card behave like an "atom" block in browser
        // selection — keyboards can move focus over it but can't enter.
        tabindex: "-1",
      },
    );

    return [
      "div",
      attrs,
      [
        "span",
        {
          class: "ce-attachment__tile",
          "data-kind": kind,
          "aria-hidden": "true",
        },
        tileLabel,
      ],
      [
        "div",
        { class: "ce-attachment__body" },
        ["span", { class: "ce-attachment__name" }, name],
        [
          "span",
          { class: "ce-attachment__meta" },
          metaPieces.join(" · "),
        ],
      ],
      [
        "a",
        {
          class: "ce-attachment__download",
          href: url,
          download: name,
          target: "_blank",
          rel: "noopener noreferrer",
          "aria-label": `Download ${name}`,
        },
        // Inline SVG keeps the rendered HTML self-contained when the
        // editor's saved HTML is displayed outside Tiptap's runtime.
        [
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "aria-hidden": "true",
          },
          ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
          ["polyline", { points: "7 10 12 15 17 10" }],
          ["line", { x1: "12", y1: "15", x2: "12", y2: "3" }],
        ],
      ],
    ];
  },

  addCommands() {
    return {
      setAttachment:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },
});

// ----------------------------------------------------------------------------
// Helpers — kind classification, tile label, size formatting
// ----------------------------------------------------------------------------

/** Coarse-grained kind used to pick the tile color and meta label. */
export type AttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "archive"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "code"
  | "file";

const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  pdf: "PDF document",
  archive: "Archive",
  document: "Document",
  spreadsheet: "Spreadsheet",
  presentation: "Presentation",
  code: "Source code",
  file: "File",
};

const ARCHIVE_EXT = new Set([
  "zip",
  "rar",
  "tar",
  "gz",
  "tgz",
  "7z",
  "bz2",
  "xz",
]);
const DOC_EXT = new Set(["doc", "docx", "rtf", "odt", "pages", "txt", "md"]);
const SHEET_EXT = new Set(["xls", "xlsx", "csv", "tsv", "ods", "numbers"]);
const SLIDES_EXT = new Set(["ppt", "pptx", "odp", "key"]);
const CODE_EXT = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "java",
  "c",
  "cc",
  "cpp",
  "h",
  "hpp",
  "cs",
  "rb",
  "go",
  "rs",
  "kt",
  "swift",
  "php",
  "sh",
  "bash",
  "zsh",
  "fish",
  "json",
  "yaml",
  "yml",
  "toml",
  "html",
  "css",
  "scss",
  "sql",
  "graphql",
]);

function getExt(name: string | null | undefined): string {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

export function pickKind(
  mimeType: string | null | undefined,
  name: string | null | undefined,
): AttachmentKind {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const ext = getExt(name);
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (ARCHIVE_EXT.has(ext)) return "archive";
  if (mime.includes("spreadsheet") || SHEET_EXT.has(ext)) return "spreadsheet";
  if (mime.includes("presentation") || SLIDES_EXT.has(ext)) return "presentation";
  if (
    mime.includes("msword") ||
    mime.includes("officedocument.wordprocessingml") ||
    DOC_EXT.has(ext)
  )
    return "document";
  if (CODE_EXT.has(ext)) return "code";
  return "file";
}

/**
 * Short text shown on the colored tile — usually the file extension
 * uppercased, capped at 4 chars so it stays legible inside the tile.
 */
export function pickTileLabel(
  name: string | null | undefined,
  mimeType: string | null | undefined,
): string {
  const ext = getExt(name);
  if (ext) return ext.slice(0, 4).toUpperCase();
  const mime = mimeType ?? "";
  if (mime) {
    const sub = mime.split("/")[1] ?? mime;
    return sub.slice(0, 4).toUpperCase();
  }
  return "FILE";
}

/** Render bytes as a short human-readable label ("1.4 MB"). */
export function formatFileSize(
  bytes: number | null | undefined,
): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes) || bytes < 0)
    return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
