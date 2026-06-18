import React from 'react';
import { RailItem } from './RailItem';
import { RailFooter } from './RailFooter';
import { RailHoverPreview } from './RailHoverPreview';
import {
  BellIcon,
  BookmarkIcon,
  DmsIcon,
  HomeIcon,
} from '../shared/Icon';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import type { ChatTheme } from '../../hooks/useChatTheme';
import type { ChatView } from '@/features/chat/hooks/useShellState';

interface WorkspaceRailProps {
  activeView: ChatView;
  onNavigate: (view: ChatView) => void;
  unreadDMs: number;
  unreadActivity: number;
  theme: ChatTheme;
  onToggleTheme: () => void;
  onCreate: () => void;
  userName: string;
  userAvatarUrl: string | null;
  workspaceInitial?: string;
}

export function WorkspaceRail({
  activeView,
  onNavigate,
  unreadDMs,
  unreadActivity,
  theme,
  onToggleTheme,
  onCreate,
  userName,
  userAvatarUrl,
  workspaceInitial = 'C',
}: WorkspaceRailProps) {
  // Pulled regardless of view — react-query dedupes the underlying request so
  // there's no extra round trip when the Activity panel is also mounted.
  const isOnActivity = activeView === 'activity';
  const { items: activityItems } = useActivityFeed();

  return (
    <aside
      aria-label="Workspace navigation"
      style={{
        gridArea: 'rail',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'var(--cv2-bg-rail)',
        borderRight: '1px solid var(--cv2-border)',
        padding: '12px 0 0',
        gap: 6,
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--cv2-accent)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--cv2-font)',
          fontSize: 22,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        {workspaceInitial}
      </div>
      <RailItem
        icon={<HomeIcon size={20} />}
        label="Home"
        active={activeView === 'chat'}
        onClick={() => onNavigate('chat')}
      />
      <RailItem
        icon={<DmsIcon size={20} />}
        label="DMs"
        active={activeView === 'dms'}
        badgeCount={unreadDMs}
        onClick={() => onNavigate('dms')}
      />
      <RailItem
        icon={<BellIcon size={20} />}
        label="Activity"
        active={isOnActivity}
        badgeCount={unreadActivity}
        onClick={() => onNavigate('activity')}
        renderHoverPreview={isOnActivity ? undefined : (anchorRect, { dismiss, cancelClose, scheduleClose }) => (
          <RailHoverPreview
            anchorRect={anchorRect}
            items={activityItems}
            totalUnread={unreadActivity}
            title="Activity"
            onOpen={() => { dismiss(); onNavigate('activity'); }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          />
        )}
      />
      <RailItem
        icon={<BookmarkIcon size={20} />}
        label="Later"
        active={activeView === 'later'}
        onClick={() => onNavigate('later')}
      />
      <div style={{ flex: 1 }} />
      <RailFooter
        theme={theme}
        onToggleTheme={onToggleTheme}
        onCreate={onCreate}
        userName={userName}
        userAvatarUrl={userAvatarUrl}
      />
    </aside>
  );
}
