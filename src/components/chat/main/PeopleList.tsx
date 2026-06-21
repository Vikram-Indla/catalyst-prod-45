/**
 * PeopleList — 300px middle pane shown when railKey === 'people'.
 * Enterprise pattern: browse all teammates (resource_inventory + profiles),
 * grouped by presence (Slack/Teams parity), click → start DM via RPC.
 */
import React, { useMemo, useState } from 'react';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { useStartDm } from '@/hooks/chat/useStartDm';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from './avatar';
import type { ChatPresence, ChatPerson } from '@/types/chat';

const PRESENCE_LABEL: Record<ChatPresence, string> = {
  onsite: 'In office',
  remote: 'Remote',
  away: 'Away',
  on_leave: 'On leave',
};

const PRESENCE_TONE: Record<ChatPresence, 'green' | 'blue' | 'amber' | 'grey'> = {
  onsite: 'green',
  remote: 'blue',
  away: 'amber',
  on_leave: 'grey',
};

interface PeopleListProps {
  onConversationCreated: (id: string) => void;
}

export function PeopleList({ onConversationCreated }: PeopleListProps) {
  const { user } = useAuth();
  const { groups, isLoading } = useChatPeople();
  const startDm = useStartDm();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Map resource_inventory.id → profile_id for RPC call
  const { data: idMap } = useQuery({
    queryKey: ['chat', 'people', 'resource-to-profile'],
    queryFn: async () => {
      const { data } = await supabase
        .from('resource_inventory')
        .select('id, profile_id')
        .eq('is_active', true)
        .not('profile_id', 'is', null);
      const map = new Map<string, string>();
      (data ?? []).forEach((r: any) => {
        if (r.profile_id) map.set(r.id, r.profile_id);
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        people: g.people.filter((p) =>
          p.name.toLowerCase().includes(q) || (p.role ?? '').toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.people.length > 0);
  }, [groups, query]);

  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.people.length, 0),
    [groups],
  );

  const handleStartDm = async (person: ChatPerson) => {
    const profileId = idMap?.get(person.id);
    if (!profileId || !user) return;
    if (profileId === user.id) return; // self — guard
    setBusyId(person.id);
    try {
      const convId = await startDm.mutateAsync(profileId);
      onConversationCreated(convId);
    } catch (e) {
      console.error('Failed to start DM:', e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="cc-convlist">
      <div className="cc-cl-head">
        <div className="cc-cl-head__ttl">People</div>
        <span className="cc-cl-head__count">{totalCount}</span>
      </div>

      <div className="cc-cl-search">
        <div className="cc-cl-search__inp" style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--ds-text, #172B4D)',
              padding: 0,
            }}
          />
        </div>
      </div>

      <div className="cc-cl-scroll">
        {isLoading && (
          <div className="cc-empty">Loading teammates…</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="cc-empty">
            {query ? `No people match "${query}".` : 'No teammates found.'}
          </div>
        )}

        {filtered.map((group) => (
          <div key={group.presence}>
            <div className="cc-people-section">
              <span
                className="cc-people-section__dot"
                data-tone={PRESENCE_TONE[group.presence]}
              />
              <span className="cc-people-section__label">
                {PRESENCE_LABEL[group.presence]}
              </span>
              <span className="cc-people-section__count">{group.people.length}</span>
            </div>
            {group.people.map((person) => (
              <button
                key={person.id}
                type="button"
                className="cc-row cc-people-row"
                disabled={busyId === person.id}
                onClick={() => handleStartDm(person)}
              >
                <Avatar
                  name={person.name}
                  seed={person.id}
                  className="cc-dmav"
                  presence={PRESENCE_TONE[person.presence]}
                />
                <div className="cc-row__grow">
                  <div className="cc-name-row">
                    <span className="cc-nm">{person.name}</span>
                  </div>
                  <div className="cc-preview">
                    {person.role ?? PRESENCE_LABEL[person.presence]}
                  </div>
                </div>
                {/* Loading spinner only — Slack/Teams parity: the row IS the
                    affordance. No hover-only "Message" button, no tooltip.
                    (2026-06-08 design-critique.) */}
                {busyId === person.id && (
                  <span aria-hidden style={{ display: 'inline-flex' }}>
                    <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="9" opacity="0.25" />
                      <path d="M21 12a9 9 0 0 0-9-9" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PeopleList;
