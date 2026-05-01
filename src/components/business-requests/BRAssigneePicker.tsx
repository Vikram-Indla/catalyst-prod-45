/**
 * BRAssigneePicker — Canonical Story-style assignee picker for Business Requests.
 * Mirrors EditableAssignee (story-detail-modules/EditableFields.tsx):
 *   - Avatar + name trigger (no chip border, no pencil icon)
 *   - Searchable dropdown, 280px, Atlassian shadow, 28px avatars, 14px name
 *   - Unassigned option with dashed circle
 * Difference: org-wide users via useActiveUsers (BR has no project scope).
 */
import React, { useEffect, useRef, useState } from 'react';
import { CircleUser } from 'lucide-react';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { getAvatarColor } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

const ATLASSIAN_DROPDOWN: React.CSSProperties = {
  background: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', borderRadius: 4, border: 'none',
  boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
  padding: '4px 0', zIndex: 9999,
};

const CheckmarkSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function AvatarCircle({ userId, name, avatarUrl, size = 28 }: { userId: string; name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(userId), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <CircleUser size={size * 0.7} color="var(--ds-surface, var(--ds-surface, #FFFFFF))" strokeWidth={1.5} />
    </div>
  );
}

interface Props {
  /** Stored value: user id OR full_name (legacy) */
  value: string | null;
  /** saveAs='id' (preferred) or 'name' (legacy) */
  saveAs?: 'id' | 'name';
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function BRAssigneePicker({ value, saveAs = 'name', onChange, placeholder = 'Unassigned' }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { data: users = [] } = useActiveUsers();

  const current = users.find(u => u.id === value || u.full_name === value);
  const currentName = current?.full_name ?? (value && !current ? value : null);
  const currentAvatar = current?.avatar_url ?? null;
  const currentId = current?.id ?? value ?? '';

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const filtered = users.filter(u => (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()));

  const choose = (u: { id: string; full_name: string | null } | null) => {
    if (!u) return onChange(null);
    onChange(saveAs === 'id' ? u.id : (u.full_name ?? u.id));
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px',
          borderRadius: 4, cursor: 'pointer', transition: 'background .12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {currentName ? (
          <>
            <AvatarCircle userId={currentId} name={currentName} avatarUrl={currentAvatar} />
            <span style={{ fontSize: 14, color: 'var(--ds-text, var(--ds-text, #172B4D))', fontWeight: 400 }}>{currentName}</span>
          </>
        ) : (
          <span style={{ fontSize: 14, color: '#97A0AF' }}>{placeholder}</span>
        )}
      </div>
      {open && (() => {
        const rect = ref.current?.getBoundingClientRect();
        const dropTop = (rect?.bottom ?? 0) + 4;
        const dropWidth = 280;
        const dropLeft = Math.min(rect?.left ?? 0, window.innerWidth - dropWidth - 16);
        return (
          <div style={{ ...ATLASSIAN_DROPDOWN, position: 'fixed', top: dropTop, left: dropLeft, width: dropWidth, overflow: 'hidden' }}>
            <div style={{ padding: '8px 8px 4px' }}>
              <input
                autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
                style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => (e.target.style.border = '2px solid #2563EB')}
                onBlur={e => (e.target.style.border = '1px solid rgba(9,30,66,0.14)')}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              <div onClick={() => choose(null)} style={{
                height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', borderBottom: '1px solid #F4F5F7',
                background: !value ? '#DEEBFF' : 'transparent',
              }}
                onMouseEnter={e => { if (value) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))'; }}
                onMouseLeave={e => { if (value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: '1px dashed #C1C7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#C1C7D0' }}>?</div>
                <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))', flex: 1 }}>Unassigned</span>
                {!value && <CheckmarkSVG />}
              </div>
              {filtered.map(u => {
                const isActive = u.id === value || u.full_name === value;
                return (
                  <div key={u.id} onClick={() => choose(u)}
                    style={{
                      height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <AvatarCircle userId={u.id} name={u.full_name ?? '?'} avatarUrl={u.avatar_url} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--ds-text, var(--ds-text, #172B4D))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name ?? u.email}</div>
                    </div>
                    {isActive && <CheckmarkSVG />}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: '12px', fontSize: 13, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #6B778C))', textAlign: 'center' }}>No users found</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
