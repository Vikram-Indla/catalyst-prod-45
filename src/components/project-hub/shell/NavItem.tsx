import { cn } from '@/lib/utils';
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
      className={cn(
        'flex items-center w-full rounded-md transition-colors duration-150',
        'text-[13px] font-medium',
        collapsed ? 'justify-center px-0 h-[34px] w-[34px] mx-auto' : 'gap-[10px] px-[10px] h-[34px]',
        isActive
          ? 'font-semibold'
          : 'hover:bg-[#F1F5F9]'
      )}
      style={{
        color: isActive ? '#2563EB' : '#334155',
        background: isActive ? '#EFF6FF' : undefined,
        borderLeft: isActive && !collapsed ? '3px solid #2563EB' : '3px solid transparent',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Icon size={20} strokeWidth={1.75} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
