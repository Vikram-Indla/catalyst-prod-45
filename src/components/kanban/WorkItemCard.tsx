/**
 * WorkItemCard — Enterprise-grade kanban card matching Jira reference density
 *
 * Layout (top → bottom):
 *   TITLE ROW: summary + hover-reveal edit + three-dots menu
 *   META ROWS: assignee name (plain text) + epic/parent (plain text) + sprint-release (plain text)
 *   FOOTER: type-icon + issue_key (left) + priority chevron + assignee avatar (right)
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import FlagFilledIcon from '@atlaskit/icon/core/flag-filled';
import MoreIcon from '@atlaskit/icon/glyph/more';
import EditIcon from '@atlaskit/icon/core/edit';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CloseIcon from '@atlaskit/icon/core/close';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { KanbanAvatar } from './KanbanAvatar';
import { AssigneePickerPopover, type AssigneeOption } from './AssigneePickerPopover';
import { SourceBadge } from '@/components/producthub/shared/SourceBadge';
import { IssueHoverCard } from '@/components/shared/IssueHoverCard';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';
import { SPACING_TOKENS } from './kanban-tokens';
import { WorkItemOverflowMenu } from './overflow-menu/WorkItemOverflowMenu';
import type { VisibleFields } from '@/hooks/useKanbanViewSettings';

/* ═══ PRIORITY ICON — Jira-parity directional chevrons ═══ */

const PRIORITY_COLORS: Record<string, string> = {
  highest: '#E5493A',
  high:    '#E97F33',
  medium:  '#FFAB00',
  low:     '#2D8738',
  lowest:  '#57A55A',
};

function PriorityIcon({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const color = PRIORITY_COLORS[p] || '#5E6C84';
  /* Jira renders priority as stacked upward (high) or downward (low) chevrons.
     Two chevrons = highest/lowest, one = high/low, dash = medium. */
  if (p === 'highest') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-label="Highest priority">
        <path d="M7 1 L12 6 H9 V7 H5 V6 H2 Z" fill={color} />
        <path d="M7 5.5 L12 10.5 H9 V11.5 H5 V10.5 H2 Z" fill={color} opacity="0.55" />
      </svg>
    );
  }
  if (p === 'high') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-label="High priority">
        <path d="M7 2.5 L12 7.5 H9 V9.5 H5 V7.5 H2 Z" fill={color} />
      </svg>
    );
  }
  if (p === 'medium') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-label="Medium priority">
        <rect x="2" y="4" width="10" height="2.5" rx="1" fill={color} />
        <rect x="2" y="7.5" width="10" height="2.5" rx="1" fill={color} opacity="0.45" />
      </svg>
    );
  }
  if (p === 'low') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-label="Low priority">
        <path d="M7 11.5 L2 6.5 H5 V4.5 H9 V6.5 H12 Z" fill={color} />
      </svg>
    );
  }
  if (p === 'lowest') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-label="Lowest priority">
        <path d="M7 8.5 L2 3.5 H5 V2.5 H9 V3.5 H12 Z" fill={color} opacity="0.55" />
        <path d="M7 13 L2 8 H5 V7 H9 V8 H12 Z" fill={color} />
      </svg>
    );
  }
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-label={`Priority: ${priority}`}>
      <rect x="2" y="6" width="10" height="2" rx="1" fill={color} />
    </svg>
  );
}

interface WorkItemCardProps {
  issue: BoardIssue;
  avatarUrl?: string | null;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  isSelected?: boolean;
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
  onCopyKey?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
  onOpenDetail?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSaveSummary?: (id: string, newSummary: string) => void;
  projectKey?: string;
  onLabelsUpdated?: (issueId: string, newLabels: string[]) => void;
  onParentChange?: (issueId: string, newParentKey: string | null) => void;
  onMoved?: (issueId: string, newProjectKey: string) => void;
  onLinked?: () => void;
  onChangeAssignee?: (issueId: string, newAssignee: string | null) => void;
  assigneeOptions?: AssigneeOption[];
  avatarsByName?: Map<string, string>;
  visibleFields?: VisibleFields;
  /**
   * Optional hub-specific icon resolver. When supplied, overrides the default
   * `JiraIssueTypeIcon` lookup keyed by `issue.issueType`. Use this for hubs
   * whose type taxonomy does not match Jira (Requests, Ideas, etc.). If
   * it returns `null`, the default Jira icon is used as a fallback.
   */
  resolveIcon?: (issue: BoardIssue) => ReactNode | null;
  /** Subtask-family issues linked to this card — shown as hover-card chips. */
  subtasks?: BoardIssue[];
}

/* ── SubtaskStrip: row of subtask chips, each wired to IssueHoverCard ── */

function SubtaskStrip({ subtasks, tk }: { subtasks: BoardIssue[]; tk: KanbanThemeTokens }) {
  if (!subtasks.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, marginBottom: 2 }}>
      {subtasks.map(st => (
        <IssueHoverCard key={st.id} issueKey={st.issueKey}>
          <span
            role="img"
            aria-label={st.issueKey}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 6px',
              borderRadius: 3,
              background: 'var(--ds-background-neutral, #F1F2F4)',
              color: tk.textMuted,
              fontSize: 11, fontFamily: 'var(--cp-font-body)',
              lineHeight: '16px',
              cursor: 'default',
              userSelect: 'none',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, #DCDFE4)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, #F1F2F4)'; }}
          >
            <JiraIssueTypeIcon type={st.issueType} size={12} />
            <span>{st.issueKey}</span>
          </span>
        </IssueHoverCard>
      ))}
    </div>
  );
}

export function WorkItemCard({
  issue, avatarUrl, d, tk, isSelected,
  onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onOpenDetail,
  onArchive, onDelete, onSaveSummary, onChangeAssignee, assigneeOptions, avatarsByName,
  projectKey, onLabelsUpdated, onParentChange, onMoved, onLinked, visibleFields,
  resolveIcon, subtasks = [],
}: WorkItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(issue.summary);
  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleMenuBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right, y: rect.bottom + 4 });
    setShowMenu(prev => !prev);
  }, []);

  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(issue.summary);
    setIsEditing(true);
  }, [issue.summary]);

  const cancelEditing = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditValue(issue.summary);
  }, [issue.summary]);

  const saveEditing = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== issue.summary) {
      onSaveSummary?.(issue.id, trimmed);
    }
    setIsEditing(false);
  }, [editValue, issue.id, issue.summary, onSaveSummary]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle keyboard in edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }, [saveEditing, cancelEditing]);

  // Derive category/initiative from labels and parent
  const vf = visibleFields;
  const epicLabel = (vf?.epic !== false) ? (issue.parentSummary || (issue.labels.length > 0 ? issue.labels[0] : null)) : null;
  const sprintReleaseLabel = (vf?.sprintRelease !== false) ? (issue.fixVersion || issue.sprintName || null) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* ─── TITLE ROW ─── */}
      <div className="flex items-start" style={{ position: 'relative' }}>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div onClick={e => e.stopPropagation()} style={{ marginBottom: 4 }}>
              <textarea
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  fontSize: d.titleSize,
                  lineHeight: `${d.titleSize + 6}px`,
                  color: tk.textPrimary,
                  fontWeight: 500,
                  fontFamily: 'var(--cp-font-body)',
                  background: tk.cardBg,
                  border: `2px solid ${tk.selectedAccent}`,
                  borderRadius: 4,
                  padding: '4px 6px',
                  resize: 'none',
                  outline: 'none',
                  minHeight: 40,
                  maxHeight: 80,
                }}
                rows={2}
              />
              {/* Save / Cancel buttons */}
              <div className="flex items-center justify-end" style={{ gap: SPACING_TOKENS.gap4, marginTop: 4 }}>
                <button
                  onClick={saveEditing}
                  style={{
                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, border: `1px solid ${tk.border}`, background: tk.cardBg,
                    cursor: 'pointer', padding: 0,
                  }}
                  aria-label="Save"
                >
                  <CheckMarkIcon label="Save" size="small" primaryColor="#36B37E" />
                </button>
                <button
                  onClick={cancelEditing}
                  style={{
                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, border: `1px solid ${tk.border}`, background: tk.cardBg,
                    cursor: 'pointer', padding: 0,
                  }}
                  aria-label="Cancel"
                >
                  <CloseIcon label="Cancel" size="small" primaryColor="#FF5630" />
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: d.titleSize,
              lineHeight: `${d.titleSize + 6}px`,
              color: tk.textPrimary,
              fontWeight: 400,                          /* jira-compare 2026-05-08: Jira card titles are 400/regular, NOT bold */
              marginBottom: 4,
              /* No paddingRight here: the flex sibling (flag + edit + menu
                 buttons) already reserves ~44px on the right. Adding an
                 extra 32px double-padded the summary and forced titles to
                 wrap a line earlier than necessary. */
              display: '-webkit-box',
              WebkitLineClamp: d.titleClamp,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              fontFamily: 'var(--cp-font-body)',
            }}>
              {issue.summary}
            </div>
          )}
        </div>

        {/* Flag + hover-reveal edit + three-dots (hidden during edit) */}
        {!isEditing && (
          <div className="flex items-center flex-shrink-0" style={{ gap: 2, marginLeft: 4, marginTop: 1 }}>
            {issue.isFlagged && <FlagFilledIcon label="Flagged" size="small" primaryColor="#E5493A" />}
            <button
              className="kanban-card-edit-btn"
              onClick={startEditing}
              style={{
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer',
                opacity: 0, transition: 'opacity 80ms', flexShrink: 0, padding: 0,
              }}
              aria-label="Edit title"
            >
              <EditIcon label="Edit title" size="small" primaryColor={tk.textMuted} />
            </button>
            <button
              ref={btnRef}
              onClick={handleMenuBtn}
              className="kanban-card-menu-btn"
              style={{
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer',
                opacity: 0, transition: 'opacity 80ms', flexShrink: 0, padding: 0,
              }}
              aria-label="More actions"
            >
              <MoreIcon label="More actions" size="small" primaryColor={tk.textMuted} />
            </button>
          </div>
        )}
      </div>

      {/* ─── META ROW: epic/parent chip only (Jira parity 2026-05-08)
          Jira Kanban cards show:
          - Epic as a colored label chip BELOW the title (NOT plain text)
          - NO assignee name text (avatar in footer only)
          - NO sprint/release text on the card
          visibleFields.epic controls whether the epic chip shows. ─── */}
      {epicLabel && (vf?.epic !== false) && (
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          marginBottom: 4, maxWidth: '100%',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 400, color: tk.epicLozengeText,
            background: tk.epicLozengeBg,
            borderRadius: 3, padding: '4px 8px',
            lineHeight: '16px', fontFamily: 'var(--cp-font-body)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}>{epicLabel}</span>
        </div>
      )}

      {/* ─── SUBTASK STRIP: hover-card chips for linked subtask-family issues ─── */}
      <SubtaskStrip subtasks={subtasks} tk={tk} />

      {/* ─── FOOTER: Type Icon + Key (left) + Priority + Avatar (right) ─── */}
      <div className="flex items-center" style={{ gap: SPACING_TOKENS.gap8, minHeight: d.footerHeight, marginTop: 8 }}>
        {vf?.workType !== false && (
          resolveIcon
            ? (resolveIcon(issue) ?? <JiraIssueTypeIcon type={issue.issueType} size={16} />)
            : <JiraIssueTypeIcon type={issue.issueType} size={16} />
        )}
        {vf?.workItemKey !== false && (
          /* Jira parity: clicking the issue key opens the detail panel.
             Rendered as a button so keyboard users can also trigger it.
             Hover: underline + slightly darker text, matching Jira's
             `ds-text-subtlest` → `ds-link` transition. */
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail?.(issue.id);
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.textDecoration = 'underline';
              el.style.color = tk.textPrimary;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.textDecoration = 'none';
              el.style.color = tk.textMuted;
            }}
            style={{
              fontSize: d.metaSize, fontWeight: 400,
              color: tk.textMuted, fontFamily: 'var(--cp-font-body)',
              lineHeight: '14px',
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', textDecoration: 'none',
              transition: 'color 80ms ease, text-decoration 80ms ease',
            }}
            aria-label={`Open ${issue.issueKey}`}
            title={`Open ${issue.issueKey}`}
          >
            {issue.issueKey}
          </button>
        )}
        {issue.sourceTag && (
          <SourceBadge source={issue.sourceTag} />
        )}
        <span className="flex-1" />
        {vf?.priority !== false && issue.priority && (
          <PriorityIcon priority={issue.priority} />
        )}
        {vf?.assignee !== false && (
          onChangeAssignee && assigneeOptions && avatarsByName ? (
            <AssigneePickerPopover
              currentAssignee={issue.assigneeName}
              options={assigneeOptions}
              avatarsByName={avatarsByName}
              tk={tk}
              avatarSize={d.avatarSize}
              onSelect={(name) => onChangeAssignee(issue.id, name)}
            />
          ) : (
            <KanbanAvatar name={issue.assigneeName} url={avatarUrl} size={d.avatarSize} tk={tk} />
          )
        )}
      </div>

      {/* ─── OVERFLOW MENU ─── */}
      {showMenu && menuPos && (
        <WorkItemOverflowMenu
          issue={issue}
          menuPos={menuPos}
          tk={tk}
          projectKey={projectKey ?? ''}
          onClose={() => setShowMenu(false)}
          onToggleFlag={onToggleFlag}
          onCopyLink={onCopyLink}
          onCopyKey={onCopyKey}
          onChangeStatus={onChangeStatus}
          onOpenDetail={onOpenDetail}
          onArchive={onArchive}
          onDelete={onDelete}
          onLabelsUpdated={onLabelsUpdated}
          onParentChange={onParentChange}
          onMoved={onMoved}
          onLinked={onLinked}
        />
      )}
    </div>
  );
}
