/**
 * Card — work-item card matching Jira board card (live-probed board 497).
 * Layout: summary (top) · epic tag · due-date chip · footer [type icon + key]
 * ... [priority + avatar]. radius 4, ADS tokens, Catalyst canonical type icon.
 */
import React, { useState, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import EditIcon from '@atlaskit/icon/glyph/edit';
import { IssueTypeIcon } from './IssueTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { SIZES, STRINGS } from '../constants';
import type { BoardIssue, CardVisibleFields } from '../types';

interface CardProps {
  issue: BoardIssue;
  isSelected: boolean;
  isDragging?: boolean;
  avatarUrl?: string | null;
  visibleFields: CardVisibleFields;
  onSelect: (id: string) => void;
  menuSlot?: React.ReactNode;
  onAvatarClick?: (issue: BoardIssue, anchor: HTMLElement) => void;
  onEditSummary?: (issue: BoardIssue, summary: string) => void;
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
  issue, isSelected, isDragging, avatarUrl, visibleFields, onSelect, menuSlot, onAvatarClick, onEditSummary,
}) => {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.summary);
  const editRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (editing) { setDraft(issue.summary); editRef.current?.focus(); editRef.current?.select(); } }, [editing, issue.summary]);
  const commitEdit = () => { if (onEditSummary && draft.trim() && draft !== issue.summary) onEditSummary(issue, draft.trim()); setEditing(false); };

  const base: React.CSSProperties = {
    position: 'relative', display: 'flex', flexDirection: 'column',
    background: token('elevation.surface.raised', '#FFFFFF'),
    borderRadius: SIZES.CARD_RADIUS,
    padding: SIZES.CARD_PADDING,
    boxShadow: token('elevation.shadow.raised', '0 1px 1px #091E4240, 0 0 1px #091E424F'),
    cursor: 'pointer', userSelect: 'none', outline: 'none',
    transition: 'background-color 100ms ease',
  };
  if (issue.isFlagged) {
    base.borderLeft = `${SIZES.CARD_FLAG_BORDER}px solid ${token('color.border.warning', '#F5CD47')}`;
    base.background = token('color.background.warning', '#FFF7D6');
    base.paddingLeft = SIZES.CARD_PADDING - SIZES.CARD_FLAG_BORDER;
  }
  if (hover && !isDragging) {
    base.background = issue.isFlagged
      ? token('color.background.warning.hovered', '#F8E6A0')
      : token('elevation.surface.raised.hovered', '#F1F2F4');
  }
  if (isSelected) {
    base.outline = `2px solid ${token('color.border.selected', '#0C66E4')}`;
    base.background = token('color.background.selected', '#E9F2FF');
  }
  if (isDragging) { base.opacity = 0.4; base.background = token('color.background.disabled', '#091E420F'); }

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
        <div style={{ position: 'absolute', top: 6, right: 6, opacity: hover ? 1 : 0, transition: 'opacity 100ms ease', zIndex: 1 }}>
          {menuSlot}
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
          style={{ width: '100%', resize: 'none', border: `2px solid ${token('color.border.focused', '#4C9AFF')}`, borderRadius: 4, padding: 4, fontSize: 14, lineHeight: '20px', fontFamily: 'inherit', color: token('color.text', '#172B4D'), outline: 'none' }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <p style={{
            margin: 0, flex: 1, fontSize: 14, lineHeight: '20px', fontWeight: 400,
            color: token('color.text', '#172B4D'),
            display: '-webkit-box', WebkitLineClamp: SIZES.CARD_SUMMARY_LINES, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', wordBreak: 'break-word', paddingRight: hover ? 18 : 0,
          }}>
            {issue.summary}
          </p>
          {onEditSummary && hover && (
            <button
              aria-label="Edit summary"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'inline-flex', marginTop: 1 }}
            >
              <EditIcon label="" size="small" primaryColor={token('color.icon.subtle', '#626F86')} />
            </button>
          )}
        </div>
      )}

      {/* Due date chip */}
      {due && due.label && (
        <div style={{ marginTop: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, height: 18, padding: '0 6px', borderRadius: 3,
            border: `1px solid ${due.overdue ? token('color.border.danger', '#E2483D') : token('color.border', '#091E4224')}`,
            color: due.overdue ? token('color.text.danger', '#AE2A19') : token('color.text.subtle', '#44546F'),
            fontSize: 11, fontWeight: 500,
          }}>
            {due.overdue ? '⚠ ' : ''}{due.label}
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, minHeight: SIZES.AVATAR_CARD, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <Tooltip content={issue.issueType || 'Work item'} delay={SIZES.TOOLTIP_DELAY}>
            <span style={{ display: 'inline-flex' }}><IssueTypeIcon issueType={issue.issueType} size={SIZES.ICON_CARD} /></span>
          </Tooltip>
          <span style={{ fontSize: 12, lineHeight: '16px', color: token('color.text.subtlest', '#626F86'), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {issue.issueKey}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {visibleFields.priority && issue.priority && (
            <Tooltip content={`${issue.priority} priority`} delay={SIZES.TOOLTIP_DELAY}>
              <span style={{ display: 'inline-flex' }}><PriorityIcon priority={issue.priority} size={SIZES.ICON_CARD} /></span>
            </Tooltip>
          )}
          {visibleFields.estimate && issue.storyPoints != null && (
            <Tooltip content={`Story point estimate: ${issue.storyPoints}`} delay={SIZES.TOOLTIP_DELAY}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: SIZES.POINTS_HEIGHT, height: SIZES.POINTS_HEIGHT, padding: '0 6px', borderRadius: SIZES.POINTS_RADIUS, background: token('color.background.neutral', '#091E420F'), color: token('color.text.subtle', '#44546F'), fontSize: 12, fontWeight: 700 }}>
                {issue.storyPoints}
              </span>
            </Tooltip>
          )}
          {visibleFields.assignee && (
            <Tooltip content={issue.assigneeName || STRINGS.UNASSIGNED} delay={SIZES.TOOLTIP_DELAY}>
              <span
                onClick={(e) => { if (onAvatarClick) { e.stopPropagation(); onAvatarClick(issue, e.currentTarget as HTMLElement); } }}
                style={{ display: 'inline-flex', cursor: onAvatarClick ? 'pointer' : 'default' }}
              >
                <Avatar size="small" src={avatarUrl ?? undefined} name={issue.assigneeName || STRINGS.UNASSIGNED} />
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
};
