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
 * │  │  ● Me            │  │  (ring / chronology / board)       │   │
 * │  │  · Alice Tan     │  │                                    │   │
 * │  │  · Bob Smith     │  │                                    │   │
 * │  └──────────────────┘  └────────────────────────────────────┘   │
 * │                                                                  │
 * │  Narrow (<1200px): horizontal pill strip at top (unchanged)      │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * For ICs: no picker shown; only their own view is rendered.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyR360ResourceId, useTeamResourceIds } from '@/hooks/useR360PanelData';
import { useAuth } from '@/lib/auth';
import R360MemberDetail from '@/pages/R360MemberDetail';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamResource { id: string; name: string; role_name: string | null; avatar_url: string | null }

// ─── Sidebar roster row ───────────────────────────────────────────────────────

function SidebarMemberRow({
  name, sublabel, avatarUrl, active, onClick, isMe,
}: {
  name: string;
  sublabel?: string | null;
  avatarUrl?: string | null;
  active: boolean;
  onClick: () => void;
  isMe?: boolean;
}) {
  const [hover, setHover] = React.useState(false);

  const initials = (n: string) =>
    n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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
        gap: 10,
        width: '100%',
        padding: '8px 12px',
        borderRadius: 6,
        border: 'none',
        borderInlineStart: active ? `3px solid ${token('color.border.brand', 'var(--cp-primary-60, #0052CC)')}` : '3px solid transparent',
        background: active
          ? token('color.background.selected', '#DEEBFF')
          : hover
            ? token('color.background.neutral.subtle.hovered', '#F1F2F4')
            : 'transparent',
        cursor: 'pointer',
        transition: 'all 120ms ease',
        textAlign: 'left' as const,
      }}
    >
      {/* Avatar (28px) */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isMe
          ? `linear-gradient(135deg,${token('color.background.information.bold', 'var(--cp-primary-60, #0052CC)')},${token('color.background.success.bold', '#1F845A')})`
          : token('color.background.neutral', '#F1F2F4'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        border: `1px solid ${token('color.border', '#091E4224')}`,
        position: 'relative' as const,
      }}>
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span style={{ fontSize: 10, fontWeight: 700, color: isMe ? token('color.text.inverse', '#FFFFFF') : token('color.text.subtle', '#626F86') }}>
          {isMe ? 'Me' : initials(name)}
        </span>
      </div>

      {/* Name + role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: active ? 600 : 400,
          color: active ? token('color.text.selected', 'var(--cp-primary-60, #0052CC)') : token('color.text', '#172B4D'),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        {sublabel && (
          <div style={{
            fontSize: 10, color: token('color.text.subtlest', '#8590A2'),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sublabel}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Section label (used by both "Your view" and "Team members") ─────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600,
      color: token('color.text.subtlest', '#8590A2'),
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    }}>
      {children}
    </div>
  );
}

// ─── Sidebar container ────────────────────────────────────────────────────────

function SidebarRoster({
  team, selectedId, onSelect,
}: {
  team: TeamResource[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [search, setSearch] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  const filtered = search.trim()
    ? team.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.role_name ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : team;

  return (
    <div
      data-testid="r360-roster-sidebar"
      style={{
        // Widened 200 → 220 (design-critique 2026-05-17 H6 P1) — at 200px
        // names like "Ayaz Muhammad" and "Divyam Kshatriya" were forced to
        // truncate to "Ayaz Muhamm…" / "Divyam Kshatri…". The extra 20px
        // fits the longest BAU-team display names without ellipsis while
        // keeping the sidebar comfortably inside the 1200px viewport.
        width: 220, flexShrink: 0,
        borderInlineEnd: `1px solid ${token('color.border', '#091E4224')}`,
        display: 'flex', flexDirection: 'column',
        position: 'sticky',
        top: 0,
        maxHeight: 'calc(100vh - 200px)',
        alignSelf: 'flex-start',
        // No overflowY here — only the list section below scrolls
      }}
    >
      {/* ── Team members (header + search, then scrollable list) ─────────────
          The "Your view / Me" tile was removed 2026-05-17 — the detail panel
          header (right side: avatar + name + role + active/stale badge) is
          already the identity indicator. Re-stating "Me" in the picker was
          redundant. When the user is viewing a teammate, a small "← My view"
          link appears at the top of the list as the return affordance. */}
      <div style={{
        flexShrink: 0,
        padding: '12px 12px 8px',
        background: token('elevation.surface', '#FFFFFF'),
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
            padding: '5px 8px',
            fontSize: 12,
            border: `2px solid ${focused ? token('color.border.focused', '#388BFF') : token('color.border.input', '#8590A2')}`,
            borderRadius: 3,
            background: token('color.background.input', '#FAFBFC'),
            color: token('color.text', '#172B4D'),
            outline: 'none',
            boxSizing: 'border-box' as const,
            transition: 'border-color 120ms ease',
          }}
        />
      </div>

      {/* Scrollable team list */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '4px 12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* "← My view" return link — only shown when viewing a teammate. */}
        {selectedId !== null && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              marginBottom: 6,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              color: token('color.text.brand', 'var(--cp-primary-60, #0052CC)'),
              background: 'transparent',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'); }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            ← My view
          </button>
        )}

        {filtered.map(r => (
          <SidebarMemberRow
            key={r.id}
            name={r.name}
            sublabel={r.role_name}
            avatarUrl={r.avatar_url}
            active={selectedId === r.id}
            onClick={() => onSelect(r.id)}
          />
        ))}

        {search.trim() && filtered.length === 0 && (
          <div style={{
            padding: '12px',
            fontSize: 12,
            color: token('color.text.subtlest', '#8590A2'),
            textAlign: 'center' as const,
          }}>
            No match
          </div>
        )}

        {!search.trim() && filtered.length === 0 && (
          <div style={{
            padding: '12px',
            fontSize: 12,
            color: token('color.text.subtlest', '#8590A2'),
            textAlign: 'center' as const,
          }}>
            No team members yet
          </div>
        )}
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
        padding: '5px 14px', borderRadius: 20,
        border: active
          ? `2px solid ${token('color.border.brand', 'var(--cp-primary-60, #0052CC)')}`
          : `1px solid ${token('color.border', '#DFE1E6')}`,
        background: active
          ? token('color.background.selected', '#DEEBFF')
          : hover ? token('color.background.neutral.hovered', '#EBECF0') : token('elevation.surface', '#FFFFFF'),
        cursor: 'pointer', transition: 'all 120ms ease', gap: 1,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? token('color.text.selected', 'var(--cp-primary-60, #0052CC)') : token('color.text', '#172B4D'), whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 10, color: token('color.text.subtle', '#6B778C'), whiteSpace: 'nowrap' }}>
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
      <div style={{ height: 120, borderRadius: 8, marginBottom: 16, background: token('color.background.neutral', '#F4F5F7'), animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: 400, borderRadius: 8, background: token('color.background.neutral', '#F4F5F7'), animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

// Sidebar shows when viewport is wide enough OR when the team is too large for pills.
// Uses viewport width (innerWidth) — not container offsetWidth — because the panel
// sits inside a padded card that significantly under-reports its own width (CLAUDE.md 2026-05-11).
const WIDE_THRESHOLD = 900;
// Pill strip is only usable for very small teams. Beyond this count the sidebar
// (with its search box) is always used regardless of viewport width.
const MAX_PILLS_TEAM = 5;

export default function R360Panel() {
  const { user } = useAuth();
  const { isTeamLead } = useUserRole();
  const { data: myResourceId, isLoading: idLoading } = useMyR360ResourceId();
  const { data: teamResources = [], isLoading: teamLoading } = useTeamResourceIds(
    isTeamLead ? (user?.id ?? null) : null,
  );

  // null = "show my own view"; a resource ID string = "show that member's view"
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Responsive layout: sidebar on wide viewports, pill strip on narrow.
  // Uses viewport width (innerWidth) — the panel container shrinks significantly
  // inside the For You card padding, so container width would under-report.
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= WIDE_THRESHOLD : false,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsWide(window.innerWidth >= WIDE_THRESHOLD);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const activeResourceId = selectedId ?? myResourceId ?? null;
  const hasTeam = isTeamLead && !teamLoading && teamResources.length > 0;
  // Use sidebar when wide enough OR when team is too large for the pill strip
  const useSidebar = hasTeam && (isWide || teamResources.length > MAX_PILLS_TEAM);

  if (idLoading) return <R360Skeleton />;

  if (!activeResourceId) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        color: token('color.text.subtle', '#6B778C'), fontSize: 14,
      }}>
        No resource profile found for your account.{' '}
        <span style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
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
        /* ── Sidebar roster (wide viewport OR large team) ── */
        <SidebarRoster
          team={teamResources}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      ) : hasTeam ? (
        // Narrow pill strip — only for small teams (≤ MAX_PILLS_TEAM).
        // "Me" pill removed 2026-05-17 — the R360MemberDetail header is the
        // identity indicator (avatar + name + role). When viewing a teammate,
        // a "← My view" pill renders at the start of the strip as the return
        // affordance.
        <div
          role="tablist"
          aria-label="Team member view"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 0 16px', flexWrap: 'wrap',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            marginBottom: 8,
          }}
        >
          {selectedId !== null && (
            <MemberPill
              label="← My view"
              active={false}
              onClick={() => handleSelect(null)}
            />
          )}
          {teamResources.map(r => (
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

      {/* ── R360 weekly view (fills remaining space) ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <R360MemberDetail resourceId={activeResourceId} embedded />
      </div>
    </div>
  );
}
