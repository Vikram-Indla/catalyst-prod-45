import React from 'react';
import type { ChatConversation } from '@/types/chat';
import type { ShellState, ShellActions } from '../hooks/useShellState';
import { AppRail } from './AppRail';
import { ConversationSidebar } from './sidebar/ConversationSidebar';
import { ActivitySurface } from './activity/ActivitySurface';
import { PeopleSurface } from './people/PeopleSurface';
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
  /** Called when the unread activity count changes (to update AppRail badge) */
  onUnreadActivity?: (count: number) => void;
  /** Called when user initiates a DM from the People surface */
  onStartDM: (userId: string, userName: string) => void;
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
  onUnreadActivity,
  onStartDM,
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
        activeView={activeView}
      />

      {/* Column 3: activity surface (shown when activeView === 'activity') */}
      <ActivitySurface
        onOpenConversation={onOpenConversation}
        onUnreadCount={onUnreadActivity}
        isActive={activeView === 'activity'}
      />

      {/* Column 3: people surface (shown when activeView === 'people') */}
      <PeopleSurface onStartDM={onStartDM} />

      {/* Columns 3 (+ 4 when docked): feed + thread — provided by parent */}
      {children}

      {/* Later placeholder — bookmark saving requires hover-toolbar + DB (not in scope) */}
      <div className="c-chat-placeholder" data-surface="later" aria-label="Later">
        <span>📌</span>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--c-chat-text)' }}>
          Saved for later
        </p>
        <p style={{ margin: 0, fontSize: 13, textAlign: 'center', maxWidth: 280, color: 'var(--c-chat-text-subtlest)' }}>
          Hover a message and click <strong>Save</strong> to bookmark it here.
          Coming soon.
        </p>
      </div>
    </div>
  );
}
