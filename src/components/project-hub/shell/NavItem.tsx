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
      className="flex items-center w-full transition-colors duration-100"
      style={{
        height: 36,
        gap: collapsed ? 0 : 10,
        padding: collapsed ? '0' : '0 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: collapsed ? 36 : '100%',
        margin: collapsed ? '2px auto' : '1px 0',
        fontSize: 13.5,
        fontWeight: isActive ? 600 : 450,
        color: isActive
          ? '#0052CC'
          : isDark ? '#A1A1A1' : '#42526E',
        backgroundColor: isActive
          ? (isDark ? 'rgba(0,82,204,0.08)' : '#E9F2FF')
          : 'transparent',
        borderRadius: collapsed ? 6 : '0 6px 6px 0',
        borderLeft: isActive && !collapsed ? '3px solid #0052CC' : '3px solid transparent',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
        position: 'relative',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = isDark ? '#1F1F1F' : '#F4F5F7';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.75} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }} />
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
                backgroundColor: '#7C3AED',
                borderRadius: 4,
                padding: '2px 6px',
                lineHeight: '14px',
                letterSpacing: '0.04em',
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
                color: isDark ? '#878787' : '#6B778C',
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 12,
                backgroundColor: isDark ? '#292929' : '#EBECF0',
                padding: '1px 7px',
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