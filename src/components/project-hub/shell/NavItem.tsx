import { LucideIcon } from '@/lib/atlaskit-icons';
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
      className={`flex items-center w-full transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))] focus-visible:ring-offset-2 ${
        isActive
          ? isDark ? 'bg-[var(--ds-text)]' : 'bg-[var(--ds-background-selected)]'
          : isDark ? 'hover:bg-[var(--ds-surface-overlay)]' : 'hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken))]'
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
          ? 'var(--cp-primary-60)'
          : isDark ? 'var(--ds-text-subtle)' : 'var(--cp-text-secondary)',
        borderRadius: collapsed ? 6 : '0 6px 6px 0',
        borderLeft: isActive && !collapsed ? '3px solid var(--cp-primary-60)' : '3px solid transparent',
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
        fontFamily: 'var(--cp-font-body)',
        cursor: 'pointer',
        position: 'relative',
        letterSpacing: '-0.01em',
      }}
    >
      <Icon size={18} strokeWidth={isActive ? 2 : 1.75} style={{ flexShrink: 0, color: isActive ? 'var(--cp-primary-60)' : 'var(--cp-text-tertiary, var(--cp-text-secondary))' }} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge && (
            <span
              className="ml-auto flex-shrink-0"
              style={{
                fontSize: 'var(--ds-font-size-100)',
                fontWeight: 700,
                color: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
                backgroundColor: 'var(--cp-purple-60)',
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
                fontSize: 'var(--ds-font-size-100)',
                fontWeight: 600,
                color: 'var(--cp-text-tertiary, var(--cp-text-secondary))',
                fontFamily: 'var(--cp-font-mono)',
                borderRadius: 9999,
                backgroundColor: 'var(--cp-border)',
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
