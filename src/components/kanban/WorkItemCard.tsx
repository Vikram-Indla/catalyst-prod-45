/**
 * WorkItemCard — Enterprise-grade kanban card matching Jira reference density
 *
 * Layout (top → bottom):
 *   TITLE ROW: summary + hover-reveal edit + three-dots menu
 *   META ROWS: assignee name (plain text) + epic/parent (plain text) + sprint-release (plain text)
 *   FOOTER: type-icon + issue_key (left) + priority chevron + assignee avatar (right)
 */
import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import FlagFilledIcon from '@atlaskit/icon/core/flag-filled';
import MoreIcon from '@atlaskit/icon/glyph/more';
import EditIcon from '@atlaskit/icon/core/edit';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import CloseIcon from '@atlaskit/icon/core/close';
import AkChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { KanbanAvatar } from './KanbanAvatar';
import { type AssigneeOption } from './AssigneePickerPopover';
import { ProfilePicker, type ProfilePickerMember, type ProfilePickerSelection } from '@/components/ads';
import { SourceBadge } from '@/components/producthub/shared/SourceBadge';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig, KanbanColumnDef } from './kanban-tokens';
import { SPACING_TOKENS, KANBAN_COLUMNS } from './kanban-tokens';
import type { VisibleFields } from '@/hooks/useKanbanViewSettings';
import { catalystToast } from '@/lib/catalystToast';

/* ═══ PRIORITY ICON — Jira-parity directional chevrons ═══ */

const PRIORITY_COLORS: Record<string, string> = {
  highest: 'var(--ds-background-danger-bold, #C9372C)',
  high:    '#E97F33', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  medium:  'var(--ds-background-warning-bold, #E2B203)',
  low:     '#2D8738', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  lowest:  '#57A55A', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
};

function PriorityIcon({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  const color = PRIORITY_COLORS[p] || 'var(--ds-text-subtle, #44546F)';
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
  /** Ordered list of columns currently rendered on the board. When provided,
   *  the three-dots menu's "Change status" sub-menu lists every column except
   *  the one containing this card's current status. Falls back to the
   *  module-default KANBAN_COLUMNS if omitted (legacy callers). */
  boardColumns?: KanbanColumnDef[];
}

/* ── SubtaskStrip: row of subtask chips ── */

function SubtaskStrip({ subtasks, tk }: { subtasks: BoardIssue[]; tk: KanbanThemeTokens }) {
  if (!subtasks.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4, marginBottom: 2 }}>
      {subtasks.map(st => (
          <span
            key={st.id}
            role="img"
            aria-label={st.issueKey}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 6px',
              borderRadius: 3,
              background: 'var(--ds-background-neutral, #F1F2F4)',
              color: tk.textMuted,
              fontSize: 'var(--ds-font-size-100)', fontFamily: 'var(--cp-font-body)',
              lineHeight: '16px',
              cursor: 'default',
              userSelect: 'none',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-hovered, var(--ds-border-disabled, #DCDFE4))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, var(--ds-background-neutral, #F1F2F4))'; }}
          >
            <JiraIssueTypeIcon type={st.issueType} size={12} />
            <span>{st.issueKey}</span>
          </span>
      ))}
    </div>
  );
}

export function WorkItemCard({
  issue, avatarUrl, d, tk, isSelected,
  onToggleFlag, onCopyLink, onCopyKey, onChangeStatus, onOpenDetail,
  onArchive, onDelete, onSaveSummary, onChangeAssignee, assigneeOptions, avatarsByName,
  projectKey, onLabelsUpdated, onParentChange, onMoved, onLinked, visibleFields,
  resolveIcon, subtasks = [], boardColumns,
}: WorkItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(issue.summary);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleMenuBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Use btnRef instead of e.target — when the user clicks the SVG glyph
    // inside the button, e.target is the SVG, not the button. The button's
    // rect is the correct anchor for the menu.
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuPos({ x: rect.right, y: rect.bottom + 4 });
    setShowMenu(prev => !prev);
    setStatusSubmenuOpen(false);
  }, []);

  /* ── Three-dots menu: close on outside click + Escape ───────────────── */
  useEffect(() => {
    if (!showMenu) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      setShowMenu(false);
      setStatusSubmenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
        setStatusSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showMenu]);

  /* ── Menu actions ─────────────────────────────────────────────────── */
  const closeMenu = useCallback(() => {
    setShowMenu(false);
    setStatusSubmenuOpen(false);
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = `${window.location.origin}/project-hub/${projectKey || issue.issueKey.split('-')[0]}/allwork/${encodeURIComponent(issue.issueKey)}`;
    try {
      await navigator.clipboard.writeText(url);
      catalystToast.success('Link copied');
    } catch {
      catalystToast.error('Copy failed');
    }
    onCopyLink?.(issue.issueKey);
    closeMenu();
  }, [issue.issueKey, projectKey, onCopyLink, closeMenu]);

  const handleCopyKey = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(issue.issueKey);
      catalystToast.success(`Copied ${issue.issueKey}`);
    } catch {
      catalystToast.error('Copy failed');
    }
    onCopyKey?.(issue.issueKey);
    closeMenu();
  }, [issue.issueKey, onCopyKey, closeMenu]);

  const handlePickStatus = useCallback((status: string) => {
    onChangeStatus?.(issue.id, status);
    closeMenu();
  }, [issue.id, onChangeStatus, closeMenu]);

  /* Status options: every column EXCEPT the one containing the issue's
     current status, IN THE SAME ORDER the board renders them. We prefer
     the host-supplied `boardColumns` (the actual columns on screen, which
     may be a custom 3-column setup) and fall back to the module default
     only when the host didn't pass one. This ensures backward statuses
     (above the current column) appear in the menu too. */
  const columnsForMenu = boardColumns && boardColumns.length > 0 ? boardColumns : KANBAN_COLUMNS;
  const currentColId = columnsForMenu.find(c =>
    c.statuses.some(s => s.toLowerCase() === (issue.status || '').toLowerCase())
  )?.id;
  const statusOptions = columnsForMenu
    .filter(c => c.id !== currentColId)
    .map(c => ({ id: c.id, name: c.name, status: c.statuses[0] }));

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
                dir="auto"
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
                  <CheckMarkIcon label="Save" size="small" primaryColor="var(--ds-background-success-bold, #1F845A)" />
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
                  <CloseIcon label="Cancel" size="small" primaryColor="var(--ds-background-danger-bold, #C9372C)" />
                </button>
              </div>
            </div>
          ) : (
            <div dir="auto" style={{
              fontSize: d.titleSize,
              lineHeight: `${d.titleSize + 6}px`,
              color: tk.textPrimary,
              fontWeight: 400,                          /* jira-compare 2026-05-08: Jira card titles are 400/regular, NOT bold */
              marginBottom: 4,
              /* No paddingRight here: the flex sibling (flag + menu)
                 reserves room on the right. The edit pen now lives
                 INLINE at the end of the title (see button below) so it
                 sits flush with where the title ends, regardless of how
                 many lines the title wraps to. */
              display: '-webkit-box',
              WebkitLineClamp: d.titleClamp,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              fontFamily: 'var(--cp-font-body)',
            }}>
              {issue.summary}
              <button
                className="kanban-card-edit-btn"
                onClick={startEditing}
                style={{
                  width: 18, height: 18,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  verticalAlign: 'middle',
                  marginLeft: 4,
                  borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer',
                  opacity: 0, transition: 'opacity 80ms',
                  padding: 0,
                }}
                aria-label="Edit title"
              >
                <EditIcon label="Edit title" size="small" primaryColor={tk.textMuted} />
              </button>
            </div>
          )}
        </div>

        {/* Flag + three-dots (edit pen now lives inline at the end of the
            title text, see above). Hidden during edit mode. */}
        {!isEditing && (
          <div className="flex items-center flex-shrink-0" style={{ gap: 2, marginLeft: 4, marginTop: 1 }}>
            {issue.isFlagged && <FlagFilledIcon label="Flagged" size="small" primaryColor="var(--ds-background-danger-bold, #C9372C)" />}
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
            fontSize: 'var(--ds-font-size-100)', fontWeight: 400, color: tk.epicLozengeText,
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
          onChangeAssignee && assigneeOptions && avatarsByName ? (() => {
            /* 2026-06-21 Phase 4 migration: bespoke AssigneePickerPopover swapped
               for the canonical <ProfilePicker />. AssigneeOption uses `name` as
               identity (no userId), so the name doubles as the picker key. */
            const pickerMembers: ProfilePickerMember[] = assigneeOptions.map((o) => ({
              userId: o.name,
              name: o.name,
              avatarUrl: avatarsByName.get(o.name?.toLowerCase()) ?? null,
            }));
            const pickerValue: ProfilePickerSelection = issue.assigneeName
              ? {
                  userId: issue.assigneeName,
                  name: issue.assigneeName,
                  avatarUrl: avatarsByName.get(issue.assigneeName.toLowerCase()) ?? avatarUrl ?? null,
                }
              : null;
            return (
              <ProfilePicker
                value={pickerValue}
                onChange={(next) => onChangeAssignee(issue.id, next?.name ?? null)}
                members={pickerMembers}
                fieldLabel="Assignee"
                /* 2026-06-21 (Vikram canonical): once assigned, locked. Lock
                   applies app-wide including kanban quick-reassign. */
                lockWhenAssigned
                renderTrigger={({ onClick, ref, value, disabled }) => (
                  <button
                    ref={ref}
                    type="button"
                    disabled={disabled}
                    onClick={(e) => { if (disabled) return; e.stopPropagation(); onClick(e); }}
                    title={
                      disabled
                        ? `Assignee locked: ${value?.name ?? ''}`
                        : value?.name
                          ? `Assignee: ${value.name} — click to change`
                          : 'Assign'
                    }
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: disabled ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <KanbanAvatar
                      name={value?.name ?? null}
                      url={value?.avatarUrl ?? undefined}
                      size={d.avatarSize}
                      tk={tk}
                    />
                  </button>
                )}
              />
            );
          })() : (
            <KanbanAvatar name={issue.assigneeName} url={avatarUrl} size={d.avatarSize} tk={tk} />
          )
        )}
      </div>

      {/* ─── OVERFLOW MENU (simple Jira-style) ─── */}
      {showMenu && menuPos && createPortal(
        (() => {
          // Anchor: menu's right edge aligned to the trigger button's right.
          const menuWidth = 200;
          const left = Math.max(8, Math.min(menuPos.x - menuWidth, window.innerWidth - menuWidth - 8));
          const top = Math.min(menuPos.y, window.innerHeight - 220);
          // Light-blue hover/focus background — matches the card surface
          // palette (var(--ds-background-information)) so the menu reads
          // as part of the same blue family rather than the neutral gray
          // we use elsewhere.
          const hoverBg = 'var(--ds-background-information, #E9F2FE)';
          // Mouse + keyboard parity — same blue on hover and focus.
          const activate = (e: React.SyntheticEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
          };
          const deactivate = (e: React.SyntheticEvent<HTMLButtonElement>) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          };
          return (
            <div
              ref={menuRef}
              role="menu"
              data-testid={`workitem-menu-${issue.issueKey}`}
              style={{
                position: 'fixed',
                left,
                top,
                zIndex: 9999,
                width: menuWidth,
                background: tk.surfaceBg,
                border: `1px solid ${tk.border}`,
                borderRadius: 6,
                boxShadow: '0 4px 16px var(--ds-shadow-raised, rgba(9,30,66,0.16))',
                padding: '4px 0',
                fontFamily: 'var(--cp-font-body)',
              }}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              {/* Change status (hover-reveal sub-menu of every column EXCEPT current) */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setStatusSubmenuOpen(true)}
                onMouseLeave={() => setStatusSubmenuOpen(false)}
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={statusSubmenuOpen}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '8px 12px', border: 'none',
                    background: statusSubmenuOpen ? hoverBg : 'transparent',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: 'var(--ds-font-size-300)', color: tk.textPrimary,
                    fontFamily: 'var(--cp-font-body)',
                    outline: 'none',
                  }}
                  onMouseEnter={activate}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = statusSubmenuOpen ? hoverBg : 'transparent';
                  }}
                  onFocus={activate}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = statusSubmenuOpen ? hoverBg : 'transparent';
                  }}
                >
                  <span style={{ flex: 1 }}>Change status</span>
                  <AkChevronRightIcon label="" size="medium" primaryColor={tk.textMuted} />
                </button>
                {statusSubmenuOpen && statusOptions.length > 0 && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute',
                      /* No gap between the menu and the sub-menu: left/top
                         pinned flush against the parent so the user can
                         drag horizontally onto the sub-menu without ever
                         leaving a hover region. */
                      left: '100%',
                      top: 0,
                      minWidth: 180,
                      background: tk.surfaceBg,
                      border: `1px solid ${tk.border}`,
                      borderRadius: 6,
                      boxShadow: '0 4px 16px var(--ds-shadow-raised, rgba(9,30,66,0.16))',
                      padding: '4px 0',
                      zIndex: 10000,
                    }}
                  >
                    {statusOptions.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        role="menuitem"
                        onClick={() => handlePickStatus(opt.status)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '8px 12px', border: 'none',
                          background: 'transparent', cursor: 'pointer', textAlign: 'left',
                          fontSize: 'var(--ds-font-size-300)', color: tk.textPrimary,
                          fontFamily: 'var(--cp-font-body)',
                          textTransform: 'capitalize',
                          outline: 'none',
                        }}
                        onMouseEnter={activate}
                        onMouseLeave={deactivate}
                        onFocus={activate}
                        onBlur={deactivate}
                      >
                        {opt.name.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 8px' }} />

              {/* Copy link */}
              <button
                type="button"
                role="menuitem"
                onClick={handleCopyLink}
                style={{
                  display: 'flex', alignItems: 'center',
                  width: '100%', padding: '8px 12px', border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontSize: 'var(--ds-font-size-300)', color: tk.textPrimary,
                  fontFamily: 'var(--cp-font-body)',
                  outline: 'none',
                }}
                onMouseEnter={activate}
                onMouseLeave={deactivate}
                onFocus={activate}
                onBlur={deactivate}
              >
                Copy link
              </button>

              {/* Copy key */}
              <button
                type="button"
                role="menuitem"
                onClick={handleCopyKey}
                style={{
                  display: 'flex', alignItems: 'center',
                  width: '100%', padding: '8px 12px', border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  fontSize: 'var(--ds-font-size-300)', color: tk.textPrimary,
                  fontFamily: 'var(--cp-font-body)',
                  outline: 'none',
                }}
                onMouseEnter={activate}
                onMouseLeave={deactivate}
                onFocus={activate}
                onBlur={deactivate}
              >
                Copy key
              </button>
            </div>
          );
        })(),
        document.body,
      )}
    </div>
  );
}
