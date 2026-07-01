/**
 * Card — work-item card matching Jira board card (live-probed board 497).
 * Layout: summary (top) · epic tag · due-date chip · footer [type icon + key]
 * ... [priority + avatar]. radius 4, ADS tokens, Catalyst canonical type icon.
 */
import React, { useState, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { UnassignedAvatar } from '@/components/ads';
import { resolveAvatarUrl } from '@/lib/avatars';
import Tooltip from '@atlaskit/tooltip';
import EditIcon from '@atlaskit/icon/core/edit';
import FlagFilledIcon from '@atlaskit/icon/core/flag-filled';
import { IssueTypeIcon } from './IssueTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { SIZES, STRINGS } from '../constants';
import type { BoardIssue, CardVisibleFields } from '../types';
import { useBusinessRequestHealth } from '@/hooks/useBusinessRequestHealth';
import { HealthStatusBadge } from '@/components/business-request/HealthStatusBadge';

interface CardProps {
  issue: BoardIssue;
  isSelected: boolean;
  isDragging?: boolean;
  /** True while a per-card mutation is in flight (e.g. "Move work item" reorder).
   *  Renders a small centered spinner over a dimmed card so the user sees that
   *  the action is running — otherwise Move Up/Down looks silent until refetch. */
  isBusy?: boolean;
  avatarUrl?: string | null;
  visibleFields: CardVisibleFields;
  onSelect: (id: string) => void;
  menuSlot?: React.ReactNode;
  onAvatarClick?: (issue: BoardIssue, anchor: HTMLElement) => void;
  onEditSummary?: (issue: BoardIssue, summary: string) => void;
  /** When set (product mode), renders a health badge using this BR id/key. */
  healthRequestKey?: string | null;
}

function HealthBadge({ requestKey }: { requestKey: string }) {
  const { health, isLoading } = useBusinessRequestHealth(requestKey);
  if (isLoading) return (
    <div style={{ width: 80, height: 20, borderRadius: 3, background: 'var(--ds-background-neutral)', opacity: 0.7 }} />
  );
  if (!health) return null;
  return <HealthStatusBadge health={health} />;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDue(iso: string): { label: string; overdue: boolean } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { label: '', overdue: false };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = d.getTime() < today.getTime();
  return { label: `${MONTHS[d.getMonth()]} ${d.getDate()}`, overdue };
}

export const Card: React.FC<CardProps> = ({
  issue, isSelected, isDragging, isBusy, avatarUrl, visibleFields, onSelect, menuSlot, onAvatarClick, onEditSummary, healthRequestKey,
}) => {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.summary);
  const editRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) { setDraft(issue.summary); editRef.current?.focus(); editRef.current?.select(); } }, [editing, issue.summary]);
  const commitEdit = () => { if (onEditSummary && draft.trim() && draft !== issue.summary) onEditSummary(issue, draft.trim()); setEditing(false); };

  const base: React.CSSProperties = {
    position: 'relative', display: 'flex', flexDirection: 'column', gap: SIZES.CARD_GAP,
    background: token('elevation.surface.raised', 'var(--ds-surface)'),
    borderRadius: SIZES.CARD_RADIUS,
    padding: SIZES.CARD_PADDING,
    boxShadow: token('elevation.shadow.raised', '0 1px 1px #091E4240, 0 0 1px #091E424F'),
    cursor: 'pointer', userSelect: 'none', outline: 'none',
    transition: 'background-color 100ms ease',
  };
  // Jira-parity: flagged cards get the warning cream background — no left
  // border, no orange bar, no ring. Marker inside the card is the filled
  // red flag icon in the footer, next to priority.
  // Sticky history: an item currently UNflagged but previously flagged
  // gets a subtle blue "information" tint so users see it was flagged before.
  if (issue.isFlagged) {
    base.background = token('color.background.warning', 'var(--ds-background-warning)');
  } else if (issue.wasFlagged) {
    base.background = token('color.background.information', 'var(--ds-background-information)');
  }
  if (hover && !isDragging) {
    base.background = issue.isFlagged
      ? token('color.background.warning', 'var(--ds-background-warning)')
      : issue.wasFlagged
        ? token('color.background.information', 'var(--ds-background-information)')
        : token('elevation.surface.raised.hovered', 'var(--ds-background-neutral)');
  }
  if (isSelected) {
    base.outline = `2px solid ${token('color.border.selected', 'var(--ds-link)')}`;
    base.outlineOffset = '2px';
    base.background = token('color.background.selected', 'var(--ds-background-selected)');
  }
  if (isDragging) { base.opacity = 0.4; base.background = token('color.background.disabled', '#091E420F'); }
  if (isBusy) { base.pointerEvents = 'none'; base.opacity = 0.55; }

  const due = issue.dueDate ? fmtDue(issue.dueDate) : null;

  return (
    <div
      role="listitem" tabIndex={0}
      aria-label={`${issue.issueKey}: ${issue.summary}`} aria-selected={isSelected}
      data-issue-id={issue.id}
      onClick={() => onSelect(issue.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(issue.id); } }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={base}
    >
      {menuSlot && (
        <div style={{ position: 'absolute', top: 4, right: 4, opacity: hover ? 1 : 0, transition: 'opacity 100ms ease', zIndex: 1 }}>
          {menuSlot}
        </div>
      )}

      {isBusy && (
        <div
          aria-label="Moving work item"
          role="status"
          className="kb-card-skeleton"
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 6,
            padding: SIZES.CARD_PADDING,
            background: token('elevation.surface.raised', 'var(--ds-surface-raised)'),
            borderRadius: SIZES.CARD_RADIUS,
            zIndex: 2,
          }}
        >
          {/* Title bars */}
          <div className="kb-skeleton-bar" style={{ height: 12, width: '82%', borderRadius: 3 }} />
          <div className="kb-skeleton-bar" style={{ height: 12, width: '54%', borderRadius: 3 }} />
          {/* Spacer pushes footer to bottom */}
          <div style={{ flex: 1 }} />
          {/* Footer: type-icon + key + priority + avatar placeholders */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="kb-skeleton-bar" style={{ width: 16, height: 16, borderRadius: 3 }} />
              <div className="kb-skeleton-bar" style={{ width: 56, height: 10, borderRadius: 3 }} />
            </div>
            <div className="kb-skeleton-bar" style={{ width: 22, height: 22, borderRadius: '50%' }} />
          </div>
        </div>
      )}

      {/* Summary (+ edit pencil on hover) */}
      {editing ? (
        <textarea
          ref={editRef}
          value={draft}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); } if (e.key === 'Escape') { setEditing(false); } }}
          onBlur={commitEdit}
          rows={2}
          style={{ width: '100%', resize: 'none', border: `2px solid ${token('color.border.focused', 'var(--ds-background-information-bold)')}`, borderRadius: 4, padding: 4, fontSize: 'var(--ds-font-size-400)', lineHeight: '20px', fontFamily: 'inherit', color: token('color.text', 'var(--ds-text, var(--ds-text))'), outline: 'none' }}
        />
      ) : (
        <p
          style={{
            margin: 0, fontSize: 'var(--ds-font-size-400)', lineHeight: '20px', fontWeight: 400,
            color: token('color.text', 'var(--ds-text)'),
            wordBreak: 'break-word', paddingRight: hover ? 18 : 0,
            cursor: onEditSummary ? 'text' : 'pointer',
          }}
          onDoubleClick={(e) => { if (onEditSummary) { e.stopPropagation(); setEditing(true); } }}
        >
          {issue.summary}
          {onEditSummary && hover && (
            <button
              aria-label="Edit summary"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                verticalAlign: 'middle',
                marginLeft: 4,
                width: 18, height: 18,
                border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                borderRadius: 3,
              }}
            >
              <EditIcon label="" size="small" primaryColor={token('color.icon.subtle', 'var(--ds-icon-subtle)')} />
            </button>
          )}
        </p>
      )}

      {/* Health badge (product mode only) */}
      {healthRequestKey && <HealthBadge requestKey={healthRequestKey} />}

      {/* Due date chip */}
      {due && due.label && (
        <div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, height: 18, padding: '0 6px', borderRadius: 3,
            border: `1px solid ${due.overdue ? token('color.border.danger', '#E2483D') : token('color.border', '#091E4224')}`,
            color: due.overdue ? token('color.text.danger', 'var(--ds-text-danger)') : token('color.text.subtle', 'var(--ds-icon, var(--ds-icon))'),
            fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
          }}>
            {due.overdue ? '⚠ ' : ''}{due.label}
          </span>
        </div>
      )}


      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: SIZES.AVATAR_CARD, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
          <Tooltip content={issue.issueType || 'Work item'} delay={SIZES.TOOLTIP_DELAY}>
            <span style={{ display: 'inline-flex' }}><IssueTypeIcon issueType={issue.issueType} size={SIZES.ICON_CARD} /></span>
          </Tooltip>
          <span
            style={{
              fontSize: 'var(--ds-font-size-200)', lineHeight: '16px', color: token('color.text.subtlest', 'var(--ds-icon-subtle)'),
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              borderBottom: '1px solid transparent', transition: 'border-color 100ms ease',
              ...(hover ? { borderBottom: `1px solid ${token('color.border.subtle', 'var(--ds-icon-subtle)')}` } : {}),
            }}
          >
            {issue.issueKey}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {issue.isFlagged && (
            <Tooltip content="Flagged" delay={SIZES.TOOLTIP_DELAY}>
              <span aria-label="Flagged" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Canonical Atlaskit filled flag glyph — same one Jira ships.
                    Jira-parity accent red for the fill (token). */}
                <FlagFilledIcon
                  label=""
                  color={token('color.icon.accent.red', 'var(--ds-icon-accent-red)')}
                />
              </span>
            </Tooltip>
          )}
          {visibleFields.priority && issue.priority && (
            <Tooltip content={`${issue.priority} priority`} delay={SIZES.TOOLTIP_DELAY}>
              <span style={{ display: 'inline-flex' }}><PriorityIcon priority={issue.priority} size={SIZES.ICON_CARD} /></span>
            </Tooltip>
          )}
          {visibleFields.estimate && issue.storyPoints != null && (
            <Tooltip content={`Story point estimate: ${issue.storyPoints}`} delay={SIZES.TOOLTIP_DELAY}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: SIZES.POINTS_HEIGHT, height: SIZES.POINTS_HEIGHT, padding: '0 6px', borderRadius: SIZES.POINTS_RADIUS, background: token('color.background.neutral', 'var(--ds-background-neutral)'), color: token('color.text.subtlest', 'var(--ds-icon-subtle, var(--ds-text-subtlest))'), fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}>
                {issue.storyPoints}
              </span>
            </Tooltip>
          )}
          {visibleFields.assignee && (
            <Tooltip content={issue.assigneeName || STRINGS.UNASSIGNED} delay={SIZES.TOOLTIP_DELAY}>
              <span
                onClick={(e) => { if (onAvatarClick) { e.stopPropagation(); onAvatarClick(issue, e.currentTarget as HTMLElement); } }}
                style={{
                  display: 'inline-flex', cursor: onAvatarClick ? 'pointer' : 'default',
                  borderRadius: 3, padding: 0, transition: 'background-color 100ms ease',
                  ...(hover ? { background: token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))') } : {}),
                }}
              >
                {issue.assigneeName
                  ? <CatalystAvatar
                      size="small"
                      src={resolveAvatarUrl(issue.assigneeName) ?? avatarUrl ?? undefined}
                      name={issue.assigneeName}
                    />
                  : <UnassignedAvatar size={22} />
                }
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};
