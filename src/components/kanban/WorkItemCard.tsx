/**
 * WorkItemCard — Enterprise-grade kanban card matching Jira reference density
 *
 * Layout (top → bottom):
 *   TITLE ROW: summary (bold) + hover-reveal edit icon + three-dots menu
 *   BADGE ROW: dark epic pill + bordered fix-version/sprint pill
 *   FOOTER: type-icon + issue_key (left) + priority + assignee avatar (right)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Flag, MoreHorizontal, Pencil, Check, X,
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { KanbanAvatar } from './KanbanAvatar';
import { AssigneePickerPopover, type AssigneeOption } from './AssigneePickerPopover';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';
import { WorkItemOverflowMenu } from './overflow-menu/WorkItemOverflowMenu';
import type { VisibleFields } from '@/hooks/useKanbanViewSettings';

/* ═══ PRIORITY ICON (= bars, Jira style) ═══ */

const PRIORITY_COLORS: Record<string, string> = {
  highest: '#FF5630',
  high: '#FF5630',
  medium: '#FFAB00',
  low: '#36B37E',
  lowest: '#36B37E',
};

function PriorityBars({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const color = PRIORITY_COLORS[p] || '#5E6C84';
  const isHigh = p === 'highest' || p === 'high';
  const isLow = p === 'lowest' || p === 'low';
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-label={`Priority: ${priority}`}>
      <rect x="2" y="4" width="12" height="2" rx="0.5" fill={color} />
      <rect x="2" y="7.5" width="12" height="2" rx="0.5" fill={isLow ? '#C1C7D0' : color} />
      <rect x="2" y="11" width="12" height="2" rx="0.5" fill={isHigh ? color : '#C1C7D0'} />
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
}

export function WorkItemCard({
  issue, avatarUrl, d, tk, isSelected,
  onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onOpenDetail,
  onArchive, onDelete, onSaveSummary, onChangeAssignee, assigneeOptions, avatarsByName,
  projectKey, onLabelsUpdated, onParentChange, onMoved, onLinked, visibleFields,
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
  const fixVersionLabel = (vf?.fixVersions !== false) ? (issue.fixVersion || issue.sprintName || null) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
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
                  fontFamily: "'Inter', sans-serif",
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
              <div className="flex items-center justify-end" style={{ gap: 4, marginTop: 4 }}>
                <button
                  onClick={saveEditing}
                  style={{
                    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 4, border: `1px solid ${tk.border}`, background: tk.cardBg,
                    cursor: 'pointer', padding: 0,
                  }}
                  aria-label="Save"
                >
                  <Check size={14} color="#36B37E" />
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
                  <X size={14} color="#FF5630" />
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: d.titleSize,
              lineHeight: `${d.titleSize + 6}px`,
              color: tk.textPrimary,
              fontWeight: 400,                          /* Jira parity: 400 */
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
              fontFamily: "'Inter', sans-serif",
            }}>
              {issue.summary}
            </div>
          )}
        </div>

        {/* Flag + hover-reveal edit + three-dots (hidden during edit) */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 flex-shrink-0" style={{ marginLeft: 4, marginTop: 1 }}>
            {issue.isFlagged && <Flag size={12} color="#E5493A" fill="#E5493A" />}
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
              <Pencil size={12} color={tk.textMuted} />
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
              <MoreHorizontal size={14} color={tk.textMuted} />
            </button>
          </div>
        )}
      </div>

      {/* ─── BADGE ROW: Jira epic lozenge (light gray) + Fix Version (bordered) ─── */}
      {(epicLabel || fixVersionLabel) && (
        <div className="flex items-center flex-wrap" style={{ gap: 4, marginBottom: 4 }}>
          {epicLabel && (
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              /* Jira parity: #DDDEE1 surface, #292A2E text, 3px radius, 16px tall */
              background: tk.epicLozengeBg, color: tk.epicLozengeText,
              padding: '0 6px', borderRadius: 3,
              height: 16, lineHeight: '16px',
              /* Fill available card interior; ellipsis handles overflow.
                 Previously a hard 200px cap left ~23px of dead space on
                 the right of 267px columns. */
              maxWidth: '100%', minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center',
              letterSpacing: '0.02em',
            }}>{epicLabel}</span>
          )}
          {fixVersionLabel && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: 'transparent', color: tk.textMuted,
              padding: '0 6px', borderRadius: 3,
              border: `1px solid ${tk.border}`,
              height: 16, lineHeight: '14px',
              /* Same reasoning as epic lozenge above — let flex-wrap +
                 ellipsis handle overflow, no hard cap. */
              maxWidth: '100%', minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center',
              textTransform: 'uppercase',
            }}>{fixVersionLabel}</span>
          )}
        </div>
      )}

      {/* spacer — only used when card has explicit minHeight */}

      {/* ─── FOOTER: Type Icon + Key (left) + Priority + Avatar (right) ─── */}
      <div className="flex items-center" style={{ gap: 6, minHeight: d.footerHeight, marginTop: 6 }}>
        {vf?.workType !== false && <JiraIssueTypeIcon type={issue.issueType} size={14} />}
        {vf?.workItemKey !== false && (
          <span style={{
            fontSize: d.metaSize + 1, fontWeight: 500,
            color: tk.textMuted, fontFamily: "'JetBrains Mono', monospace",
            lineHeight: '14px',
          }}>
            {issue.issueKey}
          </span>
        )}
        <span className="flex-1" />
        {vf?.priority !== false && issue.priority && (
          <PriorityBars priority={issue.priority} />
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
