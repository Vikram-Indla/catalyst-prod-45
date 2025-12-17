import React, { forwardRef, useRef, useEffect, useCallback } from 'react';
import { Demand, DemandOwner, DEMAND_STATUS_CONFIG } from '@/types/product-roadmap';
import { FileText, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemandGroupBy } from './ProductRoadmapToolbar';

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

const GROUP_HEADER_HEIGHT = 40;
const DEMAND_ROW_HEIGHT = 64;

export const DemandColumn = forwardRef<HTMLDivElement, DemandColumnProps>(
  ({ demands, groups, groupBy, owners, onDemandClick, width, onWidthChange }, ref) => {
    const resizeRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);
    
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
        const newWidth = Math.max(280, Math.min(500, startWidth.current + diff));
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
    
    const getStatusConfig = (status: string) => {
      const config = DEMAND_STATUS_CONFIG.find(s => s.key === status);
      return config || { color: '#6b7280', label: status };
    };

    // Render a single demand row
    const renderDemandRow = (demand: Demand, index: number) => {
      const statusConfig = getStatusConfig(demand.status);
      
      return (
        <div 
          key={demand.id}
          className="flex items-center gap-3 px-4 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
          style={{ height: `${DEMAND_ROW_HEIGHT}px` }}
          onClick={() => onDemandClick(demand.id)}
        >
          {/* Key Badge */}
          <div className="flex items-center gap-1.5 min-w-[72px]">
            <Lock size={12} className="text-muted-foreground/50" />
            <span className="text-xs font-medium text-muted-foreground">
              {demand.key}
            </span>
          </div>
          
          {/* Content: Title, Owner, Platform */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1 truncate" title={demand.title}>
              {demand.title}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">{demand.ownerName}</span>
              <span>·</span>
              <span className="truncate">{demand.platform}</span>
            </div>
          </div>
          
          {/* Rank - right aligned with Rank header */}
          <div className="flex items-center justify-end min-w-[48px]">
            <span className="text-xs font-medium text-muted-foreground">
              #{demand.rank ?? index + 1}
            </span>
          </div>
        </div>
      );
    };

    // Render group header
    const renderGroupHeader = (label: string, count: number) => (
      <div 
        className="flex items-center gap-2 px-4 bg-muted/50 border-b border-border sticky top-0 z-10"
        style={{ height: `${GROUP_HEADER_HEIGHT}px` }}
      >
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          ({count})
        </span>
      </div>
    );
    
    return (
      <div 
        className="relative flex flex-col bg-background border-r border-border"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
      >
        {/* Header */}
        <div className="h-10 px-4 flex items-center justify-between border-b border-border bg-muted/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Business Request
          </span>
          <span className="text-xs text-muted-foreground">Rank</span>
        </div>
        
        {/* Demand List */}
        <div className="flex-1 overflow-y-auto" ref={ref}>
          {groupBy === 'none' ? (
            // Flat list (no grouping)
            demands.map((demand, index) => renderDemandRow(demand, index))
          ) : (
            // Grouped list
            groups.map(group => (
              <div key={group.key}>
                {renderGroupHeader(group.label, group.demands.length)}
                {group.demands.map((demand, index) => renderDemandRow(demand, index))}
              </div>
            ))
          )}
          
          {demands.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText size={32} className="mb-2 opacity-50" />
              <span className="text-sm">No demands found</span>
            </div>
          )}
        </div>
        
        {/* Resize Handle */}
        <div 
          ref={resizeRef}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-gold/30 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>
    );
  }
);

DemandColumn.displayName = 'DemandColumn';
