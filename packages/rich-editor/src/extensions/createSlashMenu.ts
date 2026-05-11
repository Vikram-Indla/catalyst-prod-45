import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

import type { SuggestionItem } from "../components/SuggestionList";
import { createSuggestionRender } from "./createSuggestionRender";

export type SlashCommand = SuggestionItem & {
  /** Hint passed to the SuggestionList for matching. */
  keywords?: string[];
  /** Called when the item is selected. The slash text + query is already removed. */
  run: (params: {
    editor: Parameters<
      NonNullable<Parameters<typeof Suggestion>[0]["command"]>
    >[0]["editor"];
  }) => void;
};

export function createSlashMenuExtension(commands: SlashCommand[]) {
  return Extension.create({
    name: "catylastSlashMenu",
    addProseMirrorPlugins() {
      const editorRef = this.editor;
      return [
        Suggestion<SuggestionItem>({
          editor: editorRef,
          char: "/",
          startOfLine: false,
          allowSpaces: true,
          items: ({ query }) => {
            const q = query.toLowerCase().trim();
            if (!q) return commands;
            return commands.filter((c) => {
              if (c.label.toLowerCase().includes(q)) return true;
              if (
                c.description &&
                c.description.toLowerCase().includes(q)
              ) {
                return true;
              }
              if (c.keywords?.some((k) => k.toLowerCase().includes(q))) {
                return true;
              }
              return false;
            });
          },
          command: ({ editor, range, props }) => {
            const cmd = commands.find((c) => c.id === props.id);
            if (!cmd) return;
            editor.chain().focus().deleteRange(range).run();
            cmd.run({ editor });
          },
          render: createSuggestionRender(),
        }),
      ];
    },
  });
}
