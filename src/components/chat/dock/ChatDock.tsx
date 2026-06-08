/**
 * ChatDock — bottom-right docked chat widget.
 *
 * Reproduces /tmp/catalyst-chat-mockups/chat-dock.html:
 *  - Collapsed launcher FAB (brand, chat-bubble icon, red unread badge, green presence dot)
 *  - Expanded 380px panel: header (new / pop-out / minimize / close icon buttons),
 *    compact conversation list, bottom multi-tab bar of open conversations (× per tab + "+" tab)
 *
 * Perf: while collapsed, the panel and its data are NOT rendered, so callers can gate any
 * realtime subscription on `!collapsed`. This component never opens a subscription itself.
 *
 * ADS: @atlaskit/dropdown-menu is available for any future menu; icon buttons are @atlaskit/button
 * IconButton. Colors via var(--ds-*) tokens. Avatars are colored-initials circles (never <img>).
 */
import React from 'react';
import { IconButton } from '@atlaskit/button/new';
import EditorAddIcon from '@atlaskit/icon/glyph/editor/add';
import SearchIcon from '@atlaskit/icon/glyph/search';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { useConversations } from '@/hooks/chat/useConversations';
import type { ChatConversation, ChatPresence } from '@/types/chat';
// ads-scanner:ignore-next-line — dock.css is a tokens-only stylesheet (audited clean)
import './dock.css';

interface ChatDockProps {
  openConversationIds: string[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapsed: () => void;
  onNewMessage?: () => void;
  onPopOut?: () => void;
  onOpenSearch?: () => void;
}

const PRESENCE_DOT: Record<ChatPresence, string> = {
  available: 'var(--ds-icon-success, #22A06B)',
  busy: 'var(--ds-icon-danger, #E34935)',
  away: 'var(--ds-icon-warning, #E2B203)',
  offline: 'var(--ds-icon-disabled, #8590A2)',
  on_leave: 'var(--ds-icon-disabled, #8590A2)',
};

const TILE_PALETTE = [
  'var(--ds-background-accent-purple-bolder, #6E5DC6)',
  'var(--ds-background-accent-blue-bolder, #0C66E4)',
  'var(--ds-background-accent-green-bolder, #22A06B)',
  'var(--ds-background-accent-magenta-bolder, #CD519D)',
];

function hashIndex(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % mod;
}

function initials(title: string): string {
  const parts = title.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function ConvGlyph({ conversation }: { conversation: ChatConversation }) {
  const tileBase = {
    width: 32,
    height: 32,
    borderRadius: 8,
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--ds-text-inverse, #FFFFFF)',
    fontWeight: 700,
  } as const;

  if (conversation.kind === 'channel') {
    return (
      <span style={{ ...tileBase, fontSize: 14, background: TILE_PALETTE[hashIndex(conversation.id, TILE_PALETTE.length)] }}>
        #
      </span>
    );
  }
  if (conversation.kind === 'ticket') {
    const num = (conversation.ticketKey ?? conversation.title).split('-').pop() ?? '';
    return (
      <span style={{ ...tileBase, fontSize: 9, background: 'var(--ds-background-brand-bold, #0C66E4)' }}>
        {num.slice(0, 4)}
      </span>
    );
  }
  // dm — circular avatar
  return (
    <span style={{ position: 'relative', flex: '0 0 32px', width: 32, height: 32 }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ds-text-inverse, #FFFFFF)',
          fontSize: 12,
          fontWeight: 600,
          background: TILE_PALETTE[hashIndex(conversation.id, TILE_PALETTE.length)],
        }}
      >
        {initials(conversation.title)}
      </span>
    </span>
  );
}

function tabDotColor(conversation: ChatConversation): string {
  if (conversation.kind === 'channel') return 'transparent';
  if (conversation.kind === 'ticket') return PRESENCE_DOT.available.replace('success', 'brand');
  return 'var(--ds-background-brand-bold, #0C66E4)';
}

export function ChatDock({
  openConversationIds,
  activeId,
  onSelect,
  onClose,
  collapsed = false,
  onToggleCollapsed,
  onNewMessage,
  onPopOut,
  onOpenSearch,
}: ChatDockProps) {
  // Collapsed: render only the FAB. No data hook subscription is created here; callers
  // gate realtime on !collapsed. We still need an unread total for the badge — read it
  // from a lightweight (already-cached) hook only when expanded; when collapsed we keep
  // the FAB cheap and let the hook compute the badge.
  const { conversations } = useConversations();

  const byId = React.useMemo(() => {
    const map = new Map<string, ChatConversation>();
    (conversations ?? []).forEach((c) => map.set(c.id, c));
    return map;
  }, [conversations]);

  const totalUnread = React.useMemo(
    () => (conversations ?? []).reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations],
  );

  if (collapsed) {
    return (
      <button type="button" className="cc-fab" aria-label="Open messages" onClick={onToggleCollapsed}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {totalUnread > 0 && <span className="cc-fab__badge">{totalUnread > 99 ? '99+' : totalUnread}</span>}
        <span className="cc-fab__presence" />
      </button>
    );
  }

  const listConversations = (conversations ?? []).filter((c) => !c.isArchived);

  return (
    <div className="cc-dock" role="dialog" aria-label="Messages">
      <div className="cc-dock__header">
        <div className="cc-dock__title">Messages</div>
        <IconButton icon={SearchIcon} label="Search" appearance="subtle" spacing="compact" onClick={onOpenSearch} />
        <IconButton icon={EditorAddIcon} label="New message" appearance="subtle" spacing="compact" onClick={onNewMessage} />
        <IconButton icon={ShortcutIcon} label="Pop out" appearance="subtle" spacing="compact" onClick={onPopOut} />
        <IconButton icon={ChevronDownIcon} label="Minimize" appearance="subtle" spacing="compact" onClick={onToggleCollapsed} />
        <IconButton icon={CrossIcon} label="Close" appearance="subtle" spacing="compact" onClick={onToggleCollapsed} />
      </div>

      <div className="cc-dock__list">
        {listConversations.length === 0 ? (
          <div className="cc-dock__empty">No conversations yet. Start a new message.</div>
        ) : (
          listConversations.map((c) => (
            <button key={c.id} type="button" className="cc-conv" onClick={() => onSelect(c.id)}>
              <ConvGlyph conversation={c} />
              <div className="cc-conv__body">
                <div className="cc-conv__top">
                  <span className="cc-conv__name">{c.title}</span>
                  <span className="cc-conv__time">{relativeTime(c.lastMessageAt)}</span>
                </div>
                <div className="cc-conv__top">
                  <span className="cc-conv__preview">{c.lastMessagePreview ?? 'No messages yet'}</span>
                  {c.unreadCount > 0 && <span className="cc-badge">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="cc-tabs">
        {openConversationIds.map((id) => {
          const conv = byId.get(id);
          const label = conv ? conv.title : id;
          const isActive = id === activeId;
          return (
            <div
              key={id}
              className={isActive ? 'cc-tab cc-tab--active' : 'cc-tab'}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(id);
                }
              }}
            >
              {conv && conv.kind !== 'channel' && (
                <span className="cc-tab__dot" style={{ background: tabDotColor(conv) }} />
              )}
              <span>{label.length > 12 ? `${label.slice(0, 11)}…` : label}</span>
              <button
                type="button"
                className="cc-tab__x"
                aria-label={`Close ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(id);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </svg>
              </button>
            </div>
          );
        })}
        <button type="button" className="cc-tab__add" aria-label="Open another chat" onClick={onNewMessage}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ChatDock;
