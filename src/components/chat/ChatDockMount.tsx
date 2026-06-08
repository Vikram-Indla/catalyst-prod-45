import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { ChatDock } from '@/components/chat/dock/ChatDock';
import { NewMessageModal } from '@/components/chat/NewMessageModal';
import { QuickSwitcher } from '@/components/chat/dock/QuickSwitcher';
import { useCreateConversation } from '@/hooks/chat/useCreateConversation';
import { supabase } from '@/integrations/supabase/client';
import type { ChatSearchRow } from '@/hooks/chat/useChatSearch';

// chat_* RPCs are not in the generated Database types yet — cast to bypass
// typed inference (mirrors useCreateConversation).
const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

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
  const [searchOpen, setSearchOpen] = useState(false);

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

  const handleSearchPick = useCallback(
    async (row: ChatSearchRow) => {
      setSearchOpen(false);
      try {
        let conversationId: string | null = row.conversation_id;
        if (row.result_type === 'person') {
          const { data } = await db.rpc('chat_get_or_create_dm', { target_user_id: row.ref_id });
          conversationId = (data as string) ?? null;
        } else if (row.result_type === 'project') {
          const { data } = await db.rpc('chat_get_or_create_project_channel', {
            p_project_key: row.ref_id,
          });
          conversationId = (data as string) ?? null;
        }
        if (conversationId) handleSelect(conversationId);
      } catch {
        // surface nothing — empty state is acceptable per chat defensive pattern
      }
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
        onOpenSearch={() => setSearchOpen(true)}
      />
      <QuickSwitcher isOpen={searchOpen} onClose={() => setSearchOpen(false)} onPick={handleSearchPick} />
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
