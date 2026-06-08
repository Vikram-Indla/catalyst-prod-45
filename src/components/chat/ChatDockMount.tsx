import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { ChatDock } from '@/components/chat/dock/ChatDock';
import {
  CHAT_OPEN_CONVERSATION_EVENT,
  type OpenConversationDetail,
} from '@/lib/chat-dock-bridge';

/**
 * ChatDockMount — the always-on chat dock for the global app shell.
 *
 * Mounted once for authenticated users (see ChatDockRouteGuard in
 * FullAppRoutes). Starts COLLAPSED so only the launcher FAB renders and NO
 * realtime subscriptions open until the user expands it — protects the global
 * shell's performance budget (CLAUDE.md app-shell rule). Tab/open-conversation
 * state lives here so chat persists across route changes.
 *
 * The legacy NewMessageModal was removed 2026-06-08 — its function is now
 * fully covered by the inline DockDirectory (unified people + conversations
 * list, commit cbffd9f2c). The two surfaces were stacking, producing the
 * "broken chat" double-modal collision.
 */
export default function ChatDockMount() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  const handleSelect = useCallback((id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
    setCollapsed(false);
  }, []);

  const handleClose = useCallback((id: string) => {
    setOpenIds((prev) => prev.filter((x) => x !== id));
    setActiveId((cur) => (cur === id ? undefined : cur));
  }, []);

  // Bridge: any component can open a conversation by dispatching the event
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenConversationDetail>).detail;
      if (!detail?.id) return;
      handleSelect(detail.id);
    };
    window.addEventListener(CHAT_OPEN_CONVERSATION_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_CONVERSATION_EVENT, onOpen);
  }, [handleSelect]);

  return (
    <ChatRealtimeProvider>
      <ChatDock
        openConversationIds={openIds}
        activeId={activeId}
        onSelect={handleSelect}
        onClose={handleClose}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        onFocusDirectory={() => setActiveId(undefined)}
        onPopOut={() => navigate('/chat')}
      />
    </ChatRealtimeProvider>
  );
}
