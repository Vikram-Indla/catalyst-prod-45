import React, { forwardRef, useRef, useEffect, useCallback, useState } from 'react';
import { Demand, DemandOwner, DEMAND_STATUS_CONFIG } from '@/types/product-roadmap';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemandGroupBy } from './ProductRoadmapToolbar';
import { format } from 'date-fns';

interface DemandGroup {
  key: string;
  label: string;
  demands: Demand[];
}

interface DemandColumnProps {
  demands: Demand[];
  groups: DemandGroup[];
  groupBy: DemandGroupBy;
  owners: DemandOwner[];
  onDemandClick: (demandId: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
}

const GROUP_HEADER_HEIGHT = 44;
const DEMAND_ROW_HEIGHT = 56;

// Get owner initials
const getOwnerInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

// Format date range like Program: "Jan 15 → Sep 30"
const formatDateRange = (start: Date, end: Date) => {
  const startStr = format(start, 'MMM d');
  const endStr = format(end, 'MMM d');
  return `${startStr} → ${endStr}`;
};

// Get status display config - show actual status with appropriate colors
const getStatusConfig = (status: string) => {
  const statusLower = status?.toLowerCase() || '';
  
  // Map statuses to display labels and colors
  if (statusLower === 'new') {
    return { label: 'NEW', bgClass: 'bg-muted-foreground', textClass: 'text-white' };
  }
  if (statusLower === 'analyse') {
    return { label: 'ANALYSE', bgClass: 'bg-secondary-bronze', textClass: 'text-white' };
  }
  if (statusLower === 'approved') {
    return { label: 'APPROVED', bgClass: 'bg-brand-primary', textClass: 'text-white' };
  }
  if (statusLower === 'implement') {
    return { label: 'IN PROGRESS', bgClass: 'bg-brand-primary', textClass: 'text-white' };
  }
  if (statusLower === 'closed') {
    return { label: 'CLOSED', bgClass: 'bg-muted-foreground', textClass: 'text-white' };
  }
  if (statusLower === 'on-hold' || statusLower === 'on_hold') {
    return { label: 'ON HOLD', bgClass: 'bg-destructive', textClass: 'text-white' };
  }
  // Default
  return { label: status?.toUpperCase() || 'NEW', bgClass: 'bg-muted-foreground', textClass: 'text-white' };
};

export const DemandColumn = forwardRef<HTMLDivElement, DemandColumnProps>(
  ({ demands, groups, groupBy, owners, onDemandClick, width, onWidthChange }, ref) => {
    const resizeRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    
    const toggleGroup = (key: string) => {
      setCollapsedGroups(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    };
    
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }, [width]);
    
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const diff = e.clientX - startX.current;
        const newWidth = Math.max(340, Math.min(500, startWidth.current + diff));
        onWidthChange(newWidth);
      };
      
      const handleMouseUp = () => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [onWidthChange]);

    // Render a single demand row - matching Program structure
    const renderDemandRow = (demand: Demand, _index: number) => {
      const statusConfig = getStatusConfig(demand.status);
      
      return (
        <div 
          key={demand.id}
          className="flex items-center gap-2.5 px-3 pl-4 border-b border-border cursor-pointer hover:bg-muted bg-background"
          style={{ height: `${DEMAND_ROW_HEIGHT}px` }}
          onClick={() => onDemandClick(demand.id)}
        >
          {/* Progress Ring - matching Program */}
          <div className="w-7 h-7 rounded-full border-2 border-brand-primary flex items-center justify-center flex-shrink-0">
            <div 
              className="w-2.5 h-2.5 rounded-full bg-brand-primary"
              style={{ 
                opacity: demand.progress > 50 ? 1 : 0.4 
              }} 
            />
          </div>
          
          {/* Content: Title + Date Range */}
          <div className="flex-1 min-w-0">
            <div 
              className="text-[13px] font-medium text-foreground truncate" 
              title={demand.title}
            >
              {demand.title}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {formatDateRange(demand.startDate, demand.endDate)}
            </div>
          </div>
          
          {/* Status Lozenge - show actual status */}
          <div className={cn(
            "px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wide flex-shrink-0",
            statusConfig.bgClass,
            statusConfig.textClass
          )}>
            {statusConfig.label}
          </div>
        </div>
      );
    };

    // Render group header - matching Program
    const renderGroupHeader = (key: string, label: string, count: number) => {
      const isCollapsed = collapsedGroups.has(key);
      
      return (
        <div 
          key={`header-${key}`}
          className="flex items-center gap-2 px-3 pl-4 bg-muted/50 border-b border-border cursor-pointer hover:bg-muted"
          style={{ height: `${GROUP_HEADER_HEIGHT}px` }}
          onClick={() => toggleGroup(key)}
        >
          {/* Expand/Collapse Arrow */}
          <div className={cn(
            "w-5 h-5 flex items-center justify-center text-muted-foreground text-xs transition-transform",
            isCollapsed && "-rotate-90"
          )}>
            <ChevronDown size={14} />
          </div>
          
          {/* Color Bar */}
          <div className="w-[3px] h-6 rounded bg-brand-primary" />
          
          {/* Label + Count */}
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-foreground">{label}</div>
            <div className="text-[11px] text-muted-foreground">
              {count} demand{count !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Summary Dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
        </div>
      );
    };
    
    return (
      <div 
        className="relative flex flex-col bg-background border-r border-border"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
      >
        {/* Header - matching Program */}
        <div className="h-10 px-4 flex items-center border-b border-border bg-background">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            DEMANDS
          </span>
        </div>
        
        {/* Demand List */}
        <div className="flex-1 overflow-y-auto" ref={ref}>
          {groupBy === 'none' ? (
            // Flat list (no grouping)
            demands.map((demand, index) => renderDemandRow(demand, index))
          ) : (
            // Grouped list with collapsible groups
            groups.map(group => {
              const isCollapsed = collapsedGroups.has(group.key);
              return (
                <React.Fragment key={group.key}>
                  {renderGroupHeader(group.key, group.label, group.demands.length)}
                  {!isCollapsed && group.demands.map((demand, index) => renderDemandRow(demand, index))}
                </React.Fragment>
              );
            })
          )}
          
          {demands.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl opacity-40 mb-3">📋</div>
              <div className="text-sm text-muted-foreground">No demands match your filters</div>
            </div>
          )}
        </div>
        
        {/* Resize Handle */}
        <div 
          ref={resizeRef}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary/30 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>
    );
  }
);

DemandColumn.displayName = 'DemandColumn';