/**
 * R360Panel — "Resource 360°" tab in the For You page.
 *
 * Renders the full R360MemberDetail weekly view (ring / chronology / board)
 * for the current user, embedded inside the For You tab strip.
 *
 * Layout — Decision B (preflight 2026-05-11):
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  Wide (≥1200px):                                                 │
 * │  ┌─ Roster sidebar ─┐  ┌─ R360MemberDetail ────────────────┐   │
 * │  │  · Alice Tan     │  │  (ring / chronology / board)       │   │
 * │  │  · Bob Smith     │  │                                    │   │
 * │  └──────────────────┘  └────────────────────────────────────┘   │
 * │                                                                  │
 * │  Narrow (<1200px): horizontal pill strip at top (unchanged)      │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Self-view excluded — sidebar always shows teammates only.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { PresenceRing } from '@/components/shared/PresenceRing';
import type { PresenceState } from '@/lib/presence';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyR360ResourceId, useTeamResourceIds } from '@/hooks/useR360PanelData';
import { useAuth } from '@/lib/auth';
import { useTeamPulseManagedTeam } from '@/hooks/useTeamPulse';
import R360MemberDetail from '@/pages/R360MemberDetail';


// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamResource { id: string; profile_id: string; name: string; role_name: string | null; avatar_url: string | null }

// ─── Sidebar roster row ───────────────────────────────────────────────────────

function SidebarMemberRow({
  name, sublabel, avatarUrl, active, onClick, presenceState, backOn,
}: {
  name: string;
  sublabel?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  onClick: () => void;
  presenceState?: string;
  backOn?: string | null;
}) {
  const [hover, setHover] = React.useState(false);

  let pillBg = token('color.background.neutral', 'var(--ds-background-neutral)');
  let pillColor = token('color.text.subtle', 'var(--ds-icon)');
  let pillText = 'Away';

  if (presenceState === 'available' || presenceState === 'active' || presenceState === 'on_site') {
    pillBg = token('color.background.success.subtle', 'var(--ds-background-success)');
    pillColor = token('color.text.success', 'var(--ds-text-success)');
    pillText = 'On site';
  } else if (presenceState === 'remote') {
    pillBg = token('color.background.information.subtle', 'var(--ds-background-selected)');
    pillColor = token('color.text.information', 'var(--ds-link)');
    pillText = 'Remote';
  } else {
    pillBg = token('color.background.neutral', 'var(--ds-background-neutral)');
    pillColor = token('color.text.subtle', 'var(--ds-icon)');
    pillText = 'Away';
    if (backOn) {
      pillText = `Away · Back ${new Date(backOn).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
    }
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '8px 12px',
        borderRadius: 8,
        border: 'none',

        borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        background: active
          ? token('color.background.selected', 'var(--ds-background-selected)')
          : hover
            ? token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle)')
            : 'transparent',
        cursor: 'pointer',
        transition: 'all 120ms ease',
        textAlign: 'left' as const,
      }}
    >
      <PresenceRing name={name} src={avatarUrl ?? null} size="small" state={(presenceState ?? 'away') as PresenceState} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 'var(--ds-font-size-300)', fontWeight: active ? 600 : 400,
          color: active ? token('color.text.selected', 'var(--ds-link)') : token('color.text', 'var(--ds-text, var(--ds-text))'),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        {sublabel && (
          <div style={{
            fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sublabel}
          </div>
        )}
        <div style={{
          marginTop: 4,
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0px 8px',
          borderRadius: 8,
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 500,
          background: pillBg,
          color: pillColor,
          whiteSpace: 'nowrap',
        }}>
          {pillText}
        </div>
      </div>
    </button>
  );
}

// ─── Section label (used by "Team members") ─────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
      color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
    }}>
      {children}
    </div>
  );
}

// ─── Sidebar container ────────────────────────────────────────────────────────

function SidebarRoster({
  team, selectedId, onSelect, pulseMap,
}: {
  team: TeamResource[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  pulseMap: Map<string, { state: string; backOn: string | null }>;
}) {
  const [search, setSearch] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  const filtered = search.trim()
    ? team.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.role_name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : team;

  const selectedIndex = selectedId ? team.findIndex(r => r.id === selectedId) + 1 : 0;

  return (
    <div
      data-testid="r360-roster-sidebar"
      style={{
        width: 220, flexShrink: 0,
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 8,
        display: 'flex', flexDirection: 'column',
        position: 'sticky',
        top: 0,
        maxHeight: 'calc(100vh - 200px)',
        alignSelf: 'flex-start',
        background: token('elevation.surface', 'var(--ds-surface)'),
        overflow: 'hidden',
      }}
    >
      <div style={{
        flexShrink: 0,
        padding: '12px 12px 8px',
        background: token('elevation.surface', 'var(--ds-surface)'),
      }}>
        <SectionLabel>Team members</SectionLabel>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '4px 8px',
            fontSize: 'var(--ds-font-size-200)',
            border: `2px solid ${focused ? token('color.border.focused', 'var(--ds-border-focused)') : token('color.border.input', 'var(--ds-text-disabled, var(--ds-border-bold))')}`,
            borderRadius: 3,
            background: token('color.background.input', 'var(--ds-surface-sunken)'),
            color: token('color.text', 'var(--ds-text)'),
            outline: 'none',
            boxSizing: 'border-box' as const,
            transition: 'border-color 120ms ease',
          }}
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.map(r => {
          const pulse = pulseMap.get(r.profile_id);
          return (
            <SidebarMemberRow
              key={r.id}
              name={r.name}
              sublabel={r.role_name}
              avatarUrl={r.avatar_url}
              active={selectedId === r.id}
              onClick={() => onSelect(r.id)}
              presenceState={pulse?.state}
              backOn={pulse?.backOn}
            />
          );
        })}

        {search.trim() && filtered.length === 0 && (
          <div style={{
            padding: '12px',
            fontSize: 'var(--ds-font-size-200)',
            color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
            textAlign: 'center' as const,
          }}>
            No match
          </div>
        )}

        {!search.trim() && filtered.length === 0 && (
          <div style={{
            padding: '12px',
            fontSize: 'var(--ds-font-size-200)',
            color: token('color.text.subtlest', 'var(--ds-text-disabled)'),
            textAlign: 'center' as const,
          }}>
            No team members yet
          </div>
        )}
      </div>

      {/* Footer — resource counter */}
      <div style={{
        flexShrink: 0,
        padding: '8px 12px',
        borderTop: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        background: token('elevation.surface.sunken', 'var(--ds-surface-sunken)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 500,
          color: token('color.text.subtle', 'var(--ds-icon)'),
          fontVariantNumeric: 'tabular-nums',
        }}>
          {selectedIndex > 0 ? selectedIndex : '–'} of {team.length}
        </span>
      </div>
    </div>
  );
}

// ─── Horizontal pill strip (narrow fallback) ──────────────────────────────────

function MemberPill({
  label, sublabel, active, onClick,
}: {
  label: string; sublabel?: string; active: boolean; onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
        padding: '4px 16px', borderRadius: 20,
        border: active
          ? `2px solid ${token('color.border.brand', 'var(--ds-link)')}`
          : `1px solid ${token('color.border', 'var(--ds-border)')}`,
        background: active
          ? token('color.background.selected', 'var(--ds-background-information)')
          : hover ? token('color.background.neutral.hovered', 'var(--ds-border)') : token('elevation.surface', 'var(--ds-surface)'),
        cursor: 'pointer', transition: 'all 120ms ease', gap: 0,
      }}
    >
      <span style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: active ? 600 : 400, color: active ? token('color.text.selected', 'var(--ds-link)') : token('color.text', 'var(--ds-text, var(--ds-text))'), whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtle', 'var(--ds-text-subtlest)'), whiteSpace: 'nowrap' }}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function R360Skeleton() {
  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ height: 120, borderRadius: 8, marginBottom: 16, background: token('color.background.neutral', 'var(--ds-background-neutral-subtle)'), animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 400, borderRadius: 8, background: token('color.background.neutral', 'var(--ds-background-neutral-subtle)'), animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

const WIDE_THRESHOLD = 900;
const MAX_PILLS_TEAM = 5;

export interface R360PanelViewProps {
  resourceId: string | null;
  isLoading: boolean;
}

export function R360PanelView({ resourceId, isLoading }: R360PanelViewProps) {
  if (isLoading) return <R360Skeleton />;
  if (!resourceId) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        color: token('color.text.subtle', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-400)',
      }}>
        No resource profile found for your account.
      </div>
    );
  }
  return (
    <div style={{ minHeight: 600 }}>
      <R360MemberDetail resourceId={resourceId} embedded />
    </div>
  );
}

export default function R360Panel() {
  const { user } = useAuth();
  const { isTeamLead } = useUserRole();
  const { data: myResourceId, isLoading: idLoading } = useMyR360ResourceId();
  const { data: teamResources = [], isLoading: teamLoading } = useTeamResourceIds(
    isTeamLead ? (user?.id ?? null) : null,
  );
  const { data: pulseData } = useTeamPulseManagedTeam();

  const pulseMap = React.useMemo(() => {
    const m = new Map<string, { state: string; backOn: string | null }>();
    if (pulseData?.members) {
      for (const member of pulseData.members) {
        if (member.user_id) {
          m.set(member.user_id, { state: member.effective_state ?? 'offline', backOn: member.back_on ?? null });
        }
      }
    }
    return m;
  }, [pulseData]);

  const filteredTeam = React.useMemo(
    () => teamResources.filter(r => r.id !== myResourceId),
    [teamResources, myResourceId],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (filteredTeam.length > 0 && selectedId === null) {
      setSelectedId(filteredTeam[0].id);
    }
  }, [filteredTeam, selectedId]);

  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= WIDE_THRESHOLD : false,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsWide(window.innerWidth >= WIDE_THRESHOLD);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const activeResourceId = selectedId ?? myResourceId ?? null;
  const hasTeam = isTeamLead && !teamLoading && filteredTeam.length > 0;
  const useSidebar = hasTeam && (isWide || filteredTeam.length > MAX_PILLS_TEAM);

  if (idLoading) return <R360Skeleton />;

  if (!activeResourceId) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        color: token('color.text.subtle', 'var(--ds-text-subtlest)'), fontSize: 'var(--ds-font-size-400)',
      }}>
        No resource profile found for your account.{' '}
        <span style={{ fontSize: 'var(--ds-font-size-200)', display: 'block', marginTop: 8 }}>
          Ask your admin to link your profile to a resource entry.
        </span>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      data-testid="r360-panel"
      style={{
        display: 'flex',
        flexDirection: useSidebar ? 'row' : 'column',
        gap: 0,
        minHeight: 600,
        alignItems: 'flex-start',
      }}
    >
      {useSidebar ? (
        <SidebarRoster
          team={filteredTeam}
          selectedId={selectedId}
          onSelect={handleSelect}
          pulseMap={pulseMap}
        />
      ) : hasTeam ? (
        <div
          role="tablist"
          aria-label="Team member view"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 0 16px', flexWrap: 'wrap',
            borderBottom: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            marginBottom: 8,
          }}
        >
          {filteredTeam.map(r => (
            <MemberPill
              key={r.id}
              label={r.name}
              sublabel={r.role_name ?? undefined}
              active={selectedId === r.id}
              onClick={() => handleSelect(r.id)}
            />
          ))}
        </div>
      ) : null}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: token('elevation.surface', 'var(--ds-surface)') }}>
        <R360MemberDetail
          resourceId={activeResourceId}
          embedded
          effectiveState={selectedId ? pulseMap.get(filteredTeam.find(r => r.id === selectedId)?.profile_id ?? '')?.state : undefined}
          backOn={selectedId ? pulseMap.get(filteredTeam.find(r => r.id === selectedId)?.profile_id ?? '')?.backOn : undefined}
        />
      </div>
    </div>
  );
}
