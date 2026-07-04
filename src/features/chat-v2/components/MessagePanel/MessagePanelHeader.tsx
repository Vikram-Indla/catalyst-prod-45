import React, { useState } from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { IconButton } from '../shared/IconButton';
import {
  BellIcon,
  BellOffIcon,
  ChevronDownIcon,
  DmsIcon,
  HeadphonesIcon,
  PinIcon,
  StarIcon,
  SummarizeIcon,
  XIcon,
} from '../shared/Icon';
import { createPortal } from 'react-dom';
import { SummarizeMenu, type SummarizePreset } from '../Summarize/SummarizeMenu';
import { useChatSetMute, useChatSetNotificationPref } from '@/hooks/chat/useChatActions';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { ChatConversation } from '@/types/chat';

export type PanelTab = 'messages' | 'pins';

interface MessagePanelHeaderProps {
  conversation: ChatConversation;
  activeTab: PanelTab;
  pinCount?: number;
  onTabChange: (tab: PanelTab) => void;
  onToggleStar?: () => void;
  /** Triggered when the user picks a preset from the summarize menu. */
  onSummarize?: (preset: SummarizePreset) => void;
  onClose?: () => void;
  /** Called when the user clicks the headphone (huddle) button. */
  onStartHuddle?: () => void;
  /** When true, tints the huddle button to indicate an active huddle. */
  huddleActive?: boolean;
}

export function MessagePanelHeader({
  conversation,
  activeTab,
  pinCount = 0,
  onTabChange,
  onToggleStar,
  onSummarize,
  onClose,
  onStartHuddle,
  huddleActive,
}: MessagePanelHeaderProps) {
  const isStarred = !!conversation.isStarred;
  // Notifications: bell opens a Slack-style menu (All / Mentions / Nothing +
  // Mute). Pref persists via chat_set_notification_pref, mute via
  // chat_set_mute; both hooks invalidate the conversations cache.
  const muted = !!conversation.isMuted;
  const pref = conversation.notificationPref ?? 'all';
  const setMuteMut = useChatSetMute();
  const setPrefMut = useChatSetNotificationPref();
  const [notifAnchor, setNotifAnchor] = useState<DOMRect | null>(null);
  // Summarize menu anchored to the SummarizeIcon trigger.
  const [summarizeAnchor, setSummarizeAnchor] = useState<DOMRect | null>(null);
  const openSummarize = (e: React.MouseEvent<HTMLButtonElement>) => {
    setSummarizeAnchor(e.currentTarget.getBoundingClientRect());
  };
  const closeSummarize = () => setSummarizeAnchor(null);
  const pickSummarize = (preset: SummarizePreset) => {
    closeSummarize();
    onSummarize?.(preset);
  };
  return (
    <header
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid var(--cv2-border)',
        background: 'var(--cv2-bg-panel)',
      }}
    >
    <div
      style={{
        height: 'var(--cv2-header-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        // Right padding reserves room for the floating MinimizeButton
        // anchored at top:8 / right:12 of the chat shell (28px wide).
        padding: '0 52px 0 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <button
          type="button"
          onClick={onToggleStar}
          aria-pressed={isStarred}
          aria-label={isStarred ? 'Unstar conversation' : 'Star conversation'}
          style={{
            width: 28,
            height: 28,
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--cv2-radius-sm)',
            color: isStarred ? 'var(--cv2-accent)' : 'var(--cv2-text-subtle)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <StarIcon size={16} fill={isStarred ? 'currentColor' : 'none'} />
        </button>
        <PresenceAvatar
          name={conversation.kind === 'ticket' && conversation.assigneeName
            ? conversation.assigneeName
            : conversation.title}
          size={24}
          presence={null}
        />
        <button
          type="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            border: 'none',
            color: 'var(--cv2-text-strong)',
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body-large)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 'var(--cv2-radius-sm)',
            maxWidth: 360,
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conversation.title}
          </span>
          <ChevronDownIcon size={14} />
        </button>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {onStartHuddle && (
          <IconButton
            label={huddleActive ? 'Join huddle' : 'Start huddle'}
            onClick={onStartHuddle}
            size="md"
            active={huddleActive}
          >
            <HeadphonesIcon size={16} />
          </IconButton>
        )}
        <IconButton
          label="Notification preferences"
          onClick={e => setNotifAnchor((e.currentTarget as HTMLElement).getBoundingClientRect())}
          size="md"
          active={muted || !!notifAnchor}
        >
          {muted || pref === 'none' ? <BellOffIcon size={16} /> : <BellIcon size={16} />}
        </IconButton>
        <IconButton
          label="Summarize conversation"
          onClick={openSummarize}
          size="md"
          active={!!summarizeAnchor}
        >
          <SummarizeIcon size={16} />
        </IconButton>
        {onClose && (
          <IconButton label="Close conversation" onClick={onClose} size="md">
            <XIcon size={16} />
          </IconButton>
        )}
      </div>
      </div>
      <div
        role="tablist"
        aria-label="Conversation views"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 12px',
          borderTop: '1px solid var(--cv2-divider)',
        }}
      >
        <PanelTabBtn
          active={activeTab === 'messages'}
          onClick={() => onTabChange('messages')}
          icon={<DmsIcon size={14} />}
        >
          Messages
        </PanelTabBtn>
        <PanelTabBtn
          active={activeTab === 'pins'}
          onClick={() => onTabChange('pins')}
          icon={<PinIcon size={14} />}
        >
          Pins{pinCount > 0 ? ` (${pinCount})` : ''}
        </PanelTabBtn>
      </div>
      {summarizeAnchor && (
        <SummarizeMenu
          anchorRect={summarizeAnchor}
          onSelect={pickSummarize}
          onClose={closeSummarize}
        />
      )}
      {notifAnchor && (
        <NotificationMenu
          anchorRect={notifAnchor}
          pref={pref}
          muted={muted}
          onPickPref={p => {
            setPrefMut.mutate({ convId: conversation.id, pref: p });
            setNotifAnchor(null);
          }}
          onToggleMute={() => {
            setMuteMut.mutate({ convId: conversation.id, muted: !muted });
            setNotifAnchor(null);
          }}
          onClose={() => setNotifAnchor(null)}
        />
      )}
    </header>
  );
}

const NOTIF_OPTIONS: Array<{ id: 'all' | 'mentions' | 'none'; label: string; hint: string }> = [
  { id: 'all', label: 'All new messages', hint: 'Every message in this conversation' },
  { id: 'mentions', label: 'Mentions only', hint: '@you, @here and @channel' },
  { id: 'none', label: 'Nothing', hint: 'No notifications for this conversation' },
];

function NotificationMenu({
  anchorRect,
  pref,
  muted,
  onPickPref,
  onToggleMute,
  onClose,
}: {
  anchorRect: DOMRect;
  pref: 'all' | 'mentions' | 'none';
  muted: boolean;
  onPickPref: (p: 'all' | 'mentions' | 'none') => void;
  onToggleMute: () => void;
  onClose: () => void;
}) {
  const trapRef = useFocusTrap<HTMLDivElement>();
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!trapRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose, trapRef]);

  const MENU_W = 300;
  const left = Math.min(Math.max(12, anchorRect.right - MENU_W), window.innerWidth - MENU_W - 12);
  const top = anchorRect.bottom + 6;

  return createPortal(
    <div
      ref={trapRef}
      role="menu"
      aria-label="Notification preferences"
      style={{
        position: 'fixed',
        top,
        left,
        width: MENU_W,
        background: 'var(--cv2-bg-modal)',
        border: '1px solid var(--cv2-border-strong)',
        borderRadius: 'var(--cv2-radius-md)',
        boxShadow: 'var(--cv2-shadow-modal)',
        padding: 'var(--ds-space-050) 0',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        zIndex: 'var(--cv2-popover-z, 1100)' as unknown as number,
      }}
    >
      <div
        style={{
          padding: 'var(--ds-space-075) 14px var(--ds-space-050)',
          font: 'var(--ds-font-body-small)',
          fontWeight: 700,
          color: 'var(--cv2-text-muted)',
        }}
      >
        Notify me about…
      </div>
      {NOTIF_OPTIONS.map(opt => (
        <button
          key={opt.id}
          type="button"
          role="menuitemradio"
          aria-checked={pref === opt.id}
          onClick={() => onPickPref(opt.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 'var(--ds-space-025)',
            width: '100%',
            padding: 'var(--ds-space-075) 14px',
            background: 'transparent',
            color: 'var(--cv2-text)',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-space-100)', font: 'var(--ds-font-body)', fontWeight: pref === opt.id ? 700 : 400 }}>
            <span aria-hidden="true" style={{ width: 16, display: 'inline-flex', color: 'var(--cv2-accent)' }}>
              {pref === opt.id ? '✓' : ''}
            </span>
            {opt.label}
          </span>
          <span style={{ paddingLeft: 24, font: 'var(--ds-font-body-small)', color: 'var(--cv2-text-muted)' }}>
            {opt.hint}
          </span>
        </button>
      ))}
      <div aria-hidden="true" style={{ height: 1, margin: 'var(--ds-space-050) 0', background: 'var(--cv2-divider)' }} />
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={muted}
        onClick={onToggleMute}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--ds-space-100)',
          width: '100%',
          padding: 'var(--ds-space-075) 14px',
          background: 'transparent',
          color: 'var(--cv2-text)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          font: 'var(--ds-font-body)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <BellOffIcon size={16} />
        {muted ? 'Unmute conversation' : 'Mute conversation'}
      </button>
    </div>,
    document.body,
  );
}

function PanelTabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 'var(--cv2-tabs-h, 40px)',
        padding: '0 10px',
        background: 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        borderBottom: active ? '2px solid var(--cv2-accent)' : '2px solid transparent',
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        font: 'var(--ds-font-body)',
        fontWeight: active ? 700 : 500,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
