/**
 * WorkItemOverflowMenu — Full Jira-parity context menu for kanban cards
 *
 * Actions (in order):
 *  Move work item >  |  Change status >  |  ---  |  Copy link  |  Copy key
 *  ---  |  Add/Remove flag  |  Add label >  |  Link work item  |  Change parent >
 *  ---  |  Archive  |  Delete
 */
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  ArrowRightLeft, RefreshCw, Link2, Copy, Flag, Tag,
  Link as LinkIcon, GitBranch, Archive, Trash2, ChevronRight,
} from 'lucide-react';
import type { BoardIssue } from '../kanban-types';
import type { KanbanThemeTokens } from '../kanban-tokens';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { StatusChangePanel } from './StatusChangePanel';
import { LabelEditorPanel } from './LabelEditorPanel';
import { ParentPickerPanel } from './ParentPickerPanel';
import { MoveWorkItemModal } from './MoveWorkItemModal';
import { LinkWorkItemModal } from './LinkWorkItemModal';

interface WorkItemOverflowMenuProps {
  issue: BoardIssue;
  menuPos: { x: number; y: number };
  tk: KanbanThemeTokens;
  projectKey: string;
  onClose: () => void;
  onToggleFlag?: (id: string) => void;
  onCopyLink?: (issueKey: string) => void;
  onCopyKey?: (issueKey: string) => void;
  onChangeStatus?: (issueId: string, newStatus: string) => void;
  onOpenDetail?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onLabelsUpdated?: (issueId: string, newLabels: string[]) => void;
  onParentChange?: (issueId: string, newParentKey: string | null) => void;
  onMoved?: (issueId: string, newProjectKey: string) => void;
  onLinked?: () => void;
}

export function WorkItemOverflowMenu({
  issue, menuPos, tk, projectKey, onClose,
  onToggleFlag, onCopyLink, onCopyKey, onChangeStatus,
  onOpenDetail, onArchive, onDelete, onLabelsUpdated, onParentChange,
  onMoved, onLinked,
}: WorkItemOverflowMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<'status' | 'label' | 'parent' | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showLink, setShowLink] = useState(false);

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
      if (e.key === 'Escape') {
        if (activePanel) setActivePanel(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, activePanel]);

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
        <MenuItem icon={<ArrowRightLeft size={14} />} label="Move work item"
          onClick={() => setShowMove(true)} tk={tk} />

        {/* Change status */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setActivePanel('status')}
          onMouseLeave={() => { if (activePanel === 'status') setActivePanel(null); }}
        >
          <MenuItem icon={<RefreshCw size={14} />} label="Change status" hasSubmenu
            onClick={() => setActivePanel(p => p === 'status' ? null : 'status')} tk={tk} />
          {activePanel === 'status' && (
            <StatusChangePanel
              currentStatus={issue.status}
              tk={tk}
              onChangeStatus={(s) => onChangeStatus?.(issue.id, s)}
              onClose={onClose}
            />
          )}
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
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setActivePanel('label')}
          onMouseLeave={() => { if (activePanel === 'label') setActivePanel(null); }}
        >
          <MenuItem icon={<Tag size={14} />} label="Add label" hasSubmenu
            onClick={() => setActivePanel(p => p === 'label' ? null : 'label')} tk={tk} />
          {activePanel === 'label' && (
            <LabelEditorPanel
              issueId={issue.id}
              issueKey={issue.issueKey}
              currentLabels={issue.labels}
              tk={tk}
              onClose={onClose}
              onLabelsUpdated={(labels) => onLabelsUpdated?.(issue.id, labels)}
            />
          )}
        </div>

        {/* Link work item */}
        <MenuItem icon={<LinkIcon size={14} />} label="Link work item"
          onClick={() => setShowLink(true)} tk={tk} />

        {/* Change parent */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setActivePanel('parent')}
          onMouseLeave={() => { if (activePanel === 'parent') setActivePanel(null); }}
        >
          <MenuItem icon={<GitBranch size={14} />} label="Change parent" hasSubmenu
            onClick={() => setActivePanel(p => p === 'parent' ? null : 'parent')} tk={tk} />
          {activePanel === 'parent' && (
            <ParentPickerPanel
              issueId={issue.id}
              issueKey={issue.issueKey}
              issueType={issue.issueType}
              currentParentKey={issue.parentKey}
              projectKey={projectKey}
              tk={tk}
              onClose={onClose}
              onParentChange={(parentKey) => onParentChange?.(issue.id, parentKey)}
            />
          )}
        </div>

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
