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
          ? '#2563EB'
          : isDark ? 'rgba(248,244,240,0.72)' : '#334155',
        background: isActive
          ? (isDark ? 'rgba(59,130,246,0.10)' : '#EFF6FF')
          : 'transparent',
        borderLeft: isActive && !collapsed ? '3px solid #2563EB' : '3px solid transparent',
        fontFamily: "'Inter', sans-serif",
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = isDark ? 'rgba(248,244,240,0.03)' : '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
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
                background: '#2563EB',
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
                color: isDark ? 'rgba(248,244,240,0.55)' : '#94A3B8',
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 10,
                background: isDark ? 'rgba(248,244,240,0.06)' : '#F1F5F9',
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