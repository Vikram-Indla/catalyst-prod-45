import { useState, useRef, useEffect } from 'react';
import { X } from '@/lib/atlaskit-icons';

const AVATAR_COLORS = ['var(--cp-purple-60)', 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', 'var(--cp-teal-60)', 'var(--ds-text-warning, var(--cp-warning))', 'var(--ds-text-danger, var(--cp-danger))', 'var(--ds-background-warning-bold)', 'var(--ds-link)'];

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  member: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))' },
  viewer: { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning, var(--cp-warning))' },
};

interface MemberRowProps {
  id: string;
  name: string;
  email: string;
  role: string;
  isCurrentUser: boolean;
  onRoleChange: (id: string, role: string) => void;
  onRemove: (id: string) => void;
}

export function MemberRow({ id, name, email, role, isCurrentUser, onRoleChange, onRemove }: MemberRowProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const avatarColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const rs = ROLE_STYLES[role] || ROLE_STYLES.member;

  return (
    <div
      className="flex items-center gap-3 rounded-md px-3 hover:bg-[var(--ds-surface-sunken)] transition-colors"
      style={{ height: 52 }}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 32, height: 32, background: avatarColor, color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))', fontSize: 'var(--ds-font-size-200)', fontWeight: 600 }}
      >
        {initials || '?'}
      </div>

      {/* Name + Email */}
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--fg-1)' }}>
          {name}
          {isCurrentUser && (
            <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--fg-3)', fontWeight: 400, marginLeft: 4 }}>(you)</span>
          )}
        </div>
        <div className="truncate" style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--fg-3)' }}>{email}</div>
      </div>

      {/* Role pill */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => !isCurrentUser && setDropdownOpen(!dropdownOpen)}
          className="rounded-full transition-colors"
          style={{
            fontSize: 'var(--ds-font-size-100)', fontWeight: 600, padding: '4px 10px',
            background: rs.bg, color: rs.text,
            border: 'none', cursor: isCurrentUser ? 'default' : 'pointer',
          }}
        >
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-10 bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))]"
            style={{
              width: 120, border: '1px solid var(--divider)',
              borderRadius: 8, boxShadow: '0 4px 6px -1px var(--ds-shadow-raised)',
              overflow: 'hidden',
            }}
          >
            {['admin', 'member', 'viewer'].map(r => (
              <button
                key={r}
                onClick={() => { onRoleChange(id, r); setDropdownOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--ds-surface-sunken)] transition-colors"
                style={{
                  fontSize: 'var(--ds-font-size-200)', fontWeight: r === role ? 600 : 400,
                  color: r === role ? 'var(--cp-blue)' : 'var(--fg-2)',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  display: 'block',
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remove button */}
      {!isCurrentUser ? (
        <button
          onClick={() => onRemove(id)}
          className="flex items-center justify-center rounded transition-colors hover:bg-[var(--ds-background-danger)]"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <X size={14} color="var(--fg-4)" />
        </button>
      ) : (
        <div style={{ width: 28 }} />
      )}
    </div>
  );
}
