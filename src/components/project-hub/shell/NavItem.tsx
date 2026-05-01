import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

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
  const { isDark } = useTheme();

  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center w-full transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
        isActive
          ? isDark ? 'bg-[#0D1526]' : 'bg-[#E9F2FF]'
          : isDark ? 'hover:bg-[#1F1F1F]' : 'hover:bg-[#F4F5F7]'
      }`}
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
          : 'var(--cp-text-secondary, #42526E)',
        borderRadius: collapsed ? 6 : '0 6px 6px 0',
        borderLeft: isActive && !collapsed ? '3px solid #0052CC' : '3px solid transparent',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        fontFamily: 'var(--cp-font-body)',
        cursor: 'pointer',
        position: 'relative',
        letterSpacing: '-0.01em',
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.75} style={{ flexShrink: 0, color: isActive ? '#0052CC' : 'var(--cp-text-tertiary, #6B778C)' }} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge && (
            <span
              className="ml-auto flex-shrink-0"
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--ds-text-inverse, #FFFFFF)',
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
                color: 'var(--cp-text-tertiary, #6B778C)',
                fontFamily: 'var(--cp-font-mono)',
                borderRadius: 9999,
                backgroundColor: 'var(--cp-border, #EBECF0)',
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
