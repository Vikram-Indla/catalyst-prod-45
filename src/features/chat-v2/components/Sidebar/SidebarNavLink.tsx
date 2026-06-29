import React from 'react';

interface SidebarNavLinkProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badgeCount?: number;
  onClick: () => void;
}

export function SidebarNavLink({
  icon,
  label,
  active,
  badgeCount = 0,
  onClick,
}: SidebarNavLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '4px 12px 6px 12px',
        background: active ? 'var(--cv2-bg-row-active, var(--cv2-bg-row-hover))' : 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        font: 'var(--ds-font-body)',
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--cv2-text)' : 'var(--cv2-text-subtle)',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'currentColor',
          flex: '0 0 auto',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {badgeCount > 0 && (
        <span
          aria-label={`${badgeCount} scheduled`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--cv2-text-subtle)',
            font: 'var(--ds-font-body-small)',
            fontWeight: 500,
            flex: '0 0 auto',
          }}
        >
          <ClockGlyph />
          {badgeCount}
        </span>
      )}
    </button>
  );
}

function ClockGlyph() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
