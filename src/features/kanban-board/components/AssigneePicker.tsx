/**
 * AssigneePicker — popover anchored to a card avatar. Search + Unassigned +
 * Assign to me + member list. Writes assignee_display_name. Popper-free.
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import { UnassignedAvatar } from '@/components/ads';
import { SIZES, STRINGS } from '../constants';
import type { BoardIssue } from '../types';

interface Props {
  issue: BoardIssue;
  anchor: HTMLElement;
  members: string[];
  avatars: Map<string, string | null>;
  currentUserName: string | null;
  onAssign: (issue: BoardIssue, name: string | null) => void;
  onClose: () => void;
}

export const AssigneePicker: React.FC<Props> = ({ issue, anchor, members, avatars, currentUserName, onAssign, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [anchor, onClose]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => !q || m.toLowerCase().includes(q)).slice(0, 30);
  }, [members, query]);

  const rect = anchor.getBoundingClientRect();
  const row = (name: string | null, label: string, avatarName: string | null) => {
    const active = (issue.assigneeName ?? null) === name;
    return (
      <button key={label} role="menuitem" onClick={() => { onAssign(issue, name); onClose(); }}
        style={{ width: '100%', height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, border: 'none',
          background: active ? token('color.background.selected', '#E9F2FF') : 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          color: active ? token('color.text.selected', '#0C66E4') : token('color.text', '#172B4D'), fontSize: 14 }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#091E420F'); }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
        {avatarName
          ? <CatalystAvatar size="small" src={resolveAvatarUrl(avatarName) ?? avatars.get(avatarName) ?? undefined} name={avatarName} />
          : <UnassignedAvatar size={22} />
        }
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      </button>
    );
  };

  return createPortal(
    <div ref={ref} role="menu" aria-label="Assign work item"
      style={{ position: 'fixed', top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right),
        width: 260, maxHeight: 360, overflowY: 'auto', background: token('elevation.surface.overlay', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#091E4224')}`, borderRadius: 4,
        boxShadow: token('elevation.shadow.overlay', '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)'),
        padding: '4px 0', zIndex: SIZES.Z_DROPDOWN }}>
      <input autoFocus placeholder="Search people…" value={query} onChange={(e) => setQuery(e.target.value)}
        style={{ width: 'calc(100% - 16px)', margin: '4px 8px', height: 32, padding: '0 8px', border: '2px solid var(--ds-border-input, #DFE1E6)', borderRadius: 3, outline: 'none', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
      {currentUserName && issue.assigneeName !== currentUserName && row(currentUserName, STRINGS.ASSIGN_TO_ME, currentUserName)}
      {row(null, STRINGS.UNASSIGNED, null)}
      {list.map((m) => row(m, m, m))}
    </div>,
    document.body,
  );
};
