/**
 * DockDirectory — unified Messages directory rendered INSIDE the dock.
 *
 * Changes (2026-06-11):
 *  - "Channels" → "Projects" (finding 07)
 *  - Exclude INV from project list (finding 08)
 *  - Expand/collapse per section, persisted to localStorage (finding 09–10)
 *  - Hover-reveal archive button on DM/ticket rows (finding 12)
 *  - Archived section at bottom (finding 13)
 *  - Mute + star indicators on rows (findings 14, 16)
 *  - Timestamp: >7 days shows "Jun 9" (finding 15)
 *  - Sentence-case section headers (finding 17)
 *  - Dividers between sections (finding 18)
 *  - Full row clickable for People (finding 34); last-seen (35); sort online-first (36)
 *  - DM start error toast (finding 33)
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { useStartProjectChannel } from '@/hooks/chat/useStartProjectChannel';
import { useChatSearch, groupSearchHits } from '@/hooks/chat/useChatSearch';
import { useChatArchive, useChatUnarchive, useChatTogglePin, useChatToggleStar } from '@/hooks/chat/useChatActions';
import { NewGroupDmModal } from './NewGroupDmModal';
import { BrowseChannelsModal } from './BrowseChannelsModal';
import ProjectIcon from '@/components/shared/ProjectIcon';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatConversation, ChatPerson, ChatPresence } from '@/types/chat';
import { Avatar } from '@/components/chat/main/avatar';
import { NewChannelModal } from './NewChannelModal';

const EXCLUDED_PROJECT_KEYS = new Set(['INV', 'TH-DEFAULT', 'MDT']);

/**
 * Split live conversations into Pinned and Favourites buckets.
 * Pinned wins over starred (a pinned+starred conversation shows only in Pinned).
 * `excluded` is the id set of everything bucketed here so the normal
 * Direct-messages / Work-items / Projects sections skip them (no duplicates).
 */
export function splitPinnedFavourites(live: ChatConversation[]): {
  pinned: ChatConversation[];
  favourites: ChatConversation[];
  excluded: Set<string>;
} {
  const pinned = live.filter((c) => c.isPinned);
  const favourites = live.filter((c) => !c.isPinned && c.isStarred);
  const excluded = new Set<string>([...pinned, ...favourites].map((c) => c.id));
  return { pinned, favourites, excluded };
}

const PRESENCE_LABEL: Record<ChatPresence, string> = {
  on_set: 'In office',
  remote: 'Remote',
  away: 'Away',
  on_leave: 'On leave',
};

const PRESENCE_TONE: Record<ChatPresence, 'green' | 'blue' | 'amber' | 'grey'> = {
  on_set: 'green',
  remote: 'blue',
  away: 'amber', // renders as a hollow grey ring (see .cc-dot--amber)
  on_leave: 'grey',
};

const PRESENCE_ORDER: Record<ChatPresence, number> = {
  on_set: 0,
  remote: 1,
  away: 2,
  on_leave: 3,
};

const LS_COLLAPSED_KEY = 'catalyst-chat-dir-collapsed';

function loadCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(LS_COLLAPSED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, boolean>) {
  try { localStorage.setItem(LS_COLLAPSED_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function relativeShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  // >7 days: show "Jun 9" style
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface SectionHeaderProps {
  label: string;
  count?: number;
  collapsed: boolean;
  unreadInSection?: number;
  onToggle: () => void;
  actions?: React.ReactNode;
}

function SectionHeader({ label, count, collapsed, unreadInSection, onToggle, actions }: SectionHeaderProps) {
  return (
    <div className="cc-dir__section cc-dir__section--collapsible">
      <button
        type="button"
        className="cc-dir__section-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {label}
        {collapsed && unreadInSection != null && unreadInSection > 0 && (
          <span className="cc-dir__section-unread">{unreadInSection > 99 ? '99+' : unreadInSection}</span>
        )}
        {!collapsed && count != null && (
          <span className="cc-dir__section-count">{count}</span>
        )}
      </button>
      {actions}
    </div>
  );
}

interface ConvRowProps {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive?: (id: string) => void;
  isArchived?: boolean;
  glyph: React.ReactNode;
  titleOverride?: string;
  previewOverride?: string;
  onTogglePin?: (id: string, next: boolean) => void;
  onToggleStar?: (id: string, next: boolean) => void;
}

function ConvRow({ conversation: c, isActive, onSelect, onArchive, onUnarchive, isArchived, glyph, titleOverride, previewOverride, onTogglePin, onToggleStar }: ConvRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`cc-dir__row-wrap${isActive ? ' cc-dir__row-wrap--active' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="cc-dir__row"
        onClick={() => onSelect(c.id)}
      >
        {glyph}
        <div className="cc-dir__body">
          <div className="cc-dir__top">
            <span className="cc-dir__name">
              {titleOverride ?? c.title}
              {c.isStarred && (
                <svg width={10} height={10} viewBox="0 0 24 24" fill="var(--ds-icon-warning, #E2B203)" stroke="none" style={{ marginLeft: 4, verticalAlign: 'middle' }} aria-label="Starred">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )}
              {c.isMuted && (
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="var(--ds-text-subtlest, #6B778C)" strokeWidth={2} style={{ marginLeft: 4, verticalAlign: 'middle' }} aria-label="Muted">
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                  <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                  <path d="M18 8a6 6 0 0 0-9.33-5" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </span>
            <span className="cc-dir__time">{relativeShort(c.lastMessageAt)}</span>
          </div>
          <div className="cc-dir__preview">
            {previewOverride ?? c.lastMessagePreview ?? 'No messages yet'}
          </div>
        </div>
        {c.unreadCount > 0 && !hovered && (
          <span className="cc-dir__unread">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
        )}
      </button>
      {hovered && (
        <div className="cc-dir__row-actions">
          {onTogglePin && !isArchived && (
            <button
              type="button"
              className={`cc-dir__rowact${c.isPinned ? ' cc-dir__rowact--on' : ''}`}
              aria-label={c.isPinned ? 'Unpin conversation' : 'Pin conversation'}
              title={c.isPinned ? 'Unpin' : 'Pin'}
              onClick={(e) => { e.stopPropagation(); onTogglePin(c.id, !c.isPinned); }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill={c.isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="12" y1="17" x2="12" y2="22" />
                <path d="M5 17h14l-1.7-2.3a2 2 0 0 1-.3-1.1V7a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6.6a2 2 0 0 1-.3 1.1L5 17z" />
              </svg>
            </button>
          )}
          {onToggleStar && !isArchived && (
            <button
              type="button"
              className={`cc-dir__rowact${c.isStarred ? ' cc-dir__rowact--star-on' : ''}`}
              aria-label={c.isStarred ? 'Remove from favourites' : 'Add to favourites'}
              title={c.isStarred ? 'Unfavourite' : 'Favourite'}
              onClick={(e) => { e.stopPropagation(); onToggleStar(c.id, !c.isStarred); }}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill={c.isStarred ? 'var(--ds-icon-warning, #E2B203)' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="cc-dir__rowact"
            aria-label={isArchived ? 'Unarchive conversation' : 'Archive conversation'}
            title={isArchived ? 'Unarchive' : 'Archive'}
            onClick={(e) => { e.stopPropagation(); isArchived ? onUnarchive?.(c.id) : onArchive(c.id); }}
          >
            {isArchived ? (
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <polyline points="1 6 1 22 23 22 23 6" /><polyline points="1 6 12 2 23 6" />
                <line x1="12" y1="10" x2="12" y2="22" /><line x1="8" y1="15" x2="16" y2="15" />
              </svg>
            ) : (
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface DockDirectoryProps {
  conversations: ChatConversation[];
  activeId?: string;
  onSelectConversation: (id: string) => void;
  /** Incremented each time the + button is pressed — auto-focuses search input. */
  focusTick?: number;
}

export function DockDirectory({ conversations, activeId, onSelectConversation, focusTick }: DockDirectoryProps) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';
  const { groups, isLoading } = useChatPeople();
  const startDm = useStartDm();
  const startChannel = useStartProjectChannel();
  const archive = useChatArchive();
  const unarchive = useChatUnarchive();
  const togglePin = useChatTogglePin();
  const toggleStar = useChatToggleStar();
  const handleTogglePin = useCallback((id: string, next: boolean) => togglePin.mutate({ convId: id, pinned: next }), [togglePin]);
  const handleToggleStar = useCallback((id: string, next: boolean) => toggleStar.mutate({ convId: id, starred: next }), [toggleStar]);
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dmError, setDmError] = useState<string | null>(null);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newGroupDmOpen, setNewGroupDmOpen] = useState(false);
  const [browseChannelsOpen, setBrowseChannelsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed);
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Focus search input whenever the + button is clicked (focusTick increments).
  useEffect(() => {
    if (focusTick && focusTick > 0) searchRef.current?.focus();
  }, [focusTick]);

  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  // Refresh presence cache when directory mounts (finding 37)
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['chat', 'last-seen'] });
  }, [qc]);

  const { hits: searchHits, isEnabled: searchActive } = useChatSearch(query, 'all', 25);
  const searchGroups = useMemo(() => groupSearchHits(searchHits), [searchHits]);

  const { data: myProjects } = useQuery({
    queryKey: ['chat', 'my-projects', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as { id: string; key: string; name: string }[];
      const { data: memberRows } = await supabase
        .from('ph_project_members')
        .select('project_id')
        .eq('user_id', user.id);
      const projectIds = (memberRows ?? []).map((r: any) => r.project_id).filter(Boolean);
      if (projectIds.length === 0) {
        const { data: all } = await supabase
          .from('ph_projects')
          .select('id, key, name')
          .order('key')
          .limit(20);
        return (all ?? []) as { id: string; key: string; name: string }[];
      }
      const { data: projs } = await supabase
        .from('ph_projects')
        .select('id, key, name')
        .in('id', projectIds)
        .order('key');
      return (projs ?? []) as { id: string; key: string; name: string }[];
    },
  });

  const { data: idMap } = useQuery({
    queryKey: ['chat', 'resource-to-profile'],
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, name')
        .eq('is_active', true)
        .not('profile_id', 'is', null);
      const map = new Map<string, { profileId: string; name: string | null }>();
      (data ?? []).forEach((r: any) => {
        if (r.profile_id) map.set(r.id, { profileId: r.profile_id, name: r.name });
      });
      return map;
    },
  });

  const { data: lastSeen } = useQuery({
    queryKey: ['chat', 'last-seen'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('user_presence')
        .select('user_id, last_seen_at');
      const map = new Map<string, string>();
      (data ?? []).forEach((r: any) => { if (r.user_id && r.last_seen_at) map.set(r.user_id, r.last_seen_at); });
      return map;
    },
  });

  // Sort people: online-first within each presence tier, then alphabetical (finding 36)
  const people = useMemo(() => {
    const all = groups.flatMap((g) => g.people);
    const filtered = !user || !idMap
      ? all
      : all.filter((p) => {
          const m = idMap.get(p.id);
          return !m || m.profileId !== user.id;
        });
    return filtered.sort((a, b) => {
      const presenceDiff = PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence];
      if (presenceDiff !== 0) return presenceDiff;
      return a.name.localeCompare(b.name);
    });
  }, [groups, idMap, user]);

  // Smart archive suggestions (finding 55) — DMs/tickets inactive 14+ days
  const STALE_MS = 14 * 24 * 60 * 60 * 1000;
  const [archiveDismissed, setArchiveDismissed] = useState(false);
  const staleConversations = useMemo(() =>
    conversations.filter((c) =>
      !c.isArchived &&
      (c.kind === 'dm' || c.kind === 'ticket') &&
      c.lastMessageAt &&
      Date.now() - new Date(c.lastMessageAt).getTime() > STALE_MS
    ),
    [conversations]
  );

  const { live, archived } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchQ = (c: ChatConversation) =>
      !q || c.title.toLowerCase().includes(q) || (c.lastMessagePreview ?? '').toLowerCase().includes(q);
    return {
      live: conversations.filter((c) => !c.isArchived && matchQ(c)),
      archived: conversations.filter((c) => c.isArchived && matchQ(c)),
    };
  }, [query, conversations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const projects = (myProjects ?? []).filter((p) => !EXCLUDED_PROJECT_KEYS.has(p.key));
    const { pinned, favourites, excluded } = splitPinnedFavourites(live);
    const dms = live.filter((c) => (c.kind === 'dm' || c.kind === 'group_dm') && !excluded.has(c.id));
    const channelConvs = live.filter((c) => c.kind === 'channel' && !excluded.has(c.id));
    const tickets = live.filter((c) => c.kind === 'ticket' && !excluded.has(c.id));

    const projectByKey = new Map<string, { id: string; key: string; name: string }>();
    projects.forEach((p) => projectByKey.set(p.key, p));

    const seenChannelKeys = new Set<string>();
    const channelRowsFromConvs = channelConvs
      .filter((c) => !EXCLUDED_PROJECT_KEYS.has(c.projectKey ?? ''))
      .map((c) => {
        const key = c.projectKey ?? c.id;
        seenChannelKeys.add(key);
        return {
          project: projectByKey.get(c.projectKey ?? '') ?? { id: c.id, key: c.projectKey ?? '', name: c.title },
          conversation: c,
        };
      });

    const channelRowsFromProjects = projects
      .filter((p) => !seenChannelKeys.has(p.key))
      .filter((p) => !q || p.key.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q))
      .map((p) => ({ project: p, conversation: null as null | ChatConversation }));

    const channelRows = [...channelRowsFromConvs, ...channelRowsFromProjects];

    return {
      pinned,
      favourites,
      dms,
      tickets,
      channelRows,
      people: q
        ? people.filter((pp) => pp.name.toLowerCase().includes(q) || (pp.role ?? '').toLowerCase().includes(q))
        : people.slice(0, 50),
    };
  }, [query, live, people, myProjects]);

  const handleOpenChannel = async (projectKey: string) => {
    setBusyId(`channel:${projectKey}`);
    try {
      const convId = await startChannel.mutateAsync(projectKey);
      onSelectConversation(convId);
    } catch (e) {
      console.error('Open channel failed:', e);
    } finally {
      setBusyId(null);
    }
  };

  const handleStartDm = async (person: ChatPerson) => {
    const map = idMap?.get(person.id);
    if (!map || !user) {
      setDmError(`Could not start conversation with ${person.name} — profile not found.`);
      setTimeout(() => setDmError(null), 4000);
      return;
    }
    if (map.profileId === user.id) return;
    setBusyId(person.id);
    try {
      const convId = await startDm.mutateAsync(map.profileId);
      onSelectConversation(convId);
    } catch (e) {
      console.error('Start DM failed:', e);
      setDmError(`Could not start conversation with ${person.name}. Try again.`);
      setTimeout(() => setDmError(null), 4000);
    } finally {
      setBusyId(null);
    }
  };

  const dmUnread = useMemo(() => filtered.dms.reduce((s, c) => s + c.unreadCount, 0), [filtered.dms]);
  const ticketUnread = useMemo(() => filtered.tickets.reduce((s, c) => s + c.unreadCount, 0), [filtered.tickets]);
  const projectUnread = useMemo(() => filtered.channelRows.reduce((s, { conversation: c }) => s + (c?.unreadCount ?? 0), 0), [filtered.channelRows]);

  // Glyph for a mixed-kind row (Pinned / Favourites can hold any kind).
  // Zero-assumption: a ticket with no known type renders its avatar, never a lied type.
  const convGlyph = (c: ChatConversation) => {
    if (c.kind === 'ticket') {
      return c.ticketType ? (
        <span className="cc-dir__ticket-icon"><JiraIssueTypeIcon type={c.ticketType} size={20} /></span>
      ) : (
        <Avatar name={c.ticketKey ?? c.title} seed={c.id} className="cc-dir__avatar" />
      );
    }
    if (c.kind === 'channel') {
      return <ProjectIcon projectKey={c.projectKey ?? ''} size="medium" />;
    }
    return <Avatar name={c.title} seed={c.id} className="cc-dir__avatar" />;
  };

  const renderMixedRow = (c: ChatConversation) => (
    <ConvRow
      key={c.id}
      conversation={c}
      isActive={activeId === c.id}
      onSelect={onSelectConversation}
      onArchive={(id) => archive.mutate(id)}
      onTogglePin={handleTogglePin}
      onToggleStar={handleToggleStar}
      glyph={convGlyph(c)}
      titleOverride={c.kind === 'ticket' ? (c.ticketKey ?? c.title) : undefined}
      previewOverride={c.kind === 'ticket' ? (c.lastMessagePreview ?? c.title) : undefined}
    />
  );

  return (
    <div className="cc-dir">
      {isAdmin && (
        <NewChannelModal
          isOpen={newChannelOpen}
          onClose={() => setNewChannelOpen(false)}
          onCreated={(id) => onSelectConversation(id)}
        />
      )}
      <NewGroupDmModal
        isOpen={newGroupDmOpen}
        onClose={() => setNewGroupDmOpen(false)}
        onCreated={(id) => onSelectConversation(id)}
      />
      <BrowseChannelsModal
        isOpen={browseChannelsOpen}
        onClose={() => setBrowseChannelsOpen(false)}
        onOpenChannel={(id) => onSelectConversation(id)}
      />

      {/* Search */}
      <div className="cc-dir__search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.5" y2="16.5" strokeLinecap="round" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          className="cc-dir__search-input"
          placeholder="Search work items, channels, people"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="cc-dir__search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
        )}
      </div>

      {dmError && (
        <div className="cc-dir__error-toast" role="alert">{dmError}</div>
      )}

      <div className="cc-dir__scroll">
        {/* Global search results */}
        {searchActive && searchHits.length > 0 && (
          <>
            {searchGroups.messages.length > 0 && (
              <>
                <div className="cc-dir__section">Messages<span className="cc-dir__section-count">{searchGroups.messages.length}</span></div>
                {searchGroups.messages.map((h) => (
                  <button key={`m:${h.id}`} type="button" className="cc-dir__row" onClick={() => h.conversationId && onSelectConversation(h.conversationId)}>
                    <Avatar name={h.subtitle ?? '?'} seed={h.conversationId ?? h.id} className="cc-dir__avatar" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top"><span className="cc-dir__name">{h.subtitle ?? 'Conversation'}</span></div>
                      <div className="cc-dir__preview">{h.title}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {searchGroups.channels.length > 0 && (
              <>
                <div className="cc-dir__section">Projects<span className="cc-dir__section-count">{searchGroups.channels.length}</span></div>
                {searchGroups.channels.map((h) => (
                  <button key={`c:${h.id}`} type="button" className="cc-dir__row" onClick={() => onSelectConversation(h.id)}>
                    <ProjectIcon projectKey={h.subtitle ?? ''} size="medium" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top"><span className="cc-dir__name">{h.title}</span></div>
                      <div className="cc-dir__preview">{h.subtitle ?? ''}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {searchGroups.projects.length > 0 && (
              <>
                <div className="cc-dir__section">Projects<span className="cc-dir__section-count">{searchGroups.projects.length}</span></div>
                {searchGroups.projects.map((h) => (
                  <button key={`p:${h.id}`} type="button" className="cc-dir__row" onClick={() => handleOpenChannel(h.subtitle ?? '')}>
                    <ProjectIcon projectKey={h.subtitle ?? ''} size="medium" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top"><span className="cc-dir__name">{h.title}</span></div>
                      <div className="cc-dir__preview">{h.subtitle ?? ''}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {searchGroups.people.length > 0 && (
              <>
                <div className="cc-dir__section">People<span className="cc-dir__section-count">{searchGroups.people.length}</span></div>
                {searchGroups.people.map((h) => (
                  <button key={`u:${h.id}`} type="button" className="cc-dir__row" onClick={() => {
                    setBusyId(h.id);
                    startDm.mutateAsync(h.id)
                      .then((convId) => onSelectConversation(convId))
                      .catch((e) => { console.error('Start DM (search) failed:', e); setDmError('Could not start conversation. Try again.'); setTimeout(() => setDmError(null), 4000); })
                      .finally(() => setBusyId(null));
                  }}>
                    <Avatar name={h.title} seed={h.id} className="cc-dir__avatar" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top"><span className="cc-dir__name">{h.title}</span></div>
                      <div className="cc-dir__preview">{h.subtitle ?? ''}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </>
        )}

        {/* Smart archive suggestion (finding 55) */}
        {!archiveDismissed && staleConversations.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '8px 8px 4px',
            padding: '8px',
            borderRadius: 6,
            background: 'var(--ds-background-neutral, #F1F2F4)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            fontSize: 11,
          }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--ds-text-subtlest, #6B778C)" strokeWidth={2} aria-hidden>
              <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            <span style={{ flex: 1, color: 'var(--ds-text-subtle, #44546F)' }}>
              {staleConversations.length} inactive conversation{staleConversations.length > 1 ? 's' : ''} — archive to clean up?
            </span>
            <button
              type="button"
              style={{ background: 'transparent', border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--ds-text, #172B4D)' }}
              onClick={() => staleConversations.forEach(c => archive.mutate(c.id))}
            >
              Archive all
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              style={{ background: 'transparent', border: 'none', color: 'var(--ds-text-subtlest, #6B778C)', cursor: 'pointer', fontSize: 14, padding: 0 }}
              onClick={() => setArchiveDismissed(true)}
            >×</button>
          </div>
        )}

        {/* Pinned */}
        {filtered.pinned.length > 0 && (
          <>
            <SectionHeader
              label="Pinned"
              count={filtered.pinned.length}
              collapsed={!!collapsed['pinned']}
              unreadInSection={filtered.pinned.reduce((s, c) => s + c.unreadCount, 0)}
              onToggle={() => toggleSection('pinned')}
            />
            {!collapsed['pinned'] && filtered.pinned.map(renderMixedRow)}
          </>
        )}

        {/* Favourites */}
        {filtered.favourites.length > 0 && (
          <>
            <div className="cc-dir__section-divider" />
            <SectionHeader
              label="Favourites"
              count={filtered.favourites.length}
              collapsed={!!collapsed['favourites']}
              unreadInSection={filtered.favourites.reduce((s, c) => s + c.unreadCount, 0)}
              onToggle={() => toggleSection('favourites')}
            />
            {!collapsed['favourites'] && filtered.favourites.map(renderMixedRow)}
          </>
        )}

        {/* Direct messages */}
        <div className="cc-dir__section-divider" />
        <SectionHeader
          label="Direct messages"
          count={filtered.dms.length}
          collapsed={!!collapsed['dms']}
          unreadInSection={dmUnread}
          onToggle={() => toggleSection('dms')}
          actions={
            <button
              type="button"
              className="cc-dir__section-add"
              aria-label="New group message"
              title="New group message"
              onClick={() => setNewGroupDmOpen(true)}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          }
        />
        {!collapsed['dms'] && filtered.dms.map((c) => (
          <ConvRow
            key={c.id}
            conversation={c}
            isActive={activeId === c.id}
            onSelect={onSelectConversation}
            onArchive={(id) => archive.mutate(id)}
            onTogglePin={handleTogglePin}
            onToggleStar={handleToggleStar}
            glyph={<Avatar name={c.title} seed={c.id} className="cc-dir__avatar" />}
          />
        ))}

        {/* Tickets */}
        {filtered.tickets.length > 0 && (
          <>
            <div className="cc-dir__section-divider" />
            <SectionHeader
              label="Work items"
              count={filtered.tickets.length}
              collapsed={!!collapsed['tickets']}
              unreadInSection={ticketUnread}
              onToggle={() => toggleSection('tickets')}
            />
            {!collapsed['tickets'] && filtered.tickets.map((c) => (
              <ConvRow
                key={c.id}
                conversation={c}
                isActive={activeId === c.id}
                onSelect={onSelectConversation}
                onArchive={(id) => archive.mutate(id)}
                onTogglePin={handleTogglePin}
                onToggleStar={handleToggleStar}
                glyph={convGlyph(c)}
                titleOverride={c.ticketKey ?? c.title}
                previewOverride={c.lastMessagePreview ?? c.title}
              />
            ))}
          </>
        )}

        {/* Projects (was "Channels") */}
        {(filtered.channelRows.length > 0 || isAdmin) && (
          <>
            <div className="cc-dir__section-divider" />
            <SectionHeader
              label="Projects"
              count={filtered.channelRows.length || undefined}
              collapsed={!!collapsed['projects']}
              unreadInSection={projectUnread}
              onToggle={() => toggleSection('projects')}
              actions={
                <>
                  <button
                    type="button"
                    aria-label="Browse all projects"
                    title="Browse all projects"
                    onClick={() => setBrowseChannelsOpen(true)}
                    className="cc-dir__section-add"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.5" y2="16.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="cc-dir__section-add"
                      aria-label="New project channel (admin)"
                      title="New project channel (admin)"
                      onClick={() => setNewChannelOpen(true)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  )}
                </>
              }
            />
            {!collapsed['projects'] && filtered.channelRows.map(({ project: p, conversation: c }) => (
              <div
                key={p.id}
                className={`cc-dir__row-wrap${c && activeId === c.id ? ' cc-dir__row-wrap--active' : ''}`}
              >
                <button
                  type="button"
                  className="cc-dir__row"
                  disabled={busyId === `channel:${p.key}`}
                  onClick={() => { if (c) onSelectConversation(c.id); else handleOpenChannel(p.key); }}
                  title={c ? `Open ${p.name || p.key}` : `Join ${p.name || p.key}`}
                >
                  <ProjectIcon projectKey={p.key} size="medium" />
                  <div className="cc-dir__body">
                    <div className="cc-dir__top">
                      <span className="cc-dir__name">{p.name || p.key}</span>
                      {c && <span className="cc-dir__time">{relativeShort(c.lastMessageAt)}</span>}
                    </div>
                    <div className="cc-dir__preview">{c?.lastMessagePreview ?? 'Project workspace'}</div>
                  </div>
                  {c && c.unreadCount > 0 ? (
                    <span className="cc-dir__unread">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                  ) : !c ? (
                    <span className="cc-dir__msg-cta">{busyId === `channel:${p.key}` ? '…' : 'Join'}</span>
                  ) : null}
                </button>
              </div>
            ))}
          </>
        )}

        {/* People — full row clickable (finding 34), sorted online-first (36) */}
        {filtered.people.length > 0 && (
          <>
            <div className="cc-dir__section-divider" />
            <SectionHeader
              label="People"
              count={filtered.people.length}
              collapsed={!!collapsed['people']}
              onToggle={() => toggleSection('people')}
            />
            {!collapsed['people'] && filtered.people.map((p) => {
              const map = idMap?.get(p.id);
              const last = map ? lastSeen?.get(map.profileId) : undefined;
              const lastSeenStr = last ? `Last seen ${relativeShort(last)} ago` : '';
              // Remote shows the captured location (presenceNote) when available.
              const remoteLine = p.presenceNote ? `Remote · ${p.presenceNote}` : 'Remote';
              const statusLine = p.presence === 'on_set'
                ? (p.role ? `${p.role} · In office` : 'In office')
                : p.presence === 'remote'
                  ? (p.role ? `${p.role} · ${remoteLine}` : remoteLine)
                  : lastSeenStr || (p.role ? `${p.role} · ${PRESENCE_LABEL[p.presence]}` : PRESENCE_LABEL[p.presence]);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="cc-dir__row"
                  disabled={busyId === p.id}
                  onClick={() => handleStartDm(p)}
                  title={`Message ${p.name}`}
                >
                  <Avatar name={p.name} seed={p.id} className="cc-dir__avatar" presence={PRESENCE_TONE[p.presence]} />
                  <div className="cc-dir__body">
                    <div className="cc-dir__top">
                      <span className="cc-dir__name">{p.name}</span>
                    </div>
                    <div className="cc-dir__preview">{statusLine}</div>
                  </div>
                  {busyId === p.id && <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>…</span>}
                </button>
              );
            })}
          </>
        )}

        {/* Archived conversations (finding 13) */}
        {archived.length > 0 && (
          <>
            <div className="cc-dir__section-divider" />
            <SectionHeader
              label="Archived"
              count={archived.length}
              collapsed={collapsed['archived'] !== false}
              onToggle={() => toggleSection('archived')}
            />
            {collapsed['archived'] !== false ? null : archived.map((c) => (
              <ConvRow
                key={c.id}
                conversation={c}
                isActive={activeId === c.id}
                onSelect={onSelectConversation}
                onArchive={(id) => archive.mutate(id)}
                onUnarchive={(id) => unarchive.mutate(id)}
                isArchived
                glyph={convGlyph(c)}
              />
            ))}
          </>
        )}

        {isLoading && filtered.dms.length === 0 && filtered.tickets.length === 0 && filtered.channelRows.length === 0 && filtered.people.length === 0 && (
          <div className="cc-dir__empty">Loading teammates…</div>
        )}
        {!isLoading && query && filtered.dms.length === 0 && filtered.tickets.length === 0 && filtered.channelRows.length === 0 && filtered.people.length === 0 && (
          <div className="cc-dir__empty">No matches for "{query}".</div>
        )}
        {/* Collapsed-all nudge — visible only when no rows are visible and search is empty */}
        {!isLoading && !query && collapsed['dms'] && collapsed['tickets'] && collapsed['projects'] && collapsed['people'] && (
          <div className="cc-dir__collapsed-nudge">
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--ds-text-subtlest, #6B778C)" strokeWidth={1.5} aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <div>
              <div className="cc-dir__collapsed-nudge-title">Expand a section to see messages</div>
              <div className="cc-dir__collapsed-nudge-sub">Click a section header above to open it</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DockDirectory;
