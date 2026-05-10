/**
 * R360Panel — "Resource 360°" tab in the For You page.
 *
 * Renders the full R360MemberDetail weekly view (ring / chronology / board)
 * for the current user, embedded inside the For You tab strip.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  [Me ●]  [Alice Tan]  [Bob Smith]  …  ← team picker (leads only) │
 * ├──────────────────────────────────────────────────────────────────┤
 * │  ┌── sticky profile header ─────────────────────────────────┐   │
 * │  │  Avatar · Name · Role · Country · Schedule 1-on-1        │   │
 * │  │  OPEN 12  STALE 3  │  Release stats row                  │   │
 * │  │  Ring ● Chronology  Board  │  ◀ Week 18  ▶               │   │
 * │  └───────────────────────────────────────────────────────────┘   │
 * │                                                                  │
 * │  [ring / chronology / board view — week-scoped tickets]          │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * For leads: a pill strip at the top lets them switch to any team member's
 * view. The "Me" pill always restores their own view.
 *
 * For ICs: no picker shown; only their own view is rendered.
 */
import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyR360ResourceId, useTeamResourceIds } from '@/hooks/useR360PanelData';
import { useAuth } from '@/lib/auth';
import R360MemberDetail from '@/pages/R360MemberDetail';

// ─── Team member picker ───────────────────────────────────────────────────────

interface TeamResource { id: string; name: string; role_name: string | null }

function MemberPill({
  label,
  sublabel,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '5px 14px',
        borderRadius: 20,
        border: active
          ? `2px solid ${token('color.border.brand', '#0052CC')}`
          : `1px solid ${token('color.border', '#DFE1E6')}`,
        background: active
          ? token('color.background.selected', '#DEEBFF')
          : hover
            ? token('color.background.neutral.hovered', '#EBECF0')
            : token('elevation.surface', '#FFFFFF'),
        cursor: 'pointer',
        transition: 'all 120ms ease',
        gap: 1,
      }}
    >
      <span style={{
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active
          ? token('color.text.selected', '#0052CC')
          : token('color.text', '#172B4D'),
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      {sublabel && (
        <span style={{
          fontSize: 10,
          color: token('color.text.subtle', '#6B778C'),
          whiteSpace: 'nowrap',
        }}>
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
      <div style={{
        height: 120, borderRadius: 8, marginBottom: 16,
        background: token('color.background.neutral', '#F4F5F7'),
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <div style={{
        height: 400, borderRadius: 8,
        background: token('color.background.neutral', '#F4F5F7'),
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export default function R360Panel() {
  const { user } = useAuth();
  const { isTeamLead } = useUserRole();
  const { data: myResourceId, isLoading: idLoading } = useMyR360ResourceId();
  const { data: teamResources = [], isLoading: teamLoading } = useTeamResourceIds(
    isTeamLead ? (user?.id ?? null) : null,
  );

  // null = "show my own view"; a resource ID string = "show that member's view"
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeResourceId = selectedId ?? myResourceId ?? null;

  if (idLoading) return <R360Skeleton />;

  if (!activeResourceId) {
    return (
      <div style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: token('color.text.subtle', '#6B778C'),
        fontSize: 14,
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
      data-testid="r360-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        // Ensure the panel fills the available tab area cleanly
        minHeight: 600,
      }}
    >
      {/* ── Team picker — leads only ── */}
      {isTeamLead && !teamLoading && teamResources.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 0 16px',
            flexWrap: 'wrap',
            borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
            marginBottom: 8,
          }}
        >
          {/* "Me" pill always first */}
          <MemberPill
            label="Me"
            sublabel="My view"
            active={selectedId === null}
            onClick={() => setSelectedId(null)}
          />

          {teamResources.map(r => (
            <MemberPill
              key={r.id}
              label={r.name}
              sublabel={r.role_name ?? undefined}
              active={selectedId === r.id}
              onClick={() => setSelectedId(r.id)}
            />
          ))}
        </div>
      )}

      {/* ── R360 weekly view ── */}
      <R360MemberDetail resourceId={activeResourceId} embedded />
    </div>
  );
}
