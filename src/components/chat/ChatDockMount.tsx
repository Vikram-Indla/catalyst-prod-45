import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { ChatDock } from '@/components/chat/dock/ChatDock';
import { NewMessageModal } from '@/components/chat/NewMessageModal';
import { useCreateConversation } from '@/hooks/chat/useCreateConversation';

/**
 * ChatDockMount — the always-on chat dock for the global app shell.
 *
 * Mounted once for authenticated users (see ChatDockRouteGuard in
 * FullAppRoutes). Starts COLLAPSED so only the launcher FAB renders and NO
 * realtime subscriptions open until the user expands it — protects the global
 * shell's performance budget (CLAUDE.md app-shell rule). Tab/open-conversation
 * state lives here so chat persists across route changes.
 */
export default function ChatDockMount() {
  const navigate = useNavigate();
  const { createDM } = useCreateConversation();
  const [collapsed, setCollapsed] = useState(true);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [newOpen, setNewOpen] = useState(false);

  const handleSelect = useCallback((id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveId(id);
    setCollapsed(false);
  }, []);

  const handleStartDM = useCallback(
    async (userId: string) => {
      setNewOpen(false);
      try {
        const convId = await createDM(userId);
        handleSelect(convId);
      } catch {
        // surface nothing — empty state is acceptable per chat defensive pattern
      }
      navigate('/chat');
    },
    [createDM, handleSelect, navigate],
  );

  const handleOpenChannel = useCallback(
    (conversationId: string) => {
      setNewOpen(false);
      handleSelect(conversationId);
      navigate('/chat');
    },
    [handleSelect, navigate],
  );

  const handleClose = useCallback((id: string) => {
    setOpenIds((prev) => prev.filter((x) => x !== id));
    setActiveId((cur) => (cur === id ? undefined : cur));
  }, []);

  return (
    <ChatRealtimeProvider>
      <ChatDock
        openConversationIds={openIds}
        activeId={activeId}
        onSelect={handleSelect}
        onClose={handleClose}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        onNewMessage={() => setNewOpen(true)}
        onPopOut={() => navigate('/chat')}
      />
      <NewMessageModal
        isOpen={newOpen}
        onClose={() => setNewOpen(false)}
        onStart={() => {
          setNewOpen(false);
          navigate('/chat');
        }}
        onStartDM={handleStartDM}
        onOpenChannel={handleOpenChannel}
      />
    </ChatRealtimeProvider>
  );
}
