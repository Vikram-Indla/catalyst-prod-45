/**
 * Resource Card
 * Individual resource with contract status
 */

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ContractResourceWithStatus } from '@/types/contract-horizon';

interface ResourceCardProps {
  resource: ContractResourceWithStatus;
  onClick: () => void;
}

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
  const endDate = new Date(resource.contractEnd);
  const monthsRemaining = Math.ceil(resource.daysRemaining / 30);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-3 bg-card border border-border rounded-[10px] cursor-pointer transition-all duration-200",
        "hover:border-[#2563eb] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
        "group"
      )}
    >
      {/* Left status accent */}
      <div 
        className={cn(
          "absolute left-0 top-2 bottom-2 w-[3px] rounded-r transition-all duration-200",
          "group-hover:top-0 group-hover:bottom-0 group-hover:rounded-l-[10px] group-hover:rounded-r-none",
          resource.status === 'critical' && "bg-[#ef4444]",
          resource.status === 'warning' && "bg-[#d97706]",
          resource.status === 'safe' && "bg-[#0d9488]"
        )}
      />
      
      {/* Name */}
      <div className="text-[13px] font-bold text-foreground mb-0.5 truncate">
        {resource.name}
      </div>
      
      {/* Role */}
      <div className="text-[11px] text-muted-foreground font-medium mb-2.5 truncate">
        {resource.role}
      </div>
      
      {/* Footer */}
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-foreground/80">
          {format(endDate, 'd MMM')}
        </span>
        <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground" />
        <span 
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded border",
            resource.status === 'critical' && "bg-red-50 text-[#dc2626] border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
            resource.status === 'warning' && "bg-amber-50 text-[#d97706] border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
            resource.status === 'safe' && "bg-teal-50 text-[#0d9488] border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30"
          )}
        >
          {monthsRemaining} mo
        </span>
      </div>
    </div>
  );
}
