import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";

export type PanelVariant = "info" | "warning" | "error" | "success" | "note";

export const PANEL_VARIANTS: PanelVariant[] = [
  "info",
  "warning",
  "error",
  "success",
  "note",
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    panel: {
      setPanel: (variant: PanelVariant) => ReturnType;
      togglePanel: (variant: PanelVariant) => ReturnType;
      unsetPanel: () => ReturnType;
    };
  }
}

/**
 * Panel — a colored callout block that wraps other blocks. Five variants:
 * info / warning / error / success / note.
 */
export const Panel = Node.create({
  name: "panel",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info" as PanelVariant,
        parseHTML: (el) =>
          (el.getAttribute("data-panel-variant") as PanelVariant) ?? "info",
        renderHTML: (attrs) => ({
          "data-panel-variant": attrs.variant,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="panel"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "panel" }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setPanel:
        (variant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      togglePanel:
        (variant) =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.lift(this.name);
          }
          return commands.wrapIn(this.name, { variant });
        },
      unsetPanel:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\/info\s$/,
        type: this.type,
        getAttributes: () => ({ variant: "info" }),
      }),
      wrappingInputRule({
        find: /^\/warning\s$/,
        type: this.type,
        getAttributes: () => ({ variant: "warning" }),
      }),
      wrappingInputRule({
        find: /^\/note\s$/,
        type: this.type,
        getAttributes: () => ({ variant: "note" }),
      }),
    ];
  },
});
