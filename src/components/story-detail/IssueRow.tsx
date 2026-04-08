import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical, MoreHorizontal, Minus, ArrowUp, ArrowDown, AlertOctagon } from 'lucide-react';
import { StatusLozenge } from '@/components/story-detail/StatusLozenge';

/* ── Types ── */
export interface IssueRowIssue {
  key: string;
  summary: string;
  type: 'story' | 'bug' | 'task' | 'subtask' | 'epic' | 'design' | 'frontend' | 'backend' | 'integration';
  priority?: {
    name: string;
    level: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
  };
  assignee?: {
    name: string;
    avatarUrl?: string;
    initials: string;
    initialsColor: string;
  };
  status: {
    name: string;
    category: 'todo' | 'in_progress' | 'done';
  };
}

export interface IssueRowProps {
  issue: IssueRowIssue;
  variant: 'subtask' | 'linked';
  linkType?: string;
  onNavigate?: (key: string) => void;
  onStatusChange?: (key: string, newStatus: string) => void;
  onDelete?: (key: string) => void;
  onDragStart?: () => void;
  showDragHandle?: boolean;
}

/* ── Tokens (hex, V12) ── */
const T = {
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  textLink:      '#2563EB',
  borderSubtle:  '#E2E8F0',
  hoverBg:       'rgba(0,0,0,0.04)',
  white:         '#FFFFFF',
  font:          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  // type colours
  blue:          '#2563EB',
  purple:        '#7C3AED',
  green:         '#16A34A',
  red:           '#E5493A',
  teal:          '#0D9488',
  sky:           '#4BADE8',
} as const;

/* ── Canonical work-item type icons (SVG, not Lucide — FP-008) ── */
const TYPE_ICONS: Record<string, { color: string; svg: React.ReactNode }> = {
  story:       { color: '#63BA3C', svg: <path d="M4 2h8l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#63BA3C"/> },
  bug:         { color: '#E5493A', svg: <circle cx="8" cy="8" r="6" fill="#E5493A"/> },
  task:        { color: '#4BADE8', svg: <><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><path d="M4 8l3 3 5-5" stroke="#FFF" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
  subtask:     { color: '#4BADE8', svg: <><rect x="2" y="2" width="12" height="12" rx="2" fill="none" stroke="#4BADE8" strokeWidth="1.5" strokeDasharray="3 2"/><path d="M5 8l2 2 4-4" stroke="#4BADE8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></> },
  epic:        { color: '#904EE2', svg: <path d="M9 1L5 9h4l-1 6 5-8H9l1-6z" fill="#904EE2"/> },
  design:      { color: '#2563EB', svg: <><rect x="1" y="1" width="6" height="6" rx="1" fill="#2563EB"/><rect x="9" y="1" width="6" height="6" rx="1" fill="#2563EB" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1" fill="#2563EB" opacity="0.6"/><rect x="9" y="9" width="6" height="6" rx="1" fill="#2563EB" opacity="0.4"/></> },
  frontend:    { color: '#2563EB', svg: <><rect x="1" y="1" width="14" height="14" rx="2" fill="#2563EB" opacity="0.15"/><path d="M5 5h6M5 8h4" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/></> },
  backend:     { color: '#7C3AED', svg: <><circle cx="8" cy="8" r="6" fill="none" stroke="#7C3AED" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" fill="#7C3AED"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round"/></> },
  integration: { color: '#0D9488', svg: <><path d="M4 4l8 8M12 4l-8 8" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round"/></> },
};

function TypeIcon({ type }: { type: string }) {
  const icon = TYPE_ICONS[type] || TYPE_ICONS.story;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      {icon.svg}
    </svg>
  );
}

/* ── Priority icon ── */
function PriorityIcon({ level }: { level: string }) {
  const props = { size: 14, strokeWidth: 2 };
  switch (level) {
    case 'highest': return <AlertOctagon {...props} color="#DC2626" />;
    case 'high':    return <ArrowUp {...props} color="#D97706" />;
    case 'medium':  return <Minus {...props} color="#CF7B00" />;
    case 'low':     return <ArrowDown {...props} color="#94A3B8" />;
    case 'lowest':  return <ArrowDown {...props} color="#CBD5E1" />;
    default:        return <Minus {...props} color="#94A3B8" />;
  }
}

/* ── Status transitions ── */
const ALL_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];

/* ── Action menu (linked) ── */
function ActionMenu({ issueKey, onDelete, anchorRef }: { issueKey: string; onDelete: (k: string) => void; anchorRef: React.RefObject<HTMLButtonElement | null> }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.right - 160 });
    }
  }, [anchorRef]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 160,
        background: T.white,
        border: `1px solid ${T.borderSubtle}`,
        borderRadius: 6,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        zIndex: 1000,
        overflow: 'hidden',
        fontFamily: T.font,
      }}
    >
      {['Unlink', 'Remove from epic'].map((label) => (
        <button
          key={label}
          onClick={() => onDelete(issueKey)}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 12px',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
            fontSize: 13,
            color: label === 'Unlink' ? '#DC2626' : T.textPrimary,
            fontFamily: T.font,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.hoverBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

/* ── Main ── */
export function IssueRow({
  issue,
  variant,
  onNavigate,
  onStatusChange,
  onDelete,
  onDragStart,
  showDragHandle = false,
}: IssueRowProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuBtnRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const isSubtask = variant === 'subtask';
  const gripVisible = isSubtask && (hovered || showDragHandle);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 40,
        padding: '0 12px',
        borderBottom: `1px solid ${T.borderSubtle}`,
        background: hovered ? T.hoverBg : 'transparent',
        transition: 'background 120ms ease',
        fontFamily: T.font,
        gap: isSubtask ? 10 : 8,
      }}
    >
      {/* Drag handle (subtask) */}
      {isSubtask && (
        <span
          onMouseDown={onDragStart}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            cursor: gripVisible ? 'grab' : 'default',
            opacity: gripVisible ? 0.6 : 0,
            transition: 'opacity 150ms ease',
            flexShrink: 0,
            color: T.textMuted,
          }}
          aria-label="Drag to reorder"
          role="button"
          tabIndex={0}
        >
          <GripVertical size={14} />
        </span>
      )}

      {/* Type icon */}
      <TypeIcon type={issue.type} />

      {/* Key link */}
      <button
        onClick={() => onNavigate?.(issue.key)}
        style={{
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: T.font,
          color: T.textLink,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        aria-label={`Open issue ${issue.key}`}
      >
        {issue.key}
      </button>

      {/* Summary */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          color: T.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {issue.summary}
      </span>

      {/* Priority (subtask only) */}
      {isSubtask && issue.priority && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            fontSize: 13,
            color: T.textSecondary,
            width: 80,
          }}
        >
          <PriorityIcon level={issue.priority.level} />
          {issue.priority.name}
        </span>
      )}

      {/* Assignee with name (subtask only) */}
      {isSubtask && issue.assignee && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
            width: 120,
            overflow: 'hidden',
          }}
          title={issue.assignee.name}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: issue.assignee.avatarUrl ? `url(${issue.assignee.avatarUrl}) center/cover` : issue.assignee.initialsColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: T.white,
              flexShrink: 0,
            }}
          >
            {!issue.assignee.avatarUrl && issue.assignee.initials}
          </span>
          <span
            style={{
              fontSize: 13,
              color: T.textSecondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {issue.assignee.name}
          </span>
        </span>
      )}

      {/* Status */}
      <span style={{ flexShrink: 0 }}>
        <StatusLozenge
          status={issue.status.name}
          size="sm"
          withDropdown={!!onStatusChange}
          transitions={ALL_STATUSES.filter((s) => s !== issue.status.name)}
          onChange={(s) => onStatusChange?.(issue.key, s)}
        />
      </span>

      {/* Avatar only (linked) */}
      {!isSubtask && issue.assignee && (
        <span
          title={issue.assignee.name}
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: issue.assignee.avatarUrl ? `url(${issue.assignee.avatarUrl}) center/cover` : issue.assignee.initialsColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: T.white,
            flexShrink: 0,
          }}
        >
          {!issue.assignee.avatarUrl && issue.assignee.initials}
        </span>
      )}

      {/* Action menu handle (linked) */}
      {!isSubtask && onDelete && (
        <span style={{ position: 'relative', flexShrink: 0, width: 24 }}>
          <button
            ref={menuBtnRef}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            aria-label="Open action menu"
            aria-expanded={menuOpen}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              padding: 0,
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              cursor: 'pointer',
              color: T.textMuted,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 150ms ease',
            }}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && <ActionMenu issueKey={issue.key} onDelete={(k) => { onDelete(k); setMenuOpen(false); }} anchorRef={menuBtnRef} />}
        </span>
      )}
    </div>
  );
}

/* ── Linked section header ── */
export function LinkedSectionHeader({ linkType }: { linkType: string }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: T.font,
        color: T.textSecondary,
        borderBottom: `1px solid ${T.borderSubtle}`,
      }}
    >
      {linkType}
    </div>
  );
}

/* ── Demo ── */
export function IssueRowDemo() {
  const log = (msg: string) => () => console.log(msg);

  const subtasks: IssueRowProps[] = [
    { issue: { key: 'BAU-358', summary: 'Update documentation for new feature release', type: 'task', priority: { name: 'Medium', level: 'medium' }, assignee: { name: 'Nada Alfassam', initials: 'NA', initialsColor: '#2563EB' }, status: { name: 'Done', category: 'done' } }, variant: 'subtask', onNavigate: log('nav BAU-358'), onStatusChange: (k, s) => console.log(k, s) },
    { issue: { key: 'BAU-359', summary: 'Review and approve design mockups for dashboard redesign', type: 'design', priority: { name: 'High', level: 'high' }, assignee: { name: 'Divyam Kshirsagar', initials: 'DK', initialsColor: '#7C3AED' }, status: { name: 'Done', category: 'done' } }, variant: 'subtask', onNavigate: log('nav BAU-359'), onStatusChange: (k, s) => console.log(k, s) },
    { issue: { key: 'BAU-360', summary: 'Implement backend API endpoints for user authentication', type: 'backend', priority: { name: 'Highest', level: 'highest' }, assignee: { name: 'Muhammad Adnan', initials: 'MA', initialsColor: '#16A34A' }, status: { name: 'Done', category: 'done' } }, variant: 'subtask', onNavigate: log('nav BAU-360'), onStatusChange: (k, s) => console.log(k, s) },
    { issue: { key: 'BAU-361', summary: 'Fix critical bug in payment processing module', type: 'bug', priority: { name: 'Highest', level: 'highest' }, assignee: { name: 'Imran Aslam', initials: 'IA', initialsColor: '#DC2626' }, status: { name: 'Done', category: 'done' } }, variant: 'subtask', onNavigate: log('nav BAU-361'), onStatusChange: (k, s) => console.log(k, s) },
  ];

  const linked: IssueRowProps[] = [
    { issue: { key: 'BAU-444', summary: 'Frontend component library refactoring and optimization', type: 'frontend', assignee: { name: 'Nada Alfassam', initials: 'NA', initialsColor: '#2563EB' }, status: { name: 'Done', category: 'done' } }, variant: 'linked', onNavigate: log('nav BAU-444'), onDelete: log('unlink BAU-444') },
    { issue: { key: 'BAU-603', summary: 'Database schema migration and optimization for performance', type: 'backend', assignee: { name: 'Muhammad Adnan', initials: 'MA', initialsColor: '#16A34A' }, status: { name: 'In Progress', category: 'in_progress' } }, variant: 'linked', onNavigate: log('nav BAU-603'), onDelete: log('unlink BAU-603') },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: T.font }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, margin: '0 0 8px 12px' }}>Subtasks</h3>
      <div style={{ border: `1px solid ${T.borderSubtle}`, borderRadius: 6, overflow: 'hidden' }}>
        {subtasks.map((p) => <IssueRow key={p.issue.key} {...p} />)}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, margin: '24px 0 8px 12px' }}>Linked Issues</h3>
      <div style={{ border: `1px solid ${T.borderSubtle}`, borderRadius: 6, overflow: 'hidden' }}>
        <LinkedSectionHeader linkType="is implemented by" />
        {linked.map((p) => <IssueRow key={p.issue.key} {...p} />)}
      </div>
    </div>
  );
}

export default IssueRow;
