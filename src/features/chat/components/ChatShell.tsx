import React from 'react';
import type { ChatConversation } from '@/types/chat';
import type { ShellState, ShellActions } from '../hooks/useShellState';
import { AppRail } from './AppRail';
import { ConversationSidebar } from './sidebar/ConversationSidebar';
import { ActivitySurface } from './activity/ActivitySurface';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './chat-shell.css';

interface ChatShellProps {
  shell: ShellState & ShellActions;
  conversations: ChatConversation[];
  activeConversationId: string | undefined;
  onSelectConversation: (id: string) => void;
  onNewConversation?: () => void;
  userName: string;
  userAvatarUrl: string | null;
  /** Unread DM count for rail badge */
  unreadDMs: number;
  /** Unread activity count for rail badge */
  unreadActivity: number;
  /** Called when user clicks an activity item — navigates to the conversation */
  onOpenConversation: (conversationId: string, messageId?: string) => void;
  /** Main feed + thread content — injected by ChatFullScreen */
  children?: React.ReactNode;
}

export function ChatShell({
  shell,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  userName,
  userAvatarUrl,
  unreadDMs,
  unreadActivity,
  onOpenConversation,
  children,
}: ChatShellProps) {
  const {
    sidebarCollapsed,
    threadMode,
    activeView,
    toggleSidebar,
    setActiveView,
  } = shell;

  return (
    <div
      className="c-chat-shell"
      data-sidebar-collapsed={String(sidebarCollapsed)}
      data-thread-mode={threadMode}
      data-view={activeView}
    >
      {/* Column 1: App rail */}
      <AppRail
        activeView={activeView}
        onNavigate={setActiveView}
        unreadDMs={unreadDMs}
        unreadActivity={unreadActivity}
        userName={userName}
        userAvatarUrl={userAvatarUrl}
      />

      {/* Column 2: Conversation sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={onSelectConversation}
        onNewConversation={onNewConversation}
        onToggleCollapse={toggleSidebar}
        isCollapsed={sidebarCollapsed}
      />

      {/* Column 3: activity surface (shown when activeView === 'activity') */}
      <ActivitySurface onOpenConversation={onOpenConversation} />

      {/* Columns 3 (+ 4 when docked): feed + thread — provided by parent */}
      {children}
    </div>
  );
}
