import { LucideIcon } from 'lucide-react';

export interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
  badge?: string;
  count?: number;
}

export function NavItem({ icon: Icon, label, isActive, onClick, collapsed, badge, count }: NavItemProps) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className="flex items-center w-full rounded-md transition-colors duration-150"
      style={{
        height: 34,
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '0' : '0 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: collapsed ? 34 : '100%',
        margin: collapsed ? '0 auto' : undefined,
        fontSize: 13,
        fontWeight: isActive ? 600 : 500,
        color: isActive
          ? 'var(--cp-blue)'
          : isDark ? 'rgba(255,255,255,0.72)' : 'var(--fg-2)',
        backgroundColor: isActive
          ? (isDark ? 'rgba(59,130,246,0.10)' : 'var(--cp-blue-wash)')
          : 'transparent',
        borderLeft: isActive && !collapsed ? '3px solid var(--cp-blue)' : '3px solid transparent',
        fontFamily: "'Inter', sans-serif",
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.03)' : 'var(--cp-bd-zone)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon size={18} strokeWidth={1.75} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge && (
            <span
              className="ml-auto flex-shrink-0"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: 'var(--cp-blue)',
                borderRadius: 4,
                padding: '1px 5px',
                lineHeight: '14px',
                letterSpacing: '0.03em',
              }}
            >
              {badge}
            </span>
          )}
          {count !== undefined && (
            <span
              className="ml-auto flex-shrink-0"
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isDark ? 'rgba(255,255,255,0.55)' : 'var(--fg-4)',
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'var(--cp-bd-zone)',
                padding: '1px 6px',
              }}
            >
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}