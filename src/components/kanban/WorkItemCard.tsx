/**
 * WorkItemCard — Enterprise-grade kanban card with enhanced context menu
 * 
 * Layout:
 *   HEADER: item_key (clickable) + priority + flag
 *   TITLE: line-clamped summary
 *   META: labels + sprint
 *   FOOTER: type icon + story points + assignee avatar
 *
 * Context menu: Open item, Copy link, Flag, Change Status, Move to top/bottom
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Flag, MoreHorizontal, ExternalLink, Link2, ArrowUpToLine, ArrowDownToLine, ChevronRight, Check } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { KanbanAvatar } from './KanbanAvatar';
import { KANBAN_COLUMNS } from './kanban-tokens';
import type { BoardIssue } from './kanban-types';
import type { KanbanThemeTokens, DensityConfig } from './kanban-tokens';

interface WorkItemCardProps {
  issue: BoardIssue;
  avatarUrl?: string | null;
  d: DensityConfig;
  tk: KanbanThemeTokens;
  isSelected?: boolean;
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
  onOpenDetail?: (id: string) => void;
}

export function WorkItemCard({ issue, avatarUrl, d, tk, isSelected, onToggleFlag, onCopyLink, onChangeStatus, onOpenDetail }: WorkItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showStatusSub, setShowStatusSub] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setShowMenu(false);
        setShowStatusSub(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // Close on ESC
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowMenu(false); setShowStatusSub(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showMenu]);

  const handleMenuBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right, y: rect.bottom + 4 });
    setShowMenu(prev => !prev);
    setShowStatusSub(false);
  }, []);

  // All available statuses from column config
  const allStatuses = KANBAN_COLUMNS.flatMap(c => c.statuses);

  return (
    <>
      {/* HEADER ROW: Key + Priority + Flag + Menu */}
      <div className="flex items-center" style={{ gap: 4, marginBottom: 2 }}>
        <JiraIssueTypeIcon type={issue.issueType} size={d.avatarSize > 22 ? 16 : 14} />
        <span style={{
          fontSize: d.metaSize + 1,
          fontWeight: 500,
          color: '#2563EB',
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: '14px',
          cursor: 'pointer',
        }}>
          {issue.issueKey}
        </span>
        <span className="flex-1" />
        {issue.isFlagged && <Flag size={12} color="#E5493A" fill="#E5493A" />}
        <PriorityBars priority={normalisePriority(issue.priority)} />
        <button
          ref={btnRef}
          onClick={handleMenuBtn}
          className="kanban-card-menu-btn"
          style={{
            width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer',
            opacity: 0, transition: 'opacity 80ms',
            flexShrink: 0, padding: 0,
          }}
        >
          <MoreHorizontal size={14} color={tk.textMuted} />
        </button>
      </div>

      {/* TITLE */}
      <div style={{
        fontSize: d.titleSize,
        lineHeight: `${d.titleSize + 4}px`,
        color: tk.textPrimary,
        fontWeight: 400,
        marginBottom: d.cardGap > 4 ? 4 : 2,
        display: '-webkit-box',
        WebkitLineClamp: d.titleClamp,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
      }}>
        {issue.summary}
      </div>

      {/* META ROW: Labels + Sprint */}
      {(issue.labels.length > 0 || issue.sprintName) && (
        <div className="flex items-center gap-1 mb-[2px]" style={{ overflow: 'hidden' }}>
          {issue.labels.slice(0, 2).map(l => (
            <span key={l} style={{
              fontSize: d.metaSize,
              fontWeight: 700,
              textTransform: 'uppercase',
              background: tk.chipBg,
              color: tk.chipText,
              padding: '0 4px',
              borderRadius: 2,
              lineHeight: '16px',
              maxWidth: 100,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              flexShrink: 0,
            }}>{l}</span>
          ))}
          {issue.labels.length > 2 && (
            <span style={{ fontSize: d.metaSize - 1, color: tk.textMuted }}>+{issue.labels.length - 2}</span>
          )}
          {issue.sprintName && (
            <span style={{
              fontSize: d.metaSize,
              fontWeight: 600,
              color: tk.textMuted,
              lineHeight: '14px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              border: `1px solid ${tk.borderSubtle}`,
              borderRadius: 2,
              padding: '0 4px',
            }}>{issue.sprintName}</span>
          )}
        </div>
      )}

      {/* FOOTER: Points + Assignee */}
      <div className="flex items-center" style={{ gap: 4, minHeight: d.footerHeight }}>
        {issue.storyPoints != null && (
          <span style={{
            fontSize: d.metaSize,
            fontWeight: 700,
            color: tk.textMuted,
            background: tk.badgeBg,
            borderRadius: 10,
            padding: '0 5px',
            lineHeight: '16px',
          }}>{issue.storyPoints}</span>
        )}
        <span className="flex-1" />
        <KanbanAvatar name={issue.assigneeName} url={avatarUrl} size={d.avatarSize} tk={tk} />
      </div>

      {/* CONTEXT MENU */}
      {showMenu && menuPos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: Math.min(menuPos.x, window.innerWidth - 220),
            top: Math.min(menuPos.y, window.innerHeight - 300),
            zIndex: 9999,
            width: 210,
            background: tk.surfaceBg,
            border: `1px solid ${tk.border}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
            padding: '4px 0',
          }}
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          <MenuItem icon={<ExternalLink size={14} />} label="Open item" onClick={() => { onOpenDetail?.(issue.id); setShowMenu(false); }} tk={tk} />
          <MenuItem icon={<Link2 size={14} />} label="Copy link" onClick={() => { onCopyLink?.(issue.issueKey); setShowMenu(false); }} tk={tk} />
          <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 0' }} />
          <MenuItem
            icon={<Flag size={14} color={issue.isFlagged ? '#E5493A' : undefined} />}
            label={issue.isFlagged ? 'Remove flag' : 'Add flag'}
            onClick={() => { onToggleFlag?.(issue.id); setShowMenu(false); }}
            tk={tk}
          />
          {/* Change Status submenu */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowStatusSub(true)}
            onMouseLeave={() => setShowStatusSub(false)}
          >
            <MenuItem
              icon={<ChevronRight size={14} />}
              label="Change status"
              onClick={() => setShowStatusSub(prev => !prev)}
              tk={tk}
              hasSubmenu
            />
            {showStatusSub && (
              <div style={{
                position: 'absolute',
                left: '100%',
                top: 0,
                zIndex: 10000,
                width: 200,
                maxHeight: 320,
                overflowY: 'auto',
                background: tk.surfaceBg,
                border: `1px solid ${tk.border}`,
                borderRadius: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
                padding: '4px 0',
              }}>
                {KANBAN_COLUMNS.map(col => (
                  <div key={col.id}>
                    <div style={{
                      padding: '4px 12px 2px',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: tk.textDisabled,
                      letterSpacing: '0.05em',
                    }}>{col.name}</div>
                    {col.statuses.map(s => {
                      const isCurrent = issue.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            if (!isCurrent) onChangeStatus?.(issue.id, s);
                            setShowMenu(false);
                            setShowStatusSub(false);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            width: '100%', padding: '6px 12px', border: 'none',
                            background: isCurrent ? tk.dropHighlight : 'transparent',
                            cursor: isCurrent ? 'default' : 'pointer',
                            fontSize: 12, color: isCurrent ? tk.selectedAccent : tk.textPrimary,
                            fontWeight: isCurrent ? 600 : 400,
                            fontFamily: "'Inter', sans-serif",
                            textAlign: 'left',
                          }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = tk.surfaceHover; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? tk.dropHighlight : 'transparent'; }}
                        >
                          {isCurrent && <Check size={12} color={tk.selectedAccent} />}
                          <span style={{ marginLeft: isCurrent ? 0 : 20 }}>{s}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 0' }} />
          <MenuItem icon={<ArrowUpToLine size={14} />} label="Move to top" onClick={() => setShowMenu(false)} tk={tk} />
          <MenuItem icon={<ArrowDownToLine size={14} />} label="Move to bottom" onClick={() => setShowMenu(false)} tk={tk} />
        </div>
      )}
    </>
  );
}

function MenuItem({ icon, label, onClick, tk, hasSubmenu }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  tk: KanbanThemeTokens; hasSubmenu?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 12px', border: 'none',
        background: 'transparent', cursor: 'pointer',
        fontSize: 13, color: tk.textPrimary,
        fontFamily: "'Inter', sans-serif",
        textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: tk.textMuted, flexShrink: 0 }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {hasSubmenu && <ChevronRight size={12} color={tk.textMuted} />}
    </button>
  );
}
