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
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { useStartProjectChannel } from '@/hooks/chat/useStartProjectChannel';
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

  const people = useMemo(() => groups.flatMap((g) => g.people), [groups]);

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
    const dms = live.filter((c) => c.kind === 'dm');
    const channelConvs = live.filter((c) => c.kind === 'channel');
    const tickets = live.filter((c) => c.kind === 'ticket');

    // Merge project list with existing channel conversations
    const channelByProjectKey = new Map<string, typeof conversations[number]>();
    channelConvs.forEach((c) => {
      if (c.projectKey) channelByProjectKey.set(c.projectKey, c);
    });

    const channelRows = projects
      .filter((p) => !q || p.key.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q))
      .map((p) => ({
        project: p,
        conversation: channelByProjectKey.get(p.key) ?? null,
      }));

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
        {/* Direct messages — kind=dm only */}
        {filtered.dms.length > 0 && (
          <>
            <div className="cc-dir__section">Direct messages</div>
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
                <span className="cc-dir__channel-glyph" style={{ background: 'var(--ds-background-brand-bold, #0C66E4)', fontSize: 11 }}>
                  {(c.ticketKey ?? 'TK').slice(0, 5)}
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
                <span className="cc-dir__channel-glyph">#</span>
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
