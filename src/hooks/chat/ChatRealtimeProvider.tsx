/**
 * ChatRealtimeProvider — exposes the singleton {@link chatRealtime} manager via
 * React context so chat hooks/components can consume it without importing the
 * module directly (keeps the connection swappable in tests).
 */
import React, { createContext, useContext } from 'react';
import { chatRealtime, type ChatRealtimeManager } from '@/lib/chat/ChatRealtimeManager';

const ChatRealtimeContext = createContext<ChatRealtimeManager>(chatRealtime);

export function ChatRealtimeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChatRealtimeContext.Provider value={chatRealtime}>
      {children}
    </ChatRealtimeContext.Provider>
  );
}

export function useChatRealtime(): ChatRealtimeManager {
  return useContext(ChatRealtimeContext);
}
