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
import { SummarizeMenu, type SummarizePreset } from '../Summarize/SummarizeMenu';
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
  // Notifications toggle is local UI state — clicking the bell swaps to a
  // muted bell icon and back. Persistence to the server can be wired later.
  const [muted, setMuted] = useState(false);
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
            color: isStarred ? '#E8A87C' : 'var(--cv2-text-subtle)',
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
            fontSize: 'var(--ds-font-size-500)',
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
          label={muted ? 'Unmute notifications' : 'Mute notifications'}
          onClick={() => setMuted(v => !v)}
          size="md"
        >
          {muted ? <BellOffIcon size={16} /> : <BellIcon size={16} />}
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
    </header>
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
        gap: 6,
        height: 'var(--cv2-tabs-h, 40px)',
        padding: '0 10px',
        background: 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        borderBottom: active ? '2px solid var(--cv2-accent)' : '2px solid transparent',
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: active ? 700 : 500,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
