import React, { forwardRef, useRef, useEffect, useCallback } from 'react';
import { ObjectiveGroup, GroupBy, Theme, Owner } from '@/types/objective-roadmap';
import { formatShortDate } from '@/utils/objective-roadmap-utils';
import { ChevronDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ads';

interface ObjectivesColumnProps {
  groups: ObjectiveGroup[];
  groupBy: GroupBy;
  themes: Theme[];
  owners: Owner[];
  collapsedGroups: Set<string>;
  onToggleGroup: (groupKey: string) => void;
  onObjectiveClick: (objectiveId: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
}

export const ObjectivesColumn = forwardRef<HTMLDivElement, ObjectivesColumnProps>(
  ({ groups, groupBy, themes, owners, collapsedGroups, onToggleGroup, onObjectiveClick, width, onWidthChange }, ref) => {
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
    
    const getTheme = (themeId: string) => {
      return themes.find(t => t.id === themeId) || { name: 'Unassigned', color: '#9CA3AF' };
    };
    
    const getOwner = (ownerId: string) => {
      return owners.find(o => o.id === ownerId) || { name: 'Unassigned', initials: '?' };
    };
    
    // Status config per legend:
    // On track: Filled, Teal (brand-teal #0d9488)
    // At risk: Filled, Amber (#f59e0b)
    // Off track: Filled, Red (destructive)
    // In Progress: Outline, Blue (brand-primary #2563eb)
    // Pending: Outline, Grey (muted)
    const getStatusConfig = (status: string) => {
      switch (status) {
        case 'on-track': return { color: '#0d9488', variant: 'filled' as const };
        case 'at-risk': return { color: '#f59e0b', variant: 'filled' as const };
        case 'off-track': return { color: '#DE350B', variant: 'filled' as const }; // Atlaskit danger.bolder
        case 'in-progress': return { color: '#2563eb', variant: 'outline' as const };
        case 'pending': return { color: '#6b7280', variant: 'outline' as const };
        default: return { color: '#6b7280', variant: 'outline' as const };
      }
    };
    
    // Fixed row heights for perfect sync
    const GROUP_ROW_HEIGHT = 40; // h-10
    const OBJECTIVE_ROW_HEIGHT = 48; // h-12
    
    return (
      <div 
        className="relative flex flex-col bg-background border-r border-border"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
      >
        <div className="h-10 px-3 flex items-center border-b border-border bg-muted/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Objectives</span>
        </div>
        
        <div className="flex-1 overflow-y-auto" ref={ref}>
          {groups.map(group => {
            const isCollapsed = collapsedGroups.has(group.key);
            const statusCounts = group.items.reduce((acc, obj) => {
              acc[obj.status] = (acc[obj.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            
            return (
              <div key={group.key}>
                {groupBy !== 'none' && (
                  <div 
                    className={cn(
                      "flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50 border-b border-border bg-muted/30",
                      isCollapsed && "border-b-0"
                    )}
                    style={{ height: `${GROUP_ROW_HEIGHT}px` }}
                    onClick={() => onToggleGroup(group.key)}
                  >
                    <ChevronDown 
                      size={14} 
                      className={cn(
                        "text-muted-foreground transition-transform flex-shrink-0",
                        isCollapsed && "-rotate-90"
                      )} 
                    />
                    <div 
                      className="w-1 h-6 rounded-full flex-shrink-0" 
                      style={{ background: group.color }} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">{group.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {group.items.length} objective{group.items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {statusCounts['on-track'] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
                      )}
                      {statusCounts['at-risk'] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      {(statusCounts['off-track'] || statusCounts['delayed']) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      )}
                      {statusCounts['in-progress'] && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                      )}
                    </div>
                  </div>
                )}
                
                {!isCollapsed && group.items.map(obj => {
                  const theme = getTheme(obj.themeId);
                  const owner = getOwner(obj.ownerId);
                  const statusConfig = getStatusConfig(obj.status);
                  
                  return (
                    <div 
                      key={obj.id}
                      className="flex items-center gap-2 px-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                      style={{ height: `${OBJECTIVE_ROW_HEIGHT}px` }}
                      onClick={() => onObjectiveClick(obj.id)}
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
                        <Target size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Tooltip content={<p className="text-sm">{obj.name}</p>} position="top">
                          <div className="font-medium text-xs truncate leading-tight cursor-default">
                            {obj.name}
                          </div>
                        </Tooltip>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="truncate">
                            {formatShortDate(obj.startDate)} → {formatShortDate(obj.endDate)}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="w-4 h-4 flex items-center justify-center text-[8px] font-semibold bg-muted rounded-full">
                              {owner.initials}
                            </span>
                            <span className="truncate max-w-[60px]">{owner.name}</span>
                          </div>
                        </div>
                      </div>
                      {/* Status pill - compact */}
                      <div 
                        className="flex items-center px-1.5 py-px text-[7px] font-semibold rounded uppercase whitespace-nowrap flex-shrink-0"
                        style={statusConfig.variant === 'filled' 
                          ? { background: statusConfig.color, color: 'white' }
                          : { background: 'transparent', color: statusConfig.color, border: `1px solid ${statusConfig.color}` }
                        }
                      >
                        {obj.status.replace('-', ' ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
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

ObjectivesColumn.displayName = 'ObjectivesColumn';
