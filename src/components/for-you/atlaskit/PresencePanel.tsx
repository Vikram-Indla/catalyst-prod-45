/**
 * PresencePanel — "Team Pulse" tab (Phase 6).
 *
 * Two sections:
 *   1. Team status  — shared-audience list with PresenceRing, status label,
 *                     "Active Xm ago" / "Back {date}" text.
 *   2. Who's out    — this-week leave entries sorted by start date.
 *
 * Data: useTeamPulse() — resolves audience via shared_user_ids RPC, then
 * queries v_user_effective_status + user_availability. Realtime via
 * postgres_changes on user_presence.
 */
import React, { useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { PresenceRing } from '@/components/shared/PresenceRing';
import { useTeamPulse } from '@/hooks/useTeamPulse';
import { useBackupSuggestion } from '@/hooks/useBackupSuggestion';
import type { PresenceState } from '@/lib/presence';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATE_LABEL: Record<PresenceState, string> = {
  available: 'Available',
  away:      'Away',
  busy:      'Busy',
  offline:   'Offline',
  on_leave:  'On leave',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Active just now';
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Active ${days}d ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const LEAVE_KIND_LABEL: Record<string, string> = {
  vacation:       'Vacation',
  public_holiday: 'Public holiday',
  sick:           'Sick leave',
  ooo:            'Out of office',
};

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
        padding: '16px 0 8px',
      }}
    >
      {children}
    </div>
  );
}

// ─── PresencePanel ────────────────────────────────────────────────────────────

export function PresencePanel() {
  const { data, isLoading, error } = useTeamPulse();
  const { suggest, coverage_insight, isPending: isInsightPending } = useBackupSuggestion();

  const membersOnLeaveForInsight = data?.members.filter(m => m.effective_state === 'on_leave') ?? [];

  // Auto-fetch coverage insight for the first on-leave member when panel loads
  useEffect(() => {
    const firstOnLeave = membersOnLeaveForInsight[0];
    if (firstOnLeave && !coverage_insight && !isInsightPending) {
      void suggest({ assignee_user_id: firstOnLeave.user_id }).catch(() => { /* best-effort */ });
    }
    // Only trigger once when on-leave members first appear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersOnLeaveForInsight.length]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)'),
          fontSize: 14,
        }}
      >
        Failed to load team status.
      </div>
    );
  }

  const members   = data?.members   ?? [];
  const weekLeave = data?.weekLeave ?? [];

  const membersOnLeave = members.filter(m => m.effective_state === 'on_leave');
  const membersActive  = members.filter(m => m.effective_state !== 'on_leave');

  // Empty state
  if (members.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
          fontSize: 14,
        }}
      >
        <div style={{ marginBottom: 8, fontSize: 24 }}>👋</div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>No team members found</div>
        <div>Team Pulse shows people you share projects or products with.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── Team status ─────────────────────────────────────────────────── */}
      <SectionHeader>Team status</SectionHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {membersOnLeave.map(member => (
          <MemberRow key={member.user_id} member={member} />
        ))}
        {membersActive.map(member => (
          <MemberRow key={member.user_id} member={member} />
        ))}
      </div>

      {/* ── Caty coverage insight ───────────────────────────────────────── */}
      {(coverage_insight || isInsightPending) && membersOnLeaveForInsight.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 4,
            background: token('color.background.information', 'var(--ds-background-information, #E9F2FE)'),
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>✦</span>
          <div style={{ fontSize: 13, color: token('color.text', 'var(--ds-text, #172B4D)'), flex: 1 }}>
            {isInsightPending ? (
              <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                Analysing coverage…
              </span>
            ) : (
              coverage_insight
            )}
          </div>
        </div>
      )}

      {/* ── Who's out this week ─────────────────────────────────────────── */}
      {weekLeave.length > 0 && (
        <>
          <SectionHeader>Who&apos;s out this week</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weekLeave.map((entry, i) => (
              <div
                key={`${entry.user_id}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 4,
                  background: token('color.background.danger', 'var(--ds-background-danger, #FFECEB)'),
                }}
              >
                <PresenceRing
                  name={entry.full_name ?? undefined}
                  src={entry.avatar_url ?? null}
                  size="small"
                  state="on_leave"
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: token('color.text', 'var(--ds-text, #172B4D)') }}>
                    {entry.full_name ?? 'Unknown'}
                  </div>
                  <div style={{ fontSize: 11, color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)') }}>
                    {LEAVE_KIND_LABEL[entry.kind] ?? entry.kind}
                    {' · '}
                    {formatDate(entry.starts_at)}
                    {' – '}
                    {formatDate(entry.ends_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MemberRow ────────────────────────────────────────────────────────────────

function MemberRow({ member }: { member: { user_id: string; full_name: string | null; avatar_url: string | null; effective_state: string; last_seen_at: string; back_on: string | null } }) {
  const state = member.effective_state as PresenceState;
  const isOnLeave = state === 'on_leave';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 4px',
        borderRadius: 4,
      }}
      onMouseEnter={e =>
        (e.currentTarget.style.background =
          token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'))
      }
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <PresenceRing
        name={member.full_name ?? undefined}
        src={member.avatar_url ?? null}
        size="small"
        state={state}
      />

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: token('color.text', 'var(--ds-text, #172B4D)'),
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {member.full_name ?? 'Unknown'}
        </div>
        <div
          style={{
            fontSize: 11,
            color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
          }}
        >
          {isOnLeave && member.back_on
            ? `Back ${formatDate(member.back_on)}`
            : formatRelative(member.last_seen_at)}
        </div>
      </div>

      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: token('color.text.subtle', 'var(--ds-text-subtle, #6B778C)'),
          flexShrink: 0,
        }}
      >
        {STATE_LABEL[state] ?? state}
      </span>
    </div>
  );
}
