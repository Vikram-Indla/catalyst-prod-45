import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";

import {
  SuggestionList,
  type SuggestionItem,
  type SuggestionListHandle,
} from "../components/SuggestionList";

/**
 * Shared render function for any Tiptap suggestion-based extension
 * (mention, slash menu, emoji). Mounts the SuggestionList in a portal under
 * `document.body` and positions it via the suggestion's clientRect.
 */
export function createSuggestionRender(): NonNullable<
  SuggestionOptions<SuggestionItem, SuggestionItem>["render"]
> {
  return () => {
    let component: ReactRenderer<SuggestionListHandle> | null = null;
    let popup: HTMLDivElement | null = null;

    const positionPopup = (
      el: HTMLDivElement,
      clientRect: (() => DOMRect | null) | null | undefined,
    ) => {
      if (!clientRect) return;
      const rect = clientRect();
      if (!rect) return;
      const top = rect.bottom + window.scrollY + 4;
      const left = rect.left + window.scrollX;
      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
    };

    return {
      onStart: (props) => {
        component = new ReactRenderer(SuggestionList, {
          props,
          editor: props.editor,
        });

        popup = document.createElement("div");
        popup.style.position = "absolute";
        popup.style.zIndex = "var(--catylast-z-index-popover, 1500)";
        popup.appendChild(component.element);
        document.body.appendChild(popup);

        positionPopup(popup, props.clientRect);
      },

      onUpdate: (props) => {
        component?.updateProps(props);
        if (popup) positionPopup(popup, props.clientRect);
      },

      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          popup?.remove();
          popup = null;
          return true;
        }
        return component?.ref?.onKeyDown({ event: props.event }) ?? false;
      },

      onExit: () => {
        popup?.remove();
        popup = null;
        component?.destroy();
        component = null;
      },
    };
  };
}
