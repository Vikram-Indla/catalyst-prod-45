/**
 * ChatFullScreen — ring-fenced entry point for Catalyst Chat.
 *
 * This file is the ONLY export from /src/features/chat/.
 * It is the ONLY file in the codebase that imports tokens.css.
 * Callers: src/pages/chat/ChatPage.tsx only.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { useConversations } from '@/hooks/chat/useConversations';
import { ChatShell } from './components/ChatShell';
import { useShellState } from './hooks/useShellState';
import { MessageFeed } from './components/feed/MessageFeed';
import { ThreadPane } from './components/thread/ThreadPane';
import { NewConversationModal } from './components/NewConversationModal';
import './tokens.css';

const db = supabase as unknown as { from: (t: string) => any };

function useSelfProfile(): { name: string; avatarUrl: string | null } {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['chat-self-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await db
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });
  return {
    name: data?.full_name ?? user?.email ?? 'Me',
    avatarUrl: data?.avatar_url ?? null,
  };
}

function ChatFullScreenInner() {
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [unreadActivity, setUnreadActivity] = useState(0);
  const [pendingMessageId, setPendingMessageId] = useState<string | undefined>(undefined);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const shell = useShellState();
  const { conversations, isLoading } = useConversations();
  const { name: userName, avatarUrl: userAvatarUrl } = useSelfProfile();

  const unreadDMs = conversations
    .filter(c => (c.kind === 'dm' || c.kind === 'group_dm') && c.unreadCount > 0)
    .reduce((sum, c) => sum + c.unreadCount, 0);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    if (shell.activeView !== 'chat') {
      shell.setActiveView('chat');
    }
  };

  const handleOpenConversation = (conversationId: string, messageId?: string) => {
    handleSelectConversation(conversationId);
    setPendingMessageId(messageId);
  };

  const handleConversationCreated = (conversationId: string) => {
    setShowNewConvModal(false);
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    handleSelectConversation(conversationId);
  };

  const handleStartDM = async (partnerId: string, partnerName: string) => {
    const uid = user?.id;
    if (!uid) return;

    // Check for existing DM
    const { data: myMemberships } = await db
      .from('chat_conversation_members')
      .select('conversation_id, chat_conversations:conversation_id(id,kind)')
      .eq('user_id', uid);

    for (const row of (myMemberships ?? []) as any[]) {
      const conv = Array.isArray(row.chat_conversations) ? row.chat_conversations[0] : row.chat_conversations;
      if (!conv || conv.kind !== 'dm') continue;
      const { data: match } = await db
        .from('chat_conversation_members')
        .select('conversation_id')
        .eq('conversation_id', conv.id)
        .eq('user_id', partnerId)
        .maybeSingle();
      if (match) {
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
        handleSelectConversation(conv.id);
        return;
      }
    }

    // Create new DM
    const { data: newConv } = await db
      .from('chat_conversations')
      .insert({ kind: 'dm', title: partnerName })
      .select('id')
      .single();
    if (!newConv) return;
    await db.from('chat_conversation_members').insert([
      { conversation_id: (newConv as any).id, user_id: uid },
      { conversation_id: (newConv as any).id, user_id: partnerId },
    ]);
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    handleSelectConversation((newConv as any).id);
  };

  return (
    <>
    {showNewConvModal && (
      <NewConversationModal
        onClose={() => setShowNewConvModal(false)}
        onCreated={handleConversationCreated}
      />
    )}
    <ChatShell
      shell={shell}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={() => setShowNewConvModal(true)}
      onOpenConversation={handleOpenConversation}
      onUnreadActivity={setUnreadActivity}
      onStartDM={handleStartDM}
      userName={userName}
      userAvatarUrl={userAvatarUrl}
      unreadDMs={unreadDMs}
      unreadActivity={unreadActivity}
    >
      {/* Column 3: main conversation feed */}
      <main
        className="c-chat-main"
        aria-label="Conversation"
        style={isLoading ? { opacity: 0.6 } : undefined}
      >
        {!activeConversationId ? (
          <div className="c-feed__welcome">
            <div className="c-feed__welcome__icon" aria-hidden="true">💬</div>
            <p className="c-feed__welcome__title">Select a conversation</p>
            <p className="c-feed__welcome__sub">
              Choose from the sidebar to start messaging, or create a new conversation.
            </p>
          </div>
        ) : (
          <MessageFeed
            conversationId={activeConversationId}
            initialMessageId={pendingMessageId}
            conversation={
              conversations.find(c => c.id === activeConversationId) ?? {
                id: activeConversationId,
                kind: 'channel' as const,
                ticketKey: null,
                ticketType: null,
                projectKey: null,
                projectName: null,
                title: 'Conversation',
                isArchived: false,
                lastMessageAt: null,
                lastMessagePreview: null,
                unreadCount: 0,
              }
            }
            onOpenThread={shell.openThread}
          />
        )}
      </main>

      {/* Column 4: thread pane */}
      {shell.threadMessageId && activeConversationId && (
        <ThreadPane
          conversationId={activeConversationId}
          parentMessageId={shell.threadMessageId}
          threadMode={shell.threadMode}
          onClose={shell.closeThread}
        />
      )}
    </ChatShell>
    </>
  );
}

export function ChatFullScreen() {
  return (
    <ChatRealtimeProvider>
      <ChatFullScreenInner />
    </ChatRealtimeProvider>
  );
}
