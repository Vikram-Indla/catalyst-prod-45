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
import React, { useState } from 'react';
import { IconButton } from '@atlaskit/button/new';
import EditorAddIcon from '@atlaskit/icon/glyph/editor/add';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { useConversations } from '@/hooks/chat/useConversations';
import type { ChatConversation, ChatPresence } from '@/types/chat';
import catalystChatIcon from '@/assets/catalyst-chat-icon.svg';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { CatyPanel } from './CatyPanel';
import { DockDirectory } from './DockDirectory';
import { DockConversationPane } from './DockConversationPane';
// ads-scanner:ignore-next-line — dock.css is a tokens-only stylesheet (audited clean)
import './dock.css';

type DockMode = 'messages' | 'caty';
type CatyView = 'floating' | 'sidebar';

interface ChatDockProps {
  openConversationIds: string[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapsed: () => void;
  /**
   * Clears the active conversation so the inline DockDirectory becomes
   * the visible surface. Replaces the legacy onNewMessage modal (removed
   * 2026-06-08 — directory now covers both "browse" and "start new" inline).
   */
  onFocusDirectory?: () => void;
  onPopOut?: () => void;
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
    return (
      <span style={{ ...tileBase, background: 'transparent' }}>
        <JiraIssueTypeIcon type={conversation.ticketType ?? 'Task'} size={20} />
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
  onFocusDirectory,
  onPopOut,
}: ChatDockProps) {
  const [dockMode, setDockMode] = useState<DockMode>('messages');
  const [catyView, setCatyView] = useState<CatyView>('floating');

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
        <img src={catalystChatIcon} alt="" width={56} height={56} />
        {totalUnread > 0 && <span className="cc-fab__badge">{totalUnread > 99 ? '99+' : totalUnread}</span>}
        <span className="cc-fab__presence" />
      </button>
    );
  }

  const listConversations = (conversations ?? []).filter((c) => !c.isArchived);

  return (
    <div
      className={`cc-dock${dockMode === 'caty' && catyView === 'sidebar' ? ' cc-dock--sidebar' : ''}`}
      role="dialog"
      aria-label={dockMode === 'caty' ? 'Ask Caty AI' : 'Messages'}
    >
      {/* Shared header — mode tabs + shared icons */}
      <div className="cc-dock__header">
        {/* Dual-mode tab pills */}
        <div className="cc-mode-tabs">
          <button
            type="button"
            className={`cc-mode-tab${dockMode === 'messages' ? ' cc-mode-tab--active' : ''}`}
            onClick={() => setDockMode('messages')}
            aria-pressed={dockMode === 'messages'}
          >
            Messages
            {totalUnread > 0 && dockMode !== 'messages' && (
              <span className="cc-mode-tab__badge">{totalUnread > 9 ? '9+' : totalUnread}</span>
            )}
          </button>
          <button
            type="button"
            className={`cc-mode-tab${dockMode === 'caty' ? ' cc-mode-tab--active' : ''}`}
            onClick={() => setDockMode('caty')}
            aria-pressed={dockMode === 'caty'}
          >
            <img src={catalystChatIcon} alt="" width={14} height={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Ask Caty
          </button>
        </div>

        {/* Shared header icons — context-aware */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, paddingLeft: 4 }}>
          {dockMode === 'messages' && (
            <IconButton icon={EditorAddIcon} label="New conversation" appearance="subtle" spacing="compact" onClick={onFocusDirectory} />
          )}
          <IconButton icon={VidFullScreenOnIcon} label="Open full view" appearance="subtle" spacing="compact" onClick={onPopOut} />
          <IconButton icon={ChevronDownIcon} label="Minimize" appearance="subtle" spacing="compact" onClick={onToggleCollapsed} />
          <IconButton icon={CrossIcon} label="Close" appearance="subtle" spacing="compact" onClick={onToggleCollapsed} />
        </div>
      </div>

      {/* Messages mode — directory OR conversation pane */}
      {dockMode === 'messages' && (
        <>
          {activeId && byId.get(activeId) ? (
            <DockConversationPane
              conversation={byId.get(activeId)!}
              onBack={() => onFocusDirectory?.()}
            />
          ) : (
            <DockDirectory
              conversations={listConversations}
              activeId={activeId}
              onSelectConversation={onSelect}
            />
          )}

          <div className="cc-tabs">
            {openConversationIds.map((id) => {
              const conv = byId.get(id);
              const label = conv
                ? conv.kind === 'channel'
                  ? `# ${conv.title}`
                  : conv.title
                : id;
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
                  {/* × close button REMOVED (2026-06-08 design-critique).
                      Ambiguous on channel pills — read as "leave channel"
                      when it was just "close tab". Slack/Teams have no
                      tab-bar close. Tabs auto-clear on dock close. */}
                </div>
              );
            })}
            <button type="button" className="cc-tab__add" aria-label="Open another chat" onClick={onFocusDirectory}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Caty AI mode — new panel, messages mode is paused but state preserved */}
      {dockMode === 'caty' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          <CatyPanel viewMode={catyView} onViewModeChange={setCatyView} />
        </div>
      )}
    </div>
  );
}

export default ChatDock;
