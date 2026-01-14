// ============================================================
// SECTION HEADER COMPONENT
// Consistent section header with icon, title, badge, action
// ============================================================

import { LucideIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  badge?: number;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ 
  icon: Icon, 
  title, 
  badge, 
  action, 
  children,
  className 
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
        {children}
      </div>
      {action}
    </div>
  );
}
