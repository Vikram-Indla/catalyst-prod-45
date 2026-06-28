// @ts-nocheck
/**
 * TeamMemberHoverCard — pops up next to a Team Workload row on hover.
 *
 * Shows: avatar + name + role header, then up to 5 recently accessed work
 * items (key · title · status lozenge). Click a row → openUWV(issueKey).
 *
 * Implementation notes:
 *   - Self-rolled portal to document.body (CLAUDE.md 2026-05-08 — @atlaskit/popup
 *     v4 has the empty-portal bug).
 *   - Triggered by parent via onMouseEnter+200ms debounce, onMouseLeave hides.
 *   - Re-uses canonical primitives: UserAvatar, JiraIssueTypeIcon, <Lozenge>.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { acquire as acquireHoverSlot, release as releaseHoverSlot } from '@/lib/hover-card-singleton';
import { token } from '@atlaskit/tokens';
import { Lozenge } from '@/components/ads';
import UserAvatar from '@/components/shared/UserAvatar';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useTeamMemberRecentItems } from '@/hooks/useDashboardWidgets';
import { LABEL, SMALL, BODY, STRONG } from '../dashboardTypography';

type Props = {
  open: boolean;
  anchorPoint: { x: number; y: number } | null; // mouse cursor position
  name: string;
  role: string | null;
  profileId: string | null;
  projectId: string | null;
  onItemClick: (issueKey: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Singleton — called when another hover card opens and wants this one closed. */
  requestClose?: () => void;
};

function statusAppearance(category: string | null, status: string | null) {
  const c = (category || '').toLowerCase();
  const s = (status || '').toLowerCase();
  if (c === 'done' || ['closed','resolved','done','fixed','verified'].includes(s)) return 'success';
  if (c === 'inprogress' || c === 'in progress' || s.includes('progress')) return 'inprogress';
  if (['blocked','on hold','awaiting info','impediment'].includes(s)) return 'moved';
  return 'default';
}

export default function TeamMemberHoverCard({
  open, anchorPoint, name, role, profileId, projectId,
  onItemClick, onMouseEnter, onMouseLeave, requestClose,
}: Props) {
  const { data: items, isLoading } = useTeamMemberRecentItems(profileId, projectId, 5, open);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Singleton — register/release the close-callback so only one hover card
  // is ever visible across the app.
  const closeRef = useCallback(() => { requestClose?.(); }, [requestClose]);
  useEffect(() => {
    if (open) {
      acquireHoverSlot(closeRef);
      return () => releaseHoverSlot(closeRef);
    }
  }, [open, closeRef]);

  useEffect(() => {
    if (!open || !anchorPoint) { setPos(null); return; }
    // Anchor to the mouse pointer with small offset so the card appears next
    // to the cursor (not under it). Flip + clamp to viewport.
    const W = 360;
    const H = 260;
    const offset = 14;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let left = anchorPoint.x + offset;
    if (left + W > viewportW - 8) left = anchorPoint.x - W - offset;
    if (left < 8) left = 8;
    let top = anchorPoint.y - 12;
    if (top + H > viewportH - 8) top = Math.max(8, viewportH - H - 8);
    if (top < 8) top = 8;
    setPos({ top, left });
  }, [open, anchorPoint]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={cardRef}
      data-team-member-hover-card
      role="dialog"
      aria-label={`${name}'s recent work items`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 360,
        zIndex: 99999,
        background: token('elevation.surface.overlay', 'var(--ds-surface)'),
        border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
        borderRadius: 8,
        boxShadow: token('elevation.shadow.overlay', '0 4px 12px rgba(9,30,66,0.15)'),
        padding: 12,
        animation: 'tmhc-fade-in 120ms ease-out',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <UserAvatar size="medium" name={name} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ ...STRONG, color: token('color.text', 'var(--ds-text)') }}>{name}</span>
          <span style={{ ...SMALL, color: token('color.text.subtle', 'var(--ds-text-subtle)') }}>
            {role || 'Role not set'}
          </span>
        </div>
      </div>

      {/* Section title */}
      <div
        style={{
          ...LABEL,
          textTransform: 'none',
          letterSpacing: '0.04em',
          color: token('color.text.subtle', 'var(--ds-text-subtle)'),
          marginBottom: 6,
        }}
      >
        Recently accessed
      </div>

      {/* Items list */}
      {isLoading ? (
        <div style={{ ...SMALL, color: token('color.text.subtle', 'var(--ds-text-subtle)'), padding: '8px 0' }}>
          Loading…
        </div>
      ) : !items || items.length === 0 ? (
        <div style={{ ...SMALL, color: token('color.text.subtle', 'var(--ds-text-subtle)'), padding: '8px 0' }}>
          No recent items.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((it) => {
            const key = it.entity_key || '';
            const ap = statusAppearance(it.status_category, it.status);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => key && onItemClick(key)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral)');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                style={{
                  all: 'unset',
                  display: 'grid',
                  gridTemplateColumns: '16px 60px 1fr auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 6px',
                  borderRadius: 4,
                  cursor: key ? 'pointer' : 'default',
                  ...BODY,
                }}
              >
                <JiraIssueTypeIcon type={(it.issue_type as any) || 'Task'} size={14} />
                <span
                  style={{
                    color: token('color.text.subtle', 'var(--ds-text-subtle)'),
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {key}
                </span>
                <span
                  style={{
                    color: token('color.text', 'var(--ds-text)'),
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {it.display_summary}
                </span>
                {it.status && <Lozenge appearance={ap as any}>{it.status}</Lozenge>}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes tmhc-fade-in {
          from { opacity: 0; transform: translateY(-2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
