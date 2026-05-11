import { Node, mergeAttributes } from "@tiptap/core";

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string; controls?: boolean }) => ReturnType;
    };
  }
}

/**
 * Video block. Renders a `<video>` element with `controls`. Inserted via
 * `editor.chain().focus().setVideo({ src }).run()`.
 */
export const Video = Node.create<VideoOptions>({
  name: "video",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    };
  },
});
