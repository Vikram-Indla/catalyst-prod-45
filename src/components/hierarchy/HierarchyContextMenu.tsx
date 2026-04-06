/**
 * HierarchyContextMenu — Full-featured right-click / 3-dot context menu
 * F15: Right-click context menu  F16: 3-dot triggers same menu
 * Submenus for status, priority, assignee
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit, Copy, Link, ArrowRightLeft, Flag, Users, FolderInput,
  Plus, Trash2, ChevronRight,
} from 'lucide-react';
import type { AssigneeOption } from './AssigneeDropdown';

interface HierarchyContextMenuProps {
  x: number;
  y: number;
  itemKey: string;
  currentStatus: string;
  currentPriority?: string;
  currentAssignee?: string;
  allStatuses: string[];
  allAssignees: AssigneeOption[];
  onClose: () => void;
  onEditTitle: () => void;
  onCopyKey: () => void;
  onCopyLink: () => void;
  onChangeStatus: (status: string) => void;
  onChangePriority: (priority: string) => void;
  onChangeAssignee: (assignee: AssigneeOption | null) => void;
  onMoveToParent: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}

type SubMenu = 'status' | 'priority' | 'assignee' | null;

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low', 'None'];

export function HierarchyContextMenu({
  x, y, itemKey, currentStatus, currentPriority, currentAssignee,
  allStatuses, allAssignees, onClose,
  onEditTitle, onCopyKey, onCopyLink,
  onChangeStatus, onChangePriority, onChangeAssignee,
  onMoveToParent, onAddChild, onDelete,
}: HierarchyContextMenuProps) {
  const [subMenu, setSubMenu] = useState<SubMenu>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-ctx-menu]')) {
        requestAnimationFrame(onClose);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 380);

  const menuStyle: React.CSSProperties = {
    position: 'fixed', zIndex: 99999,
    width: 220, background: 'var(--cp-float)', border: '1px solid var(--divider)',
    borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
    fontFamily: "'Inter', sans-serif", paddingBlock: 4,
  };

  const itemStyle: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', fontSize: 13, color: 'var(--fg-2)',
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
  };

  const sep = <div style={{ borderTop: '1px solid #F1F5F9', margin: '4px 0' }} />;

  return createPortal(
    <div data-ctx-menu style={{ ...menuStyle, top: adjustedY, left: adjustedX }}
      onMouseDown={e => e.stopPropagation()}>

      <MenuItem icon={Edit} label="Edit Title" onClick={() => { onEditTitle(); onClose(); }} />
      <MenuItem icon={Copy} label={`Copy Key (${itemKey})`} onClick={() => { onCopyKey(); onClose(); }} />
      <MenuItem icon={Link} label="Copy Link" onClick={() => { onCopyLink(); onClose(); }} />

      {sep}

      {/* Status submenu */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setSubMenu('status')}
        onMouseLeave={() => setSubMenu(null)}>
        <button style={{ ...itemStyle }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}>
          <ArrowRightLeft size={13} color="var(--fg-4)" />
          <span style={{ flex: 1 }}>Change Status</span>
          <ChevronRight size={12} color="var(--fg-4)" />
        </button>
        {subMenu === 'status' && (
          <div data-ctx-menu style={{
            ...menuStyle, position: 'absolute', top: -4, left: 218, width: 180,
          }}>
            {allStatuses.map(s => (
              <button key={s} style={{ ...itemStyle, fontWeight: s === currentStatus ? 600 : 400,
                color: s === currentStatus ? 'var(--cp-blue)' : 'var(--fg-2)' }}
                onClick={() => { onChangeStatus(s); onClose(); }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                {s === currentStatus && <span style={{ fontSize: 10 }}>✓</span>}
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority submenu */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setSubMenu('priority')}
        onMouseLeave={() => setSubMenu(null)}>
        <button style={{ ...itemStyle }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}>
          <Flag size={13} color="var(--fg-4)" />
          <span style={{ flex: 1 }}>Change Priority</span>
          <ChevronRight size={12} color="var(--fg-4)" />
        </button>
        {subMenu === 'priority' && (
          <div data-ctx-menu style={{
            ...menuStyle, position: 'absolute', top: -4, left: 218, width: 160,
          }}>
            {PRIORITIES.map(p => (
              <button key={p} style={{ ...itemStyle, fontWeight: p === currentPriority ? 600 : 400 }}
                onClick={() => { onChangePriority(p); onClose(); }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <PriorityBarsInline level={priorityLevel(p)} />
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Assignee submenu */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setSubMenu('assignee')}
        onMouseLeave={() => setSubMenu(null)}>
        <button style={{ ...itemStyle }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}>
          <Users size={13} color="var(--fg-4)" />
          <span style={{ flex: 1 }}>Change Assignee</span>
          <ChevronRight size={12} color="var(--fg-4)" />
        </button>
        {subMenu === 'assignee' && (
          <div data-ctx-menu style={{
            ...menuStyle, position: 'absolute', top: -4, left: 218, width: 200, maxHeight: 240, overflowY: 'auto',
          }}>
            <button style={{ ...itemStyle, fontStyle: 'italic', color: 'var(--fg-3, #94A3B8)' }}
              onClick={() => { onChangeAssignee(null); onClose(); }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}>
              Unassigned
            </button>
            {allAssignees.map(a => (
              <button key={a.displayName} style={{
                ...itemStyle, fontWeight: a.displayName === currentAssignee ? 600 : 400,
              }}
                onClick={() => { onChangeAssignee(a); onClose(); }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--cp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#FFFFFF' }}>
                    {a.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <MenuItem icon={FolderInput} label="Move to Parent" onClick={() => { onMoveToParent(); onClose(); }} />

      {sep}

      <MenuItem icon={Plus} label="Add Child" onClick={() => { onAddChild(); onClose(); }} />

      {sep}

      {confirmDelete ? (
        <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--sem-danger)' }}>Delete?</span>
          <button onClick={() => { onDelete(); onClose(); }} style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: 'var(--sem-danger)', color: '#FFFFFF', border: 'none', cursor: 'pointer',
          }}>Yes</button>
          <button onClick={() => setConfirmDelete(false)} style={{
            fontSize: 11, padding: '2px 8px', color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer',
          }}>No</button>
        </div>
      ) : (
        <button style={{ ...itemStyle, color: 'var(--sem-danger)' }}
          onClick={() => setConfirmDelete(true)}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--tint-red, #FEF2F2)')}
          onMouseLeave={e => (e.currentTarget.style.background = '')}>
          <Trash2 size={13} /> Delete
        </button>
      )}
    </div>,
    document.body
  );
}

function MenuItem({ icon: Icon, label, onClick }: {
  icon: React.ComponentType<any>;
  label: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 12px', fontSize: 13, color: 'var(--fg-2)',
      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      <Icon size={13} color="var(--fg-4)" /> {label}
    </button>
  );
}

function PriorityBarsInline({ level }: { level: number }) {
  return (
    <div style={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ width: 8, height: 3, borderRadius: 1, background: i <= level ? 'var(--fg-3)' : 'var(--divider)' }} />
      ))}
    </div>
  );
}

function priorityLevel(name: string): number {
  const n = name.toLowerCase();
  if (n === 'critical') return 4;
  if (n === 'high') return 3;
  if (n === 'medium') return 2;
  if (n === 'low') return 1;
  return 0;
}
