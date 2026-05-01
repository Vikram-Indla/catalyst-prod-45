import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const AVATAR_COLORS = ['#7C3AED', 'var(--ds-text-brand, #2563EB)', '#0D9488', 'var(--ds-text-warning, #D97706)', 'var(--ds-text-danger, #DC2626)', '#EA580C', '#0284C7'];

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'var(--ds-background-selected, #EFF6FF)', text: 'var(--ds-text-brand, #2563EB)' },
  member: { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)' },
  viewer: { bg: '#FFFBEB', text: 'var(--ds-text-warning, #D97706)' },
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
      className="flex items-center gap-3 rounded-md px-3 hover:bg-[var(--ds-surface-sunken, #F8FAFC)] transition-colors"
      style={{ height: 52 }}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 32, height: 32, background: avatarColor, color: 'var(--ds-text-inverse, #FFFFFF)', fontSize: 12, fontWeight: 600 }}
      >
        {initials || '?'}
      </div>

      {/* Name + Email */}
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>
          {name}
          {isCurrentUser && (
            <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 400, marginLeft: 6 }}>(you)</span>
          )}
        </div>
        <div className="truncate" style={{ fontSize: 13, color: 'var(--fg-3)' }}>{email}</div>
      </div>

      {/* Role pill */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => !isCurrentUser && setDropdownOpen(!dropdownOpen)}
          className="rounded-full transition-colors"
          style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px',
            background: rs.bg, color: rs.text,
            border: 'none', cursor: isCurrentUser ? 'default' : 'pointer',
          }}
        >
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-10 bg-[var(--cp-float)] dark:bg-[var(--ds-surface-raised, #1A1A1A)]"
            style={{
              width: 120, border: '1px solid var(--divider)',
              borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,.07)',
              overflow: 'hidden',
            }}
          >
            {['admin', 'member', 'viewer'].map(r => (
              <button
                key={r}
                onClick={() => { onRoleChange(id, r); setDropdownOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--ds-surface-sunken, #F8FAFC)] transition-colors"
                style={{
                  fontSize: 12, fontWeight: r === role ? 600 : 400,
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
          className="flex items-center justify-center rounded transition-colors hover:bg-[#FEE2E2]"
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
