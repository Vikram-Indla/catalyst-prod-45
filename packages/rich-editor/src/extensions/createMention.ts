import Mention from "@tiptap/extension-mention";

import type { SuggestionItem } from "../components/SuggestionList";
import { createSuggestionRender } from "./createSuggestionRender";

export type MentionUser = {
  id: string;
  label: string;
  description?: string;
};

export type MentionSuggestionsFn = (
  query: string,
) => Promise<MentionUser[]> | MentionUser[];

export function createMentionExtension(getSuggestions: MentionSuggestionsFn) {
  return Mention.configure({
    HTMLAttributes: {
      class: "catylast-mention",
    },
    suggestion: {
      char: "@",
      items: async ({ query }) => {
        const result = await Promise.resolve(getSuggestions(query));
        const items: SuggestionItem[] = result.map((u) => {
          const item: SuggestionItem = { id: u.id, label: u.label };
          if (u.description !== undefined) item.description = u.description;
          return item;
        });
        return items;
      },
      command: ({ editor, range, props }) => {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: "mention",
              attrs: { id: props.id, label: props.label },
            },
            { type: "text", text: " " },
          ])
          .run();
      },
      render: createSuggestionRender(),
    },
  });
}
