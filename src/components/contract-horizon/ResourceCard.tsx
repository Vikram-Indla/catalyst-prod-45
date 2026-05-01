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
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-3 bg-card border border-border rounded-[10px] cursor-pointer transition-all duration-200",
        "hover:border-[var(--ds-text-brand,var(--ds-text-brand, #2563eb))] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]",
        "group"
      )}
    >
      {/* Left status accent */}
      <div 
        className={cn(
          "absolute left-0 top-2 bottom-2 w-[3px] rounded-r transition-all duration-200",
          "group-hover:top-0 group-hover:bottom-0 group-hover:rounded-l-[10px] group-hover:rounded-r-none",
          resource.status === 'critical' && "bg-[var(--ds-text-danger,var(--ds-text-danger, #ef4444))]",
          resource.status === 'warning' && "bg-[var(--ds-text-warning,var(--ds-text-warning, #d97706))]",
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
        <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[80px]">
          {resource.vendor}
        </span>
      </div>
    </div>
  );
}
