import React, { useState } from 'react';
import { ChatRealtimeProvider } from '@/hooks/chat/ChatRealtimeProvider';
import { ChatMainView } from '@/components/chat/ChatMainView';

/**
 * ChatPage — full-page host for Catalyst Chat (Window 1, the main chat view).
 * Wraps the view in the ChatRealtimeProvider so the single multiplexed
 * realtime connection is available to all child surfaces.
 */
export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<
    string | undefined
  >(undefined);

  return (
    <ChatRealtimeProvider>
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flex: 1, background: 'var(--ds-surface, #FFFFFF)' }}>
        <ChatMainView
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
        />
      </div>
    </ChatRealtimeProvider>
  );
}
