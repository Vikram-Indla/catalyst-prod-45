/**
 * ChatMainView — the 3-pane Catalyst Chat main window (Slack-style):
 *   A) IconRail (72px)        — DMs / Channels / Threads / Mentions / Saved + Caty AI
 *   B) ConversationList (300) — Channels / Tickets / Direct messages / Archived
 *   C) Conversation pane      — header + canonical CommentThread (composer + feed)
 *
 * The active-conversation pane mounts the generic catalyst-ds CommentThread,
 * fed by the chat→CDS adapter (chatToCds). This single reuse delivers
 * reactions, edit, delete, @mentions, the rich composer, emoji, AI improve and
 * quick replies without any chat-specific UI.
 *
 * Real data comes from useConversations() and useMessages(conversationId).
 * The component is a controlled/uncontrolled hybrid: it accepts an
 * activeConversationId + onSelectConversation, and falls back to local
 * selection state when those props are omitted.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useConversations } from '@/hooks/chat/useConversations';
import { useMessages } from '@/hooks/chat/useMessages';
import { useChatMessageActions } from '@/hooks/chat/useChatMessageActions';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useTypingIndicator } from '@/hooks/chat/useTypingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CommentThread } from '@/components/catalyst-ds';
import type { CdsUser } from '@/components/catalyst-ds';
import { chatMessageToCds, chatPersonToCds } from '@/lib/chat/chatToCds';
import { IconRail, type RailKey } from './main/IconRail';
import { ConversationList } from './main/ConversationList';
import { ConversationHeader } from './main/ConversationHeader';
// ads-scanner:ignore-next-line -- chat.css uses only ADS tokens (no hardcoded values); shared layout styles
import './chat.css';

const db = supabase as unknown as { from: (table: string) => any };

export interface ChatMainViewProps {
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
}

export function ChatMainView({ activeConversationId, onSelectConversation }: ChatMainViewProps) {
  const [railKey, setRailKey] = useState<RailKey>('dms');
  const [localActiveId, setLocalActiveId] = useState<string | undefined>(undefined);

  const { user } = useAuth();
  const { conversations, isLoading: conversationsLoading } = useConversations();

  // Resolve the active conversation: controlled prop wins, then local state,
  // then the first available conversation as a graceful default.
  const resolvedActiveId =
    activeConversationId ??
    localActiveId ??
    conversations.find(c => !c.isArchived)?.id;

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === resolvedActiveId) ?? null,
    [conversations, resolvedActiveId],
  );

  const { messages, isLoading: messagesLoading, sendMessage } = useMessages(
    resolvedActiveId ?? null,
  );
  const { toggleReaction, editMessage, deleteMessage } = useChatMessageActions(
    resolvedActiveId ?? null,
  );
  const { typingNames } = useTypingIndicator(resolvedActiveId ?? null);
  const { groups } = useChatPeople();

  const currentUser: CdsUser | undefined = user
    ? {
        id: user.id,
        name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.email as string | undefined) ??
          'You',
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        email: user.email ?? undefined,
      }
    : undefined;

  const cdsComments = useMemo(() => messages.map(chatMessageToCds), [messages]);
  const mentionableUsers = useMemo<CdsUser[]>(
    () => groups.flatMap(g => g.people).map(chatPersonToCds),
    [groups],
  );

  // Mark the conversation as read when it opens: clear unread by stamping
  // last_read_at for (conversation, current user).
  useEffect(() => {
    if (!resolvedActiveId || !user?.id) return;
    void db
      .from('chat_conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', resolvedActiveId)
      .eq('user_id', user.id);
  }, [resolvedActiveId, user?.id]);

  const handleSelect = (id: string) => {
    if (onSelectConversation) onSelectConversation(id);
    else setLocalActiveId(id);
  };

  return (
    <div className="cc-main">
      <IconRail activeKey={railKey} onSelect={setRailKey} />

      <ConversationList
        conversations={conversations}
        isLoading={conversationsLoading}
        activeConversationId={resolvedActiveId}
        onSelectConversation={handleSelect}
      />

      <div className="cc-conv">
        <ConversationHeader conversation={activeConversation} />

        {typingNames.length > 0 && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--ds-text-subtlest, #6B778C)',
              padding: '4px 16px',
            }}
          >
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}

        <div className="cc-conv-thread" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>
          <CommentThread
            comments={cdsComments}
            currentUser={currentUser}
            mentionableUsers={mentionableUsers}
            sortOrder="oldest"
            onAddComment={content => sendMessage(content)}
            onEditComment={editMessage}
            onDeleteComment={deleteMessage}
            onToggleReaction={toggleReaction}
            issueKey={activeConversation?.ticketKey ?? undefined}
            isLoading={messagesLoading}
            emptyMessage="No messages yet — start the conversation."
          />
        </div>
      </div>
    </div>
  );
}

export default ChatMainView;
