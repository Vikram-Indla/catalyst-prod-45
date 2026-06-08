/**
 * chat-dock-bridge — tiny event bus to control the global ChatDockMount from
 * anywhere (issue detail views, project rails, etc) without prop-drilling.
 *
 * Producers dispatch openConversation(id) → ChatDockMount listens, expands the
 * dock, marks the tab open, and sets it active.
 */

export const CHAT_OPEN_CONVERSATION_EVENT = 'catalyst-chat:open-conversation';

export interface OpenConversationDetail {
  id: string;
}

export function openConversationInDock(id: string): void {
  window.dispatchEvent(
    new CustomEvent<OpenConversationDetail>(CHAT_OPEN_CONVERSATION_EVENT, {
      detail: { id },
    }),
  );
}
