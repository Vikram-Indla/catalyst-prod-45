/**
 * Department Row
 * Expandable department with resources organized by month
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResourceCard } from './ResourceCard';
import type { DepartmentStats, ContractResourceWithStatus } from '@/types/contract-horizon';
import { DEPARTMENT_COLORS } from '@/types/contract-horizon';

interface DepartmentRowProps {
  stats: DepartmentStats;
  isExpanded: boolean;
  onToggle: () => void;
  onResourceClick: (resource: ContractResourceWithStatus) => void;
}

const DEPARTMENT_INITIALS: Record<string, string> = {
  Delivery: 'D',
  Product: 'P',
  Operations: 'O',
  'Technical Support': 'T',
  Support: 'S'
};

export function DepartmentRow({ stats, isExpanded, onToggle, onResourceClick }: DepartmentRowProps) {
  const colors = DEPARTMENT_COLORS[stats.department] || DEPARTMENT_COLORS.Delivery;
  const initial = DEPARTMENT_INITIALS[stats.department] || stats.department[0];
  
  // Get counts per month for preview cells
  const monthCounts: Record<number, number> = {};
  for (let m = 0; m < 12; m++) {
    monthCounts[m] = stats.byMonth[m]?.length || 0;
  }

  return (
    <div className={cn("border-b border-border last:border-b-0", isExpanded && "bg-muted/30")}>
      {/* Header Row */}
      <div 
        onClick={onToggle}
        className="grid grid-cols-[240px_repeat(12,1fr)] cursor-pointer relative transition-colors hover:bg-muted/50 group"
      >
        {/* Left accent on hover */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-0 opacity-0 transition-all duration-200 group-hover:w-1 group-hover:opacity-100"
          style={{ background: colors.text }}
        />
        
        {/* Department Info */}
        <div className="p-3.5 flex items-center gap-3 border-r border-border">
          {/* Icon */}
          <div 
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[16px] font-extrabold text-white flex-shrink-0"
            style={{
              background: colors.gradient,
              boxShadow: `0 4px 12px ${colors.shadow}`
            }}
          >
            {initial}
          </div>
          
          {/* Meta */}
          <div className="flex-1">
            <div className="text-[14px] font-bold text-foreground tracking-[-0.01em]">
              {stats.department}
            </div>
            <div className="text-[12px] text-muted-foreground font-medium">
              {stats.total} resources
            </div>
          </div>
          
          {/* Chevron */}
          <div className="w-6 h-6 bg-muted/60 rounded-md flex items-center justify-center">
            <ChevronDown 
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-300",
                isExpanded && "rotate-180"
              )} 
            />
          </div>
        </div>
        
        {/* Month preview cells */}
        {Array.from({ length: 12 }, (_, i) => (
          <div 
            key={i}
            className={cn(
              "p-3.5 flex items-center justify-center border-l border-border text-[13px]",
              monthCounts[i] > 0 ? "text-foreground font-bold" : "text-muted-foreground font-semibold"
            )}
          >
            {monthCounts[i] > 0 ? monthCounts[i] : ''}
          </div>
        ))}
      </div>
      
      {/* Expanded Content */}
      <div 
        className={cn(
          "grid grid-cols-[240px_repeat(12,1fr)] bg-muted/30 overflow-hidden transition-all duration-400",
          isExpanded ? "max-h-[600px]" : "max-h-0"
        )}
      >
        {/* Stats Column */}
        <div className="p-5 border-r border-border bg-card">
          <div className="space-y-0">
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-[12px] font-medium text-muted-foreground">Critical (≤60d)</span>
              <span className="text-[18px] font-extrabold tracking-[-0.02em] text-[var(--ds-text-danger,#ef4444)]">{stats.critical}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-border">
              <span className="text-[12px] font-medium text-muted-foreground">Warning (60-90d)</span>
              <span className="text-[18px] font-extrabold tracking-[-0.02em] text-[var(--ds-text-warning,#d97706)]">{stats.warning}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-[12px] font-medium text-muted-foreground">Safe (90d+)</span>
              <span className="text-[18px] font-extrabold tracking-[-0.02em] text-foreground">{stats.safe}</span>
            </div>
          </div>
        </div>
        
        {/* Resource Cards by Month */}
        {Array.from({ length: 12 }, (_, monthIndex) => (
          <div 
            key={monthIndex}
            className="border-l border-border p-2 flex flex-col gap-2 bg-card min-h-[260px]"
          >
            {stats.byMonth[monthIndex]?.map(resource => (
              <ResourceCard 
                key={resource.id}
                resource={resource}
                onClick={() => onResourceClick(resource)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
