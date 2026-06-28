import React, { useMemo, useState } from 'react';
import { useActiveHuddleIds } from '@/hooks/chat/useHuddleData';
import { SidebarHeader } from './SidebarHeader';
import { SidebarSearch } from './SidebarSearch';
import { ConversationRow } from './ConversationRow';
import { ChannelRow } from './ChannelRow';
import { SidebarSection } from './SidebarSection';
import { DmRichRow } from './DmRichRow';
import { SidebarNavLink } from './SidebarNavLink';
import { DraftsClockIcon, PlusIcon } from '../shared/Icon';
import { useMyScheduledCount } from '../../hooks/useMyScheduledCount';
import type { ChatConversation } from '@/types/chat';
import type { ChatView } from '@/features/chat/hooks/useShellState';

interface SidebarProps {
  activeView: ChatView;
  conversations: ChatConversation[];
  activeConversationId: string | undefined;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onCreateChannel: () => void;
  onOpenDrafts: () => void;
  /** Opens the chat-wide search modal (replaces what the deleted purple
   *  WorkspaceSearchBar used to trigger). */
  onOpenSearchModal: () => void;
}

function isRealChannel(c: ChatConversation): boolean {
  if (c.kind === 'custom_channel') return true;
  if (c.kind === 'channel' && !c.projectKey) return true;
  return false;
}

function isProjectConversation(c: ChatConversation): boolean {
  if (c.kind === 'ticket') return true;
  if (c.kind === 'channel' && !!c.projectKey) return true;
  return false;
}

function isDmKind(c: ChatConversation): boolean {
  return c.kind === 'dm' || c.kind === 'group_dm';
}

export function Sidebar({
  activeView,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onCreateChannel,
  onOpenDrafts,
  onOpenSearchModal,
}: SidebarProps) {
  const [search, setSearch] = useState('');
  const [unreadsOnly, setUnreadsOnly] = useState(false);
  const scheduledCount = useMyScheduledCount();
  const huddleIds = useActiveHuddleIds();
  const isDraftsActive = activeView === 'drafts';

  const { starred, channels, projects, dms } = useMemo(() => {
    let list = conversations.filter(c => !c.isArchived);
    if (unreadsOnly) list = list.filter(c => c.unreadCount > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q));
    }
    const sortAlpha = (a: ChatConversation, b: ChatConversation) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    const timestampMap = new Map<string, number>();
    for (const c of list) {
      if (c.lastMessageAt) {
        timestampMap.set(c.id, new Date(c.lastMessageAt).getTime());
      }
    }
    const sortRecent = (a: ChatConversation, b: ChatConversation) => {
      const at = timestampMap.get(a.id) ?? 0;
      const bt = timestampMap.get(b.id) ?? 0;
      return bt - at;
    };
    const isUnstarred = (c: ChatConversation) => !c.isStarred;
    return {
      starred: list.filter(c => !!c.isStarred).slice().sort(sortAlpha),
      channels: list.filter(c => isRealChannel(c) && isUnstarred(c)).slice().sort(sortAlpha),
      projects: list.filter(c => isProjectConversation(c) && isUnstarred(c)).slice().sort(sortRecent),
      dms: list.filter(c => isDmKind(c) && isUnstarred(c)).slice().sort(sortRecent),
    };
  }, [conversations, unreadsOnly, search]);

  const showOnlyDms = activeView === 'dms';

  const dmsForDmTab = useMemo(() => {
    let list = conversations.filter(c => !c.isArchived && isDmKind(c));
    if (unreadsOnly) list = list.filter(c => c.unreadCount > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => {
        if (c.title.toLowerCase().includes(q)) return true;
        const names = (c.dmMemberNames ?? []).filter(Boolean);
        return names.some(n => n.toLowerCase().includes(q));
      });
    }
    const timestampMap = new Map<string, number>();
    for (const c of list) {
      if (c.lastMessageAt) {
        timestampMap.set(c.id, new Date(c.lastMessageAt).getTime());
      }
    }
    return list.slice().sort((a, b) => {
      const at = timestampMap.get(a.id) ?? 0;
      const bt = timestampMap.get(b.id) ?? 0;
      return bt - at;
    });
  }, [conversations, unreadsOnly, search]);

  if (showOnlyDms) {
    return (
      <aside
        aria-label="Direct messages"
        style={{
          gridArea: 'sidebar',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cv2-bg-sidebar)',
          borderRight: '1px solid var(--cv2-border)',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <SidebarHeader
          title="Direct messages"
          unreadsOnly={unreadsOnly}
          onToggleUnreadsOnly={setUnreadsOnly}
          onNewConversation={onNewConversation}
        />
        <SidebarSearch value={search} onChange={setSearch} placeholder="Find a DM" />
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            minHeight: 0,
            paddingBottom: 12,
          }}
        >
          {dmsForDmTab.length === 0 ? (
            <EmptySection label="No direct messages yet" />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {dmsForDmTab.map(c => (
                <li key={c.id}>
                  <DmRichRow
                    conversation={c}
                    isActive={c.id === activeConversationId}
                    onClick={() => onSelectConversation(c.id)}
                    hasHuddle={huddleIds.has(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Sidebar"
      style={{
        gridArea: 'sidebar',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cv2-bg-sidebar)',
        borderRight: '1px solid var(--cv2-border)',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <SidebarHeader
        title="Conversations"
        unreadsOnly={unreadsOnly}
        onToggleUnreadsOnly={setUnreadsOnly}
        onNewConversation={onNewConversation}
      />
      <SidebarSearch
        onOpenSearchModal={onOpenSearchModal}
        placeholder="Search conversations…"
      />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          paddingBottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ padding: '0 4px' }}>
          <SidebarNavLink
            icon={<DraftsClockIcon size={16} />}
            label="Drafts & sent"
            active={isDraftsActive}
            badgeCount={scheduledCount}
            onClick={onOpenDrafts}
          />
        </div>
        {starred.length > 0 && (
          <SidebarSection title="Starred">
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {starred.map(c => (
                <li key={c.id}>
                  {isRealChannel(c) ? (
                    <ChannelRow
                      conversation={c}
                      isActive={c.id === activeConversationId}
                      onClick={() => onSelectConversation(c.id)}
                      hasHuddle={huddleIds.has(c.id)}
                    />
                  ) : (
                    <ConversationRow
                      conversation={c}
                      isActive={c.id === activeConversationId}
                      onClick={() => onSelectConversation(c.id)}
                      presence={null}
                      hasHuddle={huddleIds.has(c.id)}
                    />
                  )}
                </li>
              ))}
            </ul>
          </SidebarSection>
        )}
        <SidebarSection
          title="Channels"
          actions={
            <SectionIconButton label="Create new channel" onClick={onCreateChannel}>
              <PlusIcon size={12} />
            </SectionIconButton>
          }
        >
          {channels.length === 0 ? (
            <EmptySection label="No channels yet" />
          ) : (
            channels.map(c => (
              <ChannelRow
                key={c.id}
                conversation={c}
                isActive={c.id === activeConversationId}
                onClick={() => onSelectConversation(c.id)}
                hasHuddle={huddleIds.has(c.id)}
              />
            ))
          )}
        </SidebarSection>
        {projects.length > 0 && (
          <SidebarSection title="Projects">
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {projects.map(c => (
                <li key={c.id}>
                  <ConversationRow
                    conversation={c}
                    isActive={c.id === activeConversationId}
                    onClick={() => onSelectConversation(c.id)}
                    presence={null}
                    hasHuddle={huddleIds.has(c.id)}
                  />
                </li>
              ))}
            </ul>
          </SidebarSection>
        )}
        <SidebarSection
          title="Direct messages"
          actions={
            <SectionIconButton label="New message" onClick={onNewConversation}>
              <PlusIcon size={12} />
            </SectionIconButton>
          }
        >
          {dms.length === 0 ? (
            <EmptySection label="No direct messages yet" />
          ) : (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {dms.map(c => (
                <li key={c.id}>
                  <ConversationRow
                    conversation={c}
                    isActive={c.id === activeConversationId}
                    onClick={() => onSelectConversation(c.id)}
                    presence={null}
                    hasHuddle={huddleIds.has(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </SidebarSection>
      </div>
    </aside>
  );
}

function SectionIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 22,
        height: 22,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        color: 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 3,
        cursor: 'pointer',
        padding: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '8px 12px 8px 32px',
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-300)',
        color: 'var(--cv2-text-muted)',
      }}
    >
      {label}
    </div>
  );
}
