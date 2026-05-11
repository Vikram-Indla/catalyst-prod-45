import type { InsertElement, UploadFn } from "../types";

const promptForUrl = (label: string): string | null => {
  const url = window.prompt(label);
  return url && url.length > 0 ? url : null;
};

const pickFile = (accept: string, onPick: (file: File) => void): void => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) onPick(file);
  };
  input.click();
};

/**
 * Built-in elements for the Insert menu and browse modal. Consumers can append
 * their own `InsertElement[]` via the `insertElements` prop on `<RichEditor>`.
 */
export function buildDefaultInsertElements(opts?: {
  onUpload?: UploadFn | undefined;
}): InsertElement[] {
  const onUpload = opts?.onUpload;

  return [
    // ───────── content ─────────
    {
      id: "image",
      label: "Image",
      description: "Upload or embed an image inline",
      icon: "image",
      iconTint: "var(--catylast-color-blue-100)",
      category: "content",
      keywords: ["picture", "photo", "media"],
      run: ({ editor }) => {
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
          const url = promptForUrl("Image URL");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        }
      },
    },
    {
      id: "video",
      label: "Video",
      description: "Upload or embed a playable video",
      icon: "film",
      iconTint: "var(--catylast-color-purple-100)",
      category: "content",
      keywords: ["movie", "media", "mp4"],
      run: ({ editor }) => {
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
          const url = promptForUrl("Video URL");
          if (url) editor.chain().focus().setVideo({ src: url }).run();
        }
      },
    },
    {
      id: "attachment",
      label: "File attachment",
      description: "Upload any file (PDF, ZIP, doc, …)",
      icon: "paperclip",
      iconTint: "var(--catylast-color-neutral-100)",
      category: "content",
      keywords: [
        "file",
        "attachment",
        "upload",
        "pdf",
        "zip",
        "doc",
        "document",
      ],
      run: ({ editor }) => {
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
          const url = promptForUrl("File URL");
          if (!url) return;
          const name =
            window.prompt("File name (optional)") ?? undefined;
          editor
            .chain()
            .focus()
            .setAttachment({
              url,
              ...(name ? { name } : {}),
            })
            .run();
        }
      },
    },
    {
      id: "code-block",
      label: "Code block",
      description: "Syntax-highlighted multi-line code",
      icon: "code-block",
      iconTint: "var(--catylast-color-neutral-100)",
      category: "content",
      keywords: ["code", "snippet", "program", "syntax"],
      run: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "divider",
      label: "Divider",
      description: "A horizontal rule that separates content",
      icon: "minus",
      iconTint: "var(--catylast-color-neutral-100)",
      category: "content",
      keywords: ["hr", "rule", "line", "separator"],
      run: ({ editor }) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "info-panel",
      label: "Info panel",
      description: "Highlight neutral, informational context",
      icon: "info",
      iconTint: "var(--catylast-color-blue-100)",
      category: "content",
      keywords: ["callout", "note", "panel", "highlight"],
      run: ({ editor }) => editor.chain().focus().togglePanel("info").run(),
    },
    {
      id: "warning-panel",
      label: "Warning panel",
      description: "Draw attention to a caution or risk",
      icon: "alert-triangle",
      iconTint: "var(--catylast-color-yellow-100)",
      category: "content",
      keywords: ["callout", "panel", "caution", "alert"],
      run: ({ editor }) =>
        editor.chain().focus().togglePanel("warning").run(),
    },
    {
      id: "decision",
      label: "Decision",
      description: "Capture a choice and the reasoning behind it",
      icon: "gavel",
      iconTint: "var(--catylast-color-purple-100)",
      category: "content",
      keywords: ["choice", "decision-log", "callout"],
      run: ({ editor }) => editor.chain().focus().togglePanel("note").run(),
    },
    {
      id: "action-item",
      label: "Action item",
      description: "An unchecked task you'll follow up on",
      icon: "list-checks",
      iconTint: "var(--catylast-color-green-100)",
      category: "content",
      keywords: ["task", "todo", "checkbox"],
      run: ({ editor }) => editor.chain().focus().toggleTaskList().run(),
    },
    {
      id: "date",
      label: "Date",
      description: "Insert today's date inline",
      icon: "calendar",
      iconTint: "var(--catylast-color-blue-100)",
      category: "content",
      keywords: ["calendar", "today", "time"],
      run: ({ editor }) => {
        const today = new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        editor.chain().focus().insertContent(today).run();
      },
    },
    {
      id: "mention",
      label: "Mention a person",
      description: "Type @ to look up a teammate",
      icon: "at-sign",
      iconTint: "var(--catylast-color-blue-100)",
      category: "content",
      keywords: ["mention", "user", "tag", "people"],
      run: ({ editor }) => {
        editor.chain().focus().insertContent("@").run();
      },
    },

    // ───────── workspace ─────────
    {
      id: "page-link",
      label: "Page link",
      description: "Link to a Catylast docs page",
      icon: "file-text",
      iconTint: "var(--catylast-color-blue-100)",
      category: "workspace",
      keywords: ["doc", "page", "wiki", "link"],
      run: ({ editor }) => {
        const url = promptForUrl("Page URL");
        if (!url) return;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}">${url}</a>`)
          .run();
      },
    },
    {
      id: "page-list",
      label: "Page list",
      description: "Embed a live list of docs pages",
      icon: "clipboard-list",
      iconTint: "var(--catylast-color-blue-100)",
      category: "workspace",
      keywords: ["pages", "index", "wiki", "list"],
      run: ({ editor }) =>
        editor
          .chain()
          .focus()
          .togglePanel("info")
          .insertContent("Page list (configure source)")
          .run(),
    },
    {
      id: "table-of-contents",
      label: "Table of contents",
      description: "Auto-generated outline of headings on this page",
      icon: "list-ordered",
      iconTint: "var(--catylast-color-purple-100)",
      category: "workspace",
      keywords: ["toc", "outline", "headings"],
      run: ({ editor }) =>
        editor
          .chain()
          .focus()
          .togglePanel("note")
          .insertContent("Table of contents")
          .run(),
    },

    // ───────── external ─────────
    {
      id: "web-link",
      label: "Web link",
      description: "Embed any external URL with a preview",
      icon: "globe",
      iconTint: "var(--catylast-color-green-100)",
      category: "external",
      keywords: ["url", "embed", "link", "web"],
      run: ({ editor }) => {
        const url = promptForUrl("Web URL");
        if (!url) return;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}">${url}</a>`)
          .run();
      },
    },
    {
      id: "youtube",
      label: "YouTube",
      description: "Embed a YouTube video by URL",
      icon: "video",
      iconTint: "var(--catylast-color-red-100)",
      category: "external",
      keywords: ["video", "embed", "youtube"],
      run: ({ editor }) => {
        const url = promptForUrl("YouTube URL");
        if (!url) return;
        editor.chain().focus().setVideo({ src: url }).run();
      },
    },
    {
      id: "figma",
      label: "Figma",
      description: "Embed a Figma design or prototype",
      icon: "puzzle",
      iconTint: "var(--catylast-color-purple-100)",
      category: "external",
      keywords: ["figma", "design", "prototype", "embed"],
      run: ({ editor }) => {
        const url = promptForUrl("Figma URL");
        if (!url) return;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}">${url}</a>`)
          .run();
      },
    },

    // ───────── development ─────────
    {
      id: "work-item",
      label: "Work item",
      description: "Reference an existing Catylast work item",
      icon: "clipboard-list",
      iconTint: "var(--catylast-color-blue-100)",
      category: "development",
      keywords: ["issue", "ticket", "task", "work"],
      run: ({ editor }) => {
        const id = window.prompt("Work item ID (e.g. CAT-123)");
        if (!id) return;
        editor.chain().focus().insertContent(`[${id}] `).run();
      },
    },
    {
      id: "create-work-item",
      label: "Create work item",
      description: "Create a new work item inline and reference it",
      icon: "plus-square",
      iconTint: "var(--catylast-color-blue-100)",
      category: "development",
      keywords: ["new", "create", "issue"],
      run: ({ editor }) => {
        const title = window.prompt("Title for new work item");
        if (!title) return;
        editor.chain().focus().insertContent(`[NEW] ${title}`).run();
      },
    },
    {
      id: "pull-request",
      label: "Pull request",
      description: "Reference a GitHub or Bitbucket PR",
      icon: "git-pull-request",
      iconTint: "var(--catylast-color-green-100)",
      category: "development",
      keywords: ["pr", "merge", "git", "github"],
      run: ({ editor }) => {
        const url = promptForUrl("Pull request URL");
        if (!url) return;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}">${url}</a>`)
          .run();
      },
    },
    {
      id: "branch",
      label: "Branch",
      description: "Reference a Git branch",
      icon: "git-branch",
      iconTint: "var(--catylast-color-purple-100)",
      category: "development",
      keywords: ["branch", "git", "ref"],
      run: ({ editor }) => {
        const name = window.prompt("Branch name");
        if (!name) return;
        editor.chain().focus().insertContent(`\`${name}\``).run();
      },
    },
    {
      id: "github-snippet",
      label: "Code from GitHub",
      description: "Embed a snippet from a GitHub permalink",
      icon: "git-fork",
      iconTint: "var(--catylast-color-neutral-100)",
      category: "development",
      keywords: ["github", "code", "snippet", "gist"],
      run: ({ editor }) => {
        const url = promptForUrl("GitHub permalink");
        if (!url) return;
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${url}">${url}</a>`)
          .run();
      },
    },
    {
      id: "status-badge",
      label: "Status",
      description: "An inline coloured status badge",
      icon: "hash",
      iconTint: "var(--catylast-color-yellow-100)",
      category: "development",
      keywords: ["status", "badge", "label"],
      run: ({ editor }) => {
        const text = window.prompt("Status text", "In progress");
        if (!text) return;
        editor.chain().focus().insertContent(`[${text}] `).run();
      },
    },
  ];
}
