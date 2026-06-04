/**
 * TeamPulseTab — manager-only "Team Pulse" tab on the For You page.
 *
 * Layout:
 *   ┌─ Rail (256px) ──────┐  ┌─ R360MemberDetail ──────────────────┐
 *   │ My Team (8)   [⟪]   │  │  (ring / chronology / board for      │
 *   │ 5 online · 2 leave  │  │   selected member, or self if none)  │
 *   │──────────────────── │  │                                      │
 *   │ ONLINE              │  │                                      │
 *   │ [●] Alice Chen      │  │                                      │
 *   │     Active now      │  │                                      │
 *   │ ON LEAVE            │  │                                      │
 *   │ [○] Bob Kumar       │  │                                      │
 *   │     Back Thursday   │  │                                      │
 *   └─────────────────────┘  └──────────────────────────────────────┘
 *
 * Visible only to team_lead / program_manager / admin.
 * Members are scoped to projects the current user belongs to.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { useTeamPulseManagedTeam, type TeamPulseMember } from '@/hooks/useTeamPulse';
import { useMyR360ResourceId } from '@/hooks/useR360PanelData';
import { PresenceRing } from '@/components/shared/PresenceRing';
import { typedQuery } from '@/integrations/supabase/client';
import R360MemberDetail from '@/pages/R360MemberDetail';
import type { PresenceState } from '@/lib/presence';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Offline';
  const diffMin = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 60_000);
  if (diffMin < 1) return 'Active now';
  if (diffMin < 60) return `Active ${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Active ${diffH}h ago`;
  return 'Offline';
}

function formatBackOn(backOn: string | null): string {
  if (!backOn) return 'On leave';
  const d = new Date(backOn);
  const diffDays = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (diffDays <= 0) return 'Back today';
  if (diffDays === 1) return 'Back tomorrow';
  if (diffDays < 7) return `Back ${d.toLocaleDateString('en', { weekday: 'long' })}`;
  return `Back ${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
}

function statusLine(m: TeamPulseMember): string {
  switch (m.effective_state as PresenceState) {
    case 'available': return formatLastSeen(m.last_seen_at ?? null);
    case 'away':      return 'Away';
    case 'busy':      return 'Busy';
    case 'on_leave':  return formatBackOn((m as any).back_on ?? null);
    case 'offline':   return formatLastSeen(m.last_seen_at ?? null);
    default:          return 'Offline';
  }
}

function leaveTooltip(m: TeamPulseMember): string | undefined {
  if ((m.effective_state as PresenceState) !== 'on_leave') return undefined;
  const back = formatBackOn((m as any).back_on ?? null);
  return `On leave · ${back}`;
}

// ─── Lookup: user_id → resource_inventory.id ─────────────────────────────────

function useResourceIdForUser(userId: string | null) {
  return useQuery<string | null>({
    queryKey: ['team-pulse-resource-id', userId ?? ''],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await typedQuery('resource_inventory')
        .select('id')
        .eq('profile_id', userId)
        .maybeSingle();
      return (data as any)?.id ?? null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, active, onClick }: {
  member: TeamPulseMember;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const state = (member.effective_state ?? 'offline') as PresenceState;
  const tip = leaveTooltip(member);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={active}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px',
        borderRadius: 4,
        border: 'none',
        borderInlineStart: active
          ? `2px solid ${token('color.border.brand', '#0052CC')}`
          : '2px solid transparent',
        background: active
          ? token('color.background.selected', '#DEEBFF')
          : hover
            ? token('color.background.neutral.subtle.hovered', '#F1F2F4')
            : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 120ms ease',
      }}
    >
      <PresenceRing
        name={member.full_name}
        src={member.avatar_url}
        size="small"
        state={state}
        tooltip={tip}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active
            ? token('color.text.selected', '#0052CC')
            : token('color.text', '#292A2E'),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {member.full_name ?? 'Unknown'}
        </div>
        <div style={{
          fontSize: 11,
          color: token('color.text.subtle', '#6B778C'),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {statusLine(member)}
        </div>
      </div>
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <div style={{
      padding: '8px 8px 4px',
      fontSize: 11,
      fontWeight: 600,
      color: token('color.text.subtlest', '#6B778C'),
    }}>
      {label} ({count})
    </div>
  );
}

// ─── Rail ─────────────────────────────────────────────────────────────────────

function TeamPulseRail({
  members,
  isLoading,
  selectedUserId,
  onSelect,
}: {
  members: TeamPulseMember[];
  isLoading: boolean;
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = search.trim()
    ? members.filter(m => (m.full_name ?? '').toLowerCase().includes(search.toLowerCase()))
    : members;

  const online  = filtered.filter(m => m.effective_state === 'available');
  const away    = filtered.filter(m => m.effective_state === 'away' || m.effective_state === 'busy');
  const onLeave = filtered.filter(m => m.effective_state === 'on_leave');
  const offline = filtered.filter(m => m.effective_state === 'offline' || !m.effective_state);

  // Aggregate counts (unfiltered)
  const totalOnline  = members.filter(m => m.effective_state === 'available').length;
  const totalAway    = members.filter(m => m.effective_state === 'away' || m.effective_state === 'busy').length;
  const totalOnLeave = members.filter(m => m.effective_state === 'on_leave').length;

  const aggrParts: string[] = [];
  if (totalOnline > 0)  aggrParts.push(`${totalOnline} online`);
  if (totalOnLeave > 0) aggrParts.push(`${totalOnLeave} on leave`);
  if (totalAway > 0)    aggrParts.push(`${totalAway} away`);

  return (
    <div
      data-testid="team-pulse-rail"
      style={{
        width: 256,
        flexShrink: 0,
        borderInlineEnd: `1px solid ${token('color.border', '#091E4224')}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        maxHeight: 'calc(100vh - 200px)',
        alignSelf: 'flex-start',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px 8px',
        borderBottom: `1px solid ${token('color.border.subtle', '#091E421F')}`,
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: token('color.text', '#292A2E'),
          marginBottom: 4,
        }}>
          My Team ({members.length})
        </div>
        {aggrParts.length > 0 && (
          <div style={{
            fontSize: 11,
            color: token('color.text.subtle', '#6B778C'),
          }}>
            {aggrParts.join(' · ')}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '4px 8px',
            fontSize: 12,
            border: `2px solid ${searchFocused ? token('color.border.focused', '#388BFF') : token('color.border.input', '#8590A2')}`,
            borderRadius: 3,
            background: token('color.background.input', '#FAFBFC'),
            color: token('color.text', '#292A2E'),
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Scrollable list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 8px 12px' }}>
        {/* "← My view" return affordance */}
        {selectedUserId !== null && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px',
              marginBottom: 4,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: token('color.text.brand', '#0052CC'),
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'); }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            ← My view
          </button>
        )}

        {isLoading && (
          <div style={{ padding: 16, fontSize: 12, color: token('color.text.subtlest', '#6B778C'), textAlign: 'center' }}>
            Loading…
          </div>
        )}

        {!isLoading && members.length === 0 && (
          <div style={{ padding: 16, fontSize: 12, color: token('color.text.subtlest', '#6B778C'), textAlign: 'center' }}>
            No team members found.
          </div>
        )}

        <SectionHeader label="Online" count={online.length} />
        {online.map(m => (
          <MemberRow key={m.user_id} member={m} active={selectedUserId === m.user_id} onClick={() => onSelect(m.user_id)} />
        ))}

        <SectionHeader label="Away / Busy" count={away.length} />
        {away.map(m => (
          <MemberRow key={m.user_id} member={m} active={selectedUserId === m.user_id} onClick={() => onSelect(m.user_id)} />
        ))}

        <SectionHeader label="On Leave" count={onLeave.length} />
        {onLeave.map(m => (
          <MemberRow key={m.user_id} member={m} active={selectedUserId === m.user_id} onClick={() => onSelect(m.user_id)} />
        ))}

        <SectionHeader label="Offline" count={offline.length} />
        {offline.map(m => (
          <MemberRow key={m.user_id} member={m} active={selectedUserId === m.user_id} onClick={() => onSelect(m.user_id)} />
        ))}

        {search.trim() && filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: token('color.text.subtlest', '#6B778C'), textAlign: 'center' }}>
            No match
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TeamPulseTab() {
  const { data, isLoading } = useTeamPulseManagedTeam();
  const { data: myResourceId } = useMyR360ResourceId();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const members = data?.members ?? [];

  // Resolve selected user's resource_inventory.id (lazy, only when someone is selected).
  const { data: selectedResourceId, isLoading: resLoading } = useResourceIdForUser(selectedUserId);

  // Show selected member's ring, or own ring when nothing selected.
  const activeResourceId = selectedUserId ? selectedResourceId : myResourceId;

  // Pass OOO context to the ring so it can render the overlay.
  const selectedMember = selectedUserId ? members.find(m => m.user_id === selectedUserId) : null;

  return (
    <div
      data-testid="team-pulse-tab"
      style={{
        display: 'flex',
        gap: 0,
        minHeight: 600,
        alignItems: 'flex-start',
      }}
    >
      <TeamPulseRail
        members={members}
        isLoading={isLoading}
        selectedUserId={selectedUserId}
        onSelect={setSelectedUserId}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {resLoading && selectedUserId ? (
          <div style={{ padding: 48, textAlign: 'center', fontSize: 14, color: token('color.text.subtle', '#6B778C') }}>
            Loading…
          </div>
        ) : activeResourceId ? (
          <R360MemberDetail
            resourceId={activeResourceId}
            embedded
            effectiveState={selectedMember?.effective_state ?? null}
            backOn={(selectedMember as any)?.back_on ?? null}
          />
        ) : (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: token('color.text.subtle', '#6B778C'),
            fontSize: 14,
          }}>
            {selectedUserId
              ? 'This team member has no Resource 360° profile yet.'
              : 'No resource profile found for your account. Ask your admin to link your profile.'}
          </div>
        )}
      </div>
    </div>
  );
}
