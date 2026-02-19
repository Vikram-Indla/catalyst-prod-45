import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

export function NavItem({ icon: Icon, label, isActive, onClick, collapsed }: NavItemProps) {
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
        color: isActive ? '#2563EB' : '#334155',
        background: isActive ? '#EFF6FF' : 'transparent',
        borderLeft: isActive && !collapsed ? '3px solid #2563EB' : '3px solid transparent',
        fontFamily: "'Inter', sans-serif",
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={18} strokeWidth={1.75} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
