import React, { useEffect, useRef, useState } from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { MoonIcon, PlusIcon, SunIcon } from '../shared/Icon';
import type { ChatTheme } from '../../hooks/useChatTheme';

interface RailFooterProps {
  theme: ChatTheme;
  onToggleTheme: () => void;
  onCreate: () => void;
  userName: string;
  userAvatarUrl: string | null;
  onProfileAction?: (action: 'profile' | 'preferences' | 'signout') => void;
}

export function RailFooter({
  theme,
  onToggleTheme,
  onCreate,
  userName,
  userAvatarUrl,
  onProfileAction,
}: RailFooterProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !avatarBtnRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [menuOpen]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0 12px',
      }}
    >
      <button
        type="button"
        onClick={onCreate}
        aria-label="Create new"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.85)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background var(--cv2-transition-fast)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
        }}
      >
        <PlusIcon size={18} />
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          color: 'rgba(255,255,255,0.85)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background var(--cv2-transition-fast)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
        }}
      >
        {theme === 'dark' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
      </button>
      <div style={{ position: 'relative' }}>
        <button
          ref={avatarBtnRef}
          type="button"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={`${userName} profile menu`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          style={{
            padding: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--cv2-radius-md)',
            outline: menuOpen ? '2px solid var(--cv2-accent)' : 'none',
            outlineOffset: 2,
          }}
        >
          <PresenceAvatar src={userAvatarUrl} name={userName} size={28} presence="online" />
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-label="Profile menu"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 'calc(100% + 8px)',
              minWidth: 200,
              background: 'var(--cv2-bg-toolbar)',
              border: '1px solid var(--cv2-border-strong)',
              borderRadius: 'var(--cv2-radius-md)',
              boxShadow: 'var(--cv2-shadow-toolbar)',
              padding: '6px 0',
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: '6px 12px 10px',
                borderBottom: '1px solid var(--cv2-divider)',
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--cv2-font)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--cv2-text-strong)',
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontFamily: 'var(--cv2-font)',
                  fontSize: 11,
                  color: 'var(--cv2-text-muted)',
                  marginTop: 2,
                }}
              >
                Active
              </div>
            </div>
            {(['profile', 'preferences', 'signout'] as const).map(action => (
              <button
                key={action}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onProfileAction?.(action);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 12px',
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'var(--cv2-font)',
                  fontSize: 13,
                  color: 'var(--cv2-text)',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {action === 'profile'
                  ? 'Profile'
                  : action === 'preferences'
                  ? 'Preferences'
                  : 'Sign out'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
