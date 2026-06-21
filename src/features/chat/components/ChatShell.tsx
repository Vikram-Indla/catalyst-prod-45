import React, { useMemo } from 'react';
import type { ChatConversation } from '@/types/chat';
import type { ShellState, ShellActions } from '../hooks/useShellState';
import { AppRail } from './AppRail';
import { ConversationSidebar } from './sidebar/ConversationSidebar';
import { ActivitySurface } from './activity/ActivitySurface';
import { LaterSurface } from './later/LaterSurface';
import { PeopleSurface } from './people/PeopleSurface';
// ads-scanner:ignore-next-line -- CSS file uses only var(--c-chat-*) tokens
import './chat-shell.css';

interface ChatShellProps {
  shell: ShellState & ShellActions;
  conversations: ChatConversation[];
  activeConversationId: string | undefined;
  onSelectConversation: (id: string) => void;
  onNewConversation?: () => void;
  onOpenConversation: (conversationId: string, messageId?: string) => void;
  onUnreadActivity?: (count: number) => void;
  onStartDM: (userId: string, userName: string) => void;
  unreadActivity: number;
  userName: string;
  userAvatarUrl: string | null;
  children?: React.ReactNode;
}

export function ChatShell({
  shell,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onOpenConversation,
  onUnreadActivity,
  onStartDM,
  unreadActivity,
  userName,
  userAvatarUrl,
  children,
}: ChatShellProps) {
  const {
    sidebarCollapsed,
    threadMode,
    activeView,
    toggleSidebar,
    setActiveView,
  } = shell;

  const unreadDMs = useMemo(
    () => conversations.filter(c => (c.kind === 'dm' || c.kind === 'group_dm') && c.unreadCount > 0).length,
    [conversations],
  );

  return (
    <div
      className="c-chat-shell"
      data-sidebar-collapsed={String(sidebarCollapsed)}
      data-thread-mode={threadMode}
      data-view={activeView}
    >
      {/* Column 1: App rail — nav between views */}
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
        onNewChannel={() => onNewConversation?.()}
        onNewDM={() => onNewConversation?.()}
      />

      {/* Column 3: activity surface (shown when activeView === 'activity') */}
      <ActivitySurface
        onOpenConversation={onOpenConversation}
        onUnreadCount={onUnreadActivity}
        isActive={activeView === 'activity'}
      />

      {/* Column 3: people surface (shown when activeView === 'people') */}
      <PeopleSurface onStartDM={onStartDM} />

      {/* Column 3: later surface (shown when activeView === 'later') */}
      <LaterSurface
        onOpenConversation={onOpenConversation}
        isActive={activeView === 'later'}
      />

      {/* Columns 3 (+ 4 when docked): feed + thread — provided by parent */}
      {children}
    </div>
  );
}
