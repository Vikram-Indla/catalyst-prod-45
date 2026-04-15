/**
 * WorkItemOverflowMenu — Full Jira-parity context menu for kanban cards
 *
 * Actions (in order):
 *  Move work item >  |  Change status >  |  ---  |  Copy link  |  Copy key
 *  ---  |  Add/Remove flag  |  Add label  |  Link work item  |  Change parent
 *  ---  |  Archive  |  Delete
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  ArrowRightLeft, RefreshCw, Link2, Copy, Flag, Tag,
  Link as LinkIcon, GitBranch, Archive, Trash2, ChevronRight, Check,
} from 'lucide-react';
import { KANBAN_COLUMNS } from '../kanban-tokens';
import type { BoardIssue } from '../kanban-types';
import type { KanbanThemeTokens } from '../kanban-tokens';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface WorkItemOverflowMenuProps {
  issue: BoardIssue;
  menuPos: { x: number; y: number };
  tk: KanbanThemeTokens;
  onClose: () => void;
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
  onCopyKey?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
  onOpenDetail?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function WorkItemOverflowMenu({
  issue, menuPos, tk, onClose,
  onToggleFlag, onCopyLink, onCopyKey, onChangeStatus,
  onOpenDetail, onArchive, onDelete,
}: WorkItemOverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showStatusSub, setShowStatusSub] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopyLink = useCallback(() => {
    onCopyLink?.(issue.issueKey);
    onClose();
  }, [issue.issueKey, onCopyLink, onClose]);

  const handleCopyKey = useCallback(() => {
    navigator.clipboard.writeText(issue.issueKey).catch(() => {});
    onCopyKey?.(issue.issueKey);
    onClose();
  }, [issue.issueKey, onCopyKey, onClose]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(menuPos.x, window.innerWidth - 240),
    top: Math.min(menuPos.y, window.innerHeight - 420),
    zIndex: 9999,
    width: 230,
    background: tk.surfaceBg,
    border: `1px solid ${tk.border}`,
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
    padding: '4px 0',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <>
      <div ref={menuRef} style={menuStyle} onClick={e => e.stopPropagation()} role="menu">
        {/* Move work item */}
        <MenuItem icon={<ArrowRightLeft size={14} />} label="Move work item" hasSubmenu
          onClick={() => { onOpenDetail?.(issue.id); onClose(); }} tk={tk} />

        {/* Change status */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowStatusSub(true)}
          onMouseLeave={() => setShowStatusSub(false)}
        >
          <MenuItem icon={<RefreshCw size={14} />} label="Change status" hasSubmenu
            onClick={() => setShowStatusSub(p => !p)} tk={tk} />
          {showStatusSub && <StatusSubmenu issue={issue} tk={tk} onChangeStatus={onChangeStatus} onClose={onClose} />}
        </div>

        <Divider tk={tk} />

        {/* Copy link */}
        <MenuItem icon={<Link2 size={14} />} label="Copy link" onClick={handleCopyLink} tk={tk} />

        {/* Copy key */}
        <MenuItem icon={<Copy size={14} />} label="Copy key" onClick={handleCopyKey} tk={tk} />

        <Divider tk={tk} />

        {/* Flag */}
        <MenuItem
          icon={<Flag size={14} color={issue.isFlagged ? '#E5493A' : undefined} />}
          label={issue.isFlagged ? 'Remove flag' : 'Add flag'}
          onClick={() => { onToggleFlag?.(issue.id); onClose(); }}
          tk={tk}
        />

        {/* Add label */}
        <MenuItem icon={<Tag size={14} />} label="Add label"
          onClick={() => { onOpenDetail?.(issue.id); onClose(); }} tk={tk} />

        {/* Link work item */}
        <MenuItem icon={<LinkIcon size={14} />} label="Link work item"
          onClick={() => { onOpenDetail?.(issue.id); onClose(); }} tk={tk} />

        {/* Change parent */}
        <MenuItem icon={<GitBranch size={14} />} label="Change parent"
          onClick={() => { onOpenDetail?.(issue.id); onClose(); }} tk={tk} />

        <Divider tk={tk} />

        {/* Archive */}
        <MenuItem icon={<Archive size={14} />} label="Archive"
          onClick={() => setShowArchive(true)} tk={tk} destructive />

        {/* Delete */}
        <MenuItem icon={<Trash2 size={14} />} label="Delete"
          onClick={() => setShowDelete(true)} tk={tk} destructive />
      </div>

      {showArchive && (
        <ArchiveConfirmDialog
          issueKey={issue.issueKey}
          tk={tk}
          onConfirm={() => { onArchive?.(issue.id); onClose(); }}
          onCancel={() => setShowArchive(false)}
        />
      )}
      {showDelete && (
        <DeleteConfirmDialog
          issueKey={issue.issueKey}
          tk={tk}
          onConfirm={() => { onDelete?.(issue.id); onClose(); }}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

/* ═══ SUB-COMPONENTS ═══ */

function Divider({ tk }: { tk: KanbanThemeTokens }) {
  return <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 0' }} />;
}

function MenuItem({ icon, label, onClick, tk, hasSubmenu, destructive }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  tk: KanbanThemeTokens; hasSubmenu?: boolean; destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 12px', border: 'none',
        background: 'transparent', cursor: 'pointer',
        fontSize: 13, color: destructive ? '#E5493A' : tk.textPrimary,
        fontFamily: "'Inter', sans-serif", textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = tk.surfaceHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: destructive ? '#E5493A' : tk.textMuted, flexShrink: 0 }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {hasSubmenu && <ChevronRight size={12} color={tk.textMuted} />}
    </button>
  );
}

function StatusSubmenu({ issue, tk, onChangeStatus, onClose }: {
  issue: BoardIssue; tk: KanbanThemeTokens;
  onChangeStatus?: (id: string, status: string) => void; onClose: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', left: '100%', top: 0, zIndex: 10000,
      width: 200, maxHeight: 320, overflowY: 'auto',
      background: tk.surfaceBg, border: `1px solid ${tk.border}`,
      borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
      padding: '4px 0',
    }}>
      {KANBAN_COLUMNS.map(col => (
        <div key={col.id}>
          <div style={{
            padding: '4px 12px 2px', fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', color: tk.textDisabled,
            letterSpacing: '0.05em',
          }}>{col.name}</div>
          {col.statuses.map(s => {
            const isCurrent = issue.status === s;
            return (
              <button
                key={s}
                role="menuitem"
                onClick={() => {
                  if (!isCurrent) onChangeStatus?.(issue.id, s);
                  onClose();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 12px', border: 'none',
                  background: isCurrent ? tk.dropHighlight : 'transparent',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontSize: 12, color: isCurrent ? tk.selectedAccent : tk.textPrimary,
                  fontWeight: isCurrent ? 600 : 400,
                  fontFamily: "'Inter', sans-serif", textAlign: 'left',
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
  );
}
