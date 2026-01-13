// ============================================================
// USER AVATAR WITH TOOLTIP
// Shows initials with rich hover tooltip showing full name, role, status
// ============================================================

import { cn } from '@/lib/utils';
import type { PlannerUser } from '../types';

interface UserAvatarProps {
  user: PlannerUser;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-8 h-8 text-[10px]',
  lg: 'w-10 h-10 text-xs',
};

const statusSizeClasses = {
  sm: 'w-2 h-2 -bottom-0 -right-0 border',
  md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5 border-[1.5px]',
  lg: 'w-3 h-3 -bottom-0.5 -right-0.5 border-2',
};

export function UserAvatar({ 
  user, 
  size = 'md', 
  showStatus = true,
  className 
}: UserAvatarProps) {
  return (
    <div className="relative group">
      {/* Avatar */}
      <div 
        className={cn(
          "rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium",
          sizeClasses[size],
          className
        )}
      >
        {user.initials}
      </div>
      
      {/* Online Status Indicator */}
      {showStatus && (
        <div 
          className={cn(
            "absolute rounded-full border-background",
            user.online ? "bg-green-500" : "bg-muted-foreground",
            statusSizeClasses[size]
          )}
        />
      )}
      
      {/* Rich Tooltip on Hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-popover text-popover-foreground text-sm px-3 py-2 rounded-lg shadow-lg border whitespace-nowrap">
          <div className="font-semibold">{user.name}</div>
          <div className="text-muted-foreground text-xs">{user.role}</div>
          <div className="flex items-center gap-1 text-xs mt-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              user.online ? "bg-green-500" : "bg-muted-foreground"
            )} />
            <span className="text-muted-foreground">
              {user.online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
      </div>
    </div>
  );
}
