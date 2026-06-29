/**
 * ChatNavRail — first of two left sidebars in chat-v2.
 *
 * Mounts at the leftmost grid column, sits to the LEFT of the conversations
 * sidebar (Sidebar.tsx). Contains the four chat views (Home / DMs / Activity /
 * Saved).
 *
 * Collapse is driven by the global Catalyst sidebar state — the CatalystHeader
 * chevron and the `⌘[` shortcut both toggle this rail.
 * - Expanded: ~220px wide, icon + label
 * - Collapsed: 56px wide, icon only
 */
import React from 'react';
import {
  BellIcon,
  BookmarkIcon,
  DmsIcon,
  HomeIcon,
} from '../shared/Icon';
import type { ChatView } from '@/features/chat/hooks/useShellState';

interface ChatNavRailProps {
  activeView: ChatView;
  onNavigate: (view: ChatView) => void;
  unreadDMs: number;
  unreadActivity: number;
  collapsed: boolean;
}

export function ChatNavRail({
  activeView,
  onNavigate,
  unreadDMs,
  unreadActivity,
  collapsed,
}: ChatNavRailProps) {
  return (
    <aside
      aria-label="Chat navigation"
      style={{
        gridArea: 'navrail',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-sidebar)',
        borderRight: '1px solid var(--cv2-border)',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          padding: collapsed ? '12px 6px' : '12px 8px',
        }}
      >
        <NavRow
          icon={<HomeIcon size={16} />}
          label="Home"
          active={activeView === 'chat'}
          collapsed={collapsed}
          onClick={() => onNavigate('chat')}
        />
        <NavRow
          icon={<DmsIcon size={16} />}
          label="DMs"
          active={activeView === 'dms'}
          badgeCount={unreadDMs}
          collapsed={collapsed}
          onClick={() => onNavigate('dms')}
        />
        <NavRow
          icon={<BellIcon size={16} />}
          label="Activity"
          active={activeView === 'activity'}
          badgeCount={unreadActivity}
          collapsed={collapsed}
          onClick={() => onNavigate('activity')}
        />
        <NavRow
          icon={<BookmarkIcon size={16} />}
          label="Saved"
          active={activeView === 'later'}
          collapsed={collapsed}
          onClick={() => onNavigate('later')}
        />
      </div>
    </aside>
  );
}

function NavRow({
  icon,
  label,
  active,
  badgeCount = 0,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badgeCount?: number;
  collapsed: boolean;
  onClick: () => void;
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        title={label}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          margin: '0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--cv2-radius-md)',
          background: active ? 'var(--cv2-bg-row-active, var(--cv2-bg-row-hover))' : 'transparent',
          border: 'none',
          color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
          cursor: 'pointer',
          transition: 'background var(--cv2-transition-fast)',
        }}
        onMouseEnter={e => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
        }}
        onMouseLeave={e => {
          if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {icon}
        {badgeCount > 0 && (
          <span
            aria-label={`${badgeCount} unread`}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 14,
              height: 14,
              padding: '0 4px',
              borderRadius: 7,
              background: 'var(--cv2-unread)',
              color: 'var(--ds-text-inverse)',
              font: 'var(--ds-font-body-small)',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        minHeight: 40,
        padding: '4px 12px',
        background: active ? 'var(--cv2-bg-row-active, var(--cv2-bg-row-hover))' : 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--cp-font-body)',
        font: 'var(--ds-font-body)',
        fontWeight: active ? 600 : 500,
        lineHeight: 1,
        letterSpacing: '0',
        color: active ? 'var(--cp-text-link, var(--cp-primary-60))' : 'var(--cp-text-secondary)',
        borderRadius: '4px',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 4,
            bottom: 4,
            width: 3,
            background: 'var(--ds-text-brand)',
            borderRadius: '0 3px 3px 0',
          }}
        />
      )}
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {badgeCount > 0 && (
        <span
          aria-label={`${badgeCount} unread`}
          style={{
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 8,
            background: 'var(--cv2-unread)',
            color: 'var(--ds-text-inverse)',
            font: 'var(--ds-font-body-small)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            flex: '0 0 auto',
          }}
        >
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}
    </button>
  );
}
