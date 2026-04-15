/**
 * WorkItemCard — Enterprise-grade kanban card with context menu
 * 
 * Layout:
 *   HEADER: item_key (clickable) + priority + flag
 *   TITLE: line-clamped summary
 *   META: labels + sprint
 *   FOOTER: type icon + story points + assignee avatar
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Flag, MoreHorizontal, ExternalLink, Link2, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { KanbanAvatar } from './KanbanAvatar';
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
}

export function WorkItemCard({ issue, avatarUrl, d, tk, isSelected, onToggleFlag, onCopyLink }: WorkItemCardProps) {
  const [showMenu, setShowMenu] = useState(false);
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
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  }, []);

  const handleMenuBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right, y: rect.bottom + 4 });
    setShowMenu(prev => !prev);
  }, []);

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

      {/* CONTEXT MENU (Portal-positioned) */}
      {showMenu && menuPos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: menuPos.x,
            top: menuPos.y,
            zIndex: 9999,
            width: 200,
            background: tk.surfaceBg,
            border: `1px solid ${tk.border}`,
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
            padding: '4px 0',
          }}
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          {[
            { icon: <ExternalLink size={14} />, label: 'Open item', action: () => {} },
            { icon: <Link2 size={14} />, label: 'Copy link', action: () => { onCopyLink?.(issue.issueKey); setShowMenu(false); } },
            { icon: <Flag size={14} color={issue.isFlagged ? '#E5493A' : undefined} />, label: issue.isFlagged ? 'Remove flag' : 'Add flag', action: () => { onToggleFlag?.(issue.id); setShowMenu(false); } },
            { icon: <ArrowUpToLine size={14} />, label: 'Move to top', action: () => setShowMenu(false) },
            { icon: <ArrowDownToLine size={14} />, label: 'Move to bottom', action: () => setShowMenu(false) },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 12px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontSize: 13, color: tk.textPrimary,
                fontFamily: "'Inter', sans-serif",
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color: tk.textMuted, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
