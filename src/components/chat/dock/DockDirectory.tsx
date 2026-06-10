/**
 * DockDirectory — unified Messages directory rendered INSIDE the dock.
 *
 * Replaces the modal popup. Slack/Teams enterprise pattern:
 *  - Top search input (people + channels + tickets)
 *  - Section: Direct messages (existing conversations) with preview + time
 *  - Section: People — all teammates with presence + last-seen
 *  - Section: Channels — joinable channels (placeholder for project channels)
 *
 * Click person → starts/resolves DM via chat_get_or_create_dm RPC.
 * Click conversation → opens it.
 */
import React, { useMemo, useState } from 'react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { useStartProjectChannel } from '@/hooks/chat/useStartProjectChannel';
import { useChatSearch, groupSearchHits } from '@/hooks/chat/useChatSearch';
import { NewGroupDmModal } from './NewGroupDmModal';
import { BrowseChannelsModal } from './BrowseChannelsModal';
import ProjectIcon from '@/components/shared/ProjectIcon';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { ChatConversation, ChatPerson, ChatPresence } from '@/types/chat';
import { Avatar } from '@/components/chat/main/avatar';
import { NewChannelModal } from './NewChannelModal';

const PRESENCE_LABEL: Record<ChatPresence, string> = {
  available: 'Active now',
  busy: 'Busy',
  away: 'Away',
  offline: 'Offline',
  on_leave: 'On leave',
};

const PRESENCE_TONE: Record<ChatPresence, 'green' | 'red' | 'amber' | 'grey'> = {
  available: 'green',
  busy: 'red',
  away: 'amber',
  offline: 'grey',
  on_leave: 'grey',
};

function relativeShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface DockDirectoryProps {
  conversations: ChatConversation[];
  activeId?: string;
  onSelectConversation: (id: string) => void;
}

export function DockDirectory({ conversations, activeId, onSelectConversation }: DockDirectoryProps) {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === 'admin';
  const { groups, isLoading } = useChatPeople();
  const startDm = useStartDm();
  const startChannel = useStartProjectChannel();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newGroupDmOpen, setNewGroupDmOpen] = useState(false);
  const [browseChannelsOpen, setBrowseChannelsOpen] = useState(false);

  // Global server-side search (RPC chat_search). RLS-filtered for messages +
  // channels; org-wide for people + projects.
  const { hits: searchHits, isEnabled: searchActive } = useChatSearch(query, 'all', 25);
  const searchGroups = useMemo(() => groupSearchHits(searchHits), [searchHits]);

  // Caller's joined projects (for the Channels section)
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
        // Fallback: show all projects so user can browse them
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

  // resource id → profile id map for the RPC
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

  // Last-seen per profile from user_presence
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

  const people = useMemo(() => {
    const all = groups.flatMap((g) => g.people);
    if (!user || !idMap) return all;
    return all.filter((p) => {
      const m = idMap.get(p.id);
      return !m || m.profileId !== user.id;
    });
  }, [groups, idMap, user]);

  // Build a set of profile IDs already in a DM with me so we hide duplicates
  const dmProfileIds = useMemo(() => {
    // Best-effort: title-match heuristic, since chat_conversation_members lookup needs another query
    const set = new Set<string>();
    return set;
  }, [conversations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const projects = myProjects ?? [];
    const matchQ = (c: typeof conversations[number]) =>
      !q || c.title.toLowerCase().includes(q) || (c.lastMessagePreview ?? '').toLowerCase().includes(q);
    const live = conversations.filter((c) => !c.isArchived && matchQ(c));
    const dms = live.filter((c) => c.kind === 'dm' || c.kind === 'group_dm');
    const channelConvs = live.filter((c) => c.kind === 'channel');
    const tickets = live.filter((c) => c.kind === 'ticket');

    // Channel rows — source of truth is chat_conversations (kind='channel')
    // the user is a member of, NOT ph_projects. This catches Jira-synced
    // projects whose backfill landed channels but whose users aren't in
    // ph_project_members. (2026-06-08 fix — earlier path dropped 5 of 7
    // projects because they only live in ph_jira_projects.)
    const projectByKey = new Map<string, { id: string; key: string; name: string }>();
    projects.forEach((p) => projectByKey.set(p.key, p));

    const seenChannelKeys = new Set<string>();
    const channelRowsFromConvs = channelConvs.map((c) => {
      const key = c.projectKey ?? c.id;
      seenChannelKeys.add(key);
      return {
        project: projectByKey.get(c.projectKey ?? '') ?? {
          id: c.id,
          key: c.projectKey ?? '',
          name: c.title,
        },
        conversation: c,
      };
    });

    // Also surface projects whose channel exists in DB but the user isn't
    // a member of yet (admin browse case) — keeps the original behavior
    // for joinable channels.
    const channelRowsFromProjects = projects
      .filter((p) => !seenChannelKeys.has(p.key))
      .filter((p) => !q || p.key.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q))
      .map((p) => ({ project: p, conversation: null as null | typeof conversations[number] }));

    const channelRows = [...channelRowsFromConvs, ...channelRowsFromProjects];

    return {
      dms,
      tickets,
      channelRows,
      people: q
        ? people.filter((pp) => pp.name.toLowerCase().includes(q) || (pp.role ?? '').toLowerCase().includes(q))
        : people.slice(0, 50),
    };
  }, [query, conversations, people, myProjects]);

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
    if (!map || !user) return;
    if (map.profileId === user.id) return;
    setBusyId(person.id);
    try {
      const convId = await startDm.mutateAsync(map.profileId);
      onSelectConversation(convId);
    } catch (e) {
      console.error('Start DM failed:', e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="cc-dir">
      {/* Admin-only ad-hoc channel creation modal */}
      {isAdmin && (
        <NewChannelModal
          isOpen={newChannelOpen}
          onClose={() => setNewChannelOpen(false)}
          onCreated={(id) => onSelectConversation(id)}
        />
      )}
      {/* Group DM picker (available to everyone). */}
      <NewGroupDmModal
        isOpen={newGroupDmOpen}
        onClose={() => setNewGroupDmOpen(false)}
        onCreated={(id) => onSelectConversation(id)}
      />
      {/* Browse-all channels directory. */}
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
          type="text"
          className="cc-dir__search-input"
          placeholder="Search people, conversations, channels"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="cc-dir__search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>
        )}
      </div>

      <div className="cc-dir__scroll">
        {/* Global search results — visible while query active. Hits come from
            the chat_search RPC: messages (FTS, RLS-filtered), channels
            (member-only), people + projects (org-wide). */}
        {searchActive && searchHits.length > 0 && (
          <>
            {searchGroups.messages.length > 0 && (
              <>
                <div className="cc-dir__section">Messages<span className="cc-dir__section-count">{searchGroups.messages.length}</span></div>
                {searchGroups.messages.map((h) => (
                  <button
                    key={`m:${h.id}`}
                    type="button"
                    className="cc-dir__row"
                    onClick={() => h.conversationId && onSelectConversation(h.conversationId)}
                  >
                    <Avatar name={h.subtitle ?? '?'} seed={h.conversationId ?? h.id} className="cc-dir__avatar" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top">
                        <span className="cc-dir__name">{h.subtitle ?? 'Conversation'}</span>
                      </div>
                      <div className="cc-dir__preview">{h.title}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {searchGroups.channels.length > 0 && (
              <>
                <div className="cc-dir__section">Channels<span className="cc-dir__section-count">{searchGroups.channels.length}</span></div>
                {searchGroups.channels.map((h) => (
                  <button
                    key={`c:${h.id}`}
                    type="button"
                    className="cc-dir__row"
                    onClick={() => onSelectConversation(h.id)}
                  >
                    <ProjectIcon projectKey={h.subtitle ?? ''} size="medium" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top">
                        <span className="cc-dir__name">{h.title}</span>
                      </div>
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
                  <button
                    key={`p:${h.id}`}
                    type="button"
                    className="cc-dir__row"
                    onClick={() => handleOpenChannel(h.subtitle ?? '')}
                  >
                    <ProjectIcon projectKey={h.subtitle ?? ''} size="medium" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top">
                        <span className="cc-dir__name">{h.title}</span>
                      </div>
                      <div className="cc-dir__preview">{h.subtitle ?? ''}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {searchGroups.files.length > 0 && (
              <>
                <div className="cc-dir__section">Files<span className="cc-dir__section-count">{searchGroups.files.length}</span></div>
                {searchGroups.files.map((h) => (
                  <button
                    key={`f:${h.id}`}
                    type="button"
                    className="cc-dir__row"
                    onClick={() => h.conversationId && onSelectConversation(h.conversationId)}
                  >
                    <span className="cc-dir__channel-glyph" style={{ background: 'var(--ds-background-neutral-bold, #44546F)', fontSize: 11 }}>
                      📎
                    </span>
                    <div className="cc-dir__body">
                      <div className="cc-dir__top">
                        <span className="cc-dir__name">{h.title}</span>
                      </div>
                      <div className="cc-dir__preview">{h.subtitle ?? 'attachment'}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {searchGroups.people.length > 0 && (
              <>
                <div className="cc-dir__section">People<span className="cc-dir__section-count">{searchGroups.people.length}</span></div>
                {searchGroups.people.map((h) => (
                  <button
                    key={`u:${h.id}`}
                    type="button"
                    className="cc-dir__row"
                    onClick={() => {
                      // h.id is the profile uuid — start a DM directly.
                      setBusyId(h.id);
                      startDm
                        .mutateAsync(h.id)
                        .then((convId) => onSelectConversation(convId))
                        .catch((e) => console.error('Start DM (search) failed:', e))
                        .finally(() => setBusyId(null));
                    }}
                  >
                    <Avatar name={h.title} seed={h.id} className="cc-dir__avatar" />
                    <div className="cc-dir__body">
                      <div className="cc-dir__top">
                        <span className="cc-dir__name">{h.title}</span>
                      </div>
                      <div className="cc-dir__preview">{h.subtitle ?? ''}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </>
        )}

        {/* Direct messages — kind=dm + kind=group_dm. Header always visible
            so the "+ Group" affordance is reachable even when the list is
            empty. */}
        {(filtered.dms.length > 0 || true) && (
          <>
            <div className="cc-dir__section">
              Direct messages
              <button
                type="button"
                className="cc-dir__section-add"
                aria-label="New group message"
                title="New group message"
                onClick={() => setNewGroupDmOpen(true)}
                style={{
                  marginLeft: 'auto',
                  width: 22,
                  height: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: 'var(--ds-text-subtle, #44546F)',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            {filtered.dms.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cc-dir__row${activeId === c.id ? ' cc-dir__row--active' : ''}`}
                onClick={() => onSelectConversation(c.id)}
              >
                <Avatar name={c.title} seed={c.id} className="cc-dir__avatar" />
                <div className="cc-dir__body">
                  <div className="cc-dir__top">
                    <span className="cc-dir__name">{c.title}</span>
                    <span className="cc-dir__time">{relativeShort(c.lastMessageAt)}</span>
                  </div>
                  <div className="cc-dir__preview">
                    {c.lastMessagePreview ?? 'No messages yet'}
                  </div>
                </div>
                {c.unreadCount > 0 && (
                  <span className="cc-dir__unread">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                )}
              </button>
            ))}
          </>
        )}

        {/* Tickets — kind=ticket */}
        {filtered.tickets.length > 0 && (
          <>
            <div className="cc-dir__section">Tickets<span className="cc-dir__section-count">{filtered.tickets.length}</span></div>
            {filtered.tickets.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cc-dir__row${activeId === c.id ? ' cc-dir__row--active' : ''}`}
                onClick={() => onSelectConversation(c.id)}
              >
                <span className="cc-dir__ticket-icon">
                  <JiraIssueTypeIcon type={c.ticketType ?? 'Task'} size={20} />
                </span>
                <div className="cc-dir__body">
                  <div className="cc-dir__top">
                    <span className="cc-dir__name">{c.ticketKey ?? c.title}</span>
                    <span className="cc-dir__time">{relativeShort(c.lastMessageAt)}</span>
                  </div>
                  <div className="cc-dir__preview">{c.lastMessagePreview ?? c.title}</div>
                </div>
                {c.unreadCount > 0 && (
                  <span className="cc-dir__unread">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                )}
              </button>
            ))}
          </>
        )}

        {/* Channels (projects) — admin can create new ad-hoc channels via the
            + button in the section header. Project channels are auto-created
            by the ph_projects INSERT trigger and appear here automatically. */}
        {(filtered.channelRows.length > 0 || isAdmin) && (
          <>
            <div className="cc-dir__section">
              Channels
              {filtered.channelRows.length > 0 && (
                <span className="cc-dir__section-count">{filtered.channelRows.length}</span>
              )}
              <button
                type="button"
                aria-label="Browse all channels"
                title="Browse all channels"
                onClick={() => setBrowseChannelsOpen(true)}
                style={{
                  marginLeft: isAdmin ? 0 : 'auto',
                  width: 22,
                  height: 22,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: 'var(--ds-text-subtle, #44546F)',
                  padding: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.5" y2="16.5" strokeLinecap="round" />
                </svg>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="cc-dir__section-add"
                  aria-label="New channel"
                  title="New channel (admin)"
                  onClick={() => setNewChannelOpen(true)}
                  style={{
                    marginLeft: 'auto',
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: 'var(--ds-text-subtle, #44546F)',
                    padding: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>
            {filtered.channelRows.map(({ project: p, conversation: c }) => (
              <button
                key={p.id}
                type="button"
                className={`cc-dir__row${c && activeId === c.id ? ' cc-dir__row--active' : ''}`}
                disabled={busyId === `channel:${p.key}`}
                onClick={() => {
                  if (c) onSelectConversation(c.id);
                  else handleOpenChannel(p.key);
                }}
                title={c ? `Open #${p.key.toLowerCase()}` : `Join #${p.key.toLowerCase()}`}
              >
                <ProjectIcon projectKey={p.key} size="medium" />
                <div className="cc-dir__body">
                  <div className="cc-dir__top">
                    <span className="cc-dir__name">#{p.key.toLowerCase()}</span>
                    {c && <span className="cc-dir__time">{relativeShort(c.lastMessageAt)}</span>}
                  </div>
                  <div className="cc-dir__preview">
                    {c?.lastMessagePreview ?? (p.name ? `${p.name} · project channel` : 'project channel')}
                  </div>
                </div>
                {c && c.unreadCount > 0 ? (
                  <span className="cc-dir__unread">{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
                ) : !c ? (
                  <span className="cc-dir__msg-cta">
                    {busyId === `channel:${p.key}` ? '…' : 'Join'}
                  </span>
                ) : null}
              </button>
            ))}
          </>
        )}

        {/* People */}
        {filtered.people.length > 0 && (
          <>
            <div className="cc-dir__section">
              People
              <span className="cc-dir__section-count">{filtered.people.length}</span>
            </div>
            {filtered.people.map((p) => {
              const map = idMap?.get(p.id);
              const last = map ? lastSeen?.get(map.profileId) : undefined;
              const status = p.presence === 'available'
                ? PRESENCE_LABEL[p.presence]
                : last ? `Last seen ${relativeShort(last)} ago` : PRESENCE_LABEL[p.presence];
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
                    <div className="cc-dir__preview">
                      {p.role ? `${p.role} · ${status}` : status}
                    </div>
                  </div>
                  <span className="cc-dir__msg-cta">
                    {busyId === p.id ? '…' : 'Message'}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {isLoading && filtered.dms.length === 0 && filtered.tickets.length === 0 && filtered.channelRows.length === 0 && filtered.people.length === 0 && (
          <div className="cc-dir__empty">Loading teammates…</div>
        )}

        {!isLoading && query && filtered.dms.length === 0 && filtered.tickets.length === 0 && filtered.channelRows.length === 0 && filtered.people.length === 0 && (
          <div className="cc-dir__empty">No matches for "{query}".</div>
        )}
      </div>
    </div>
  );
}

export default DockDirectory;
