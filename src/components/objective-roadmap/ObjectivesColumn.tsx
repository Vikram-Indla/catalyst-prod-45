import React, { forwardRef, useRef, useEffect, useCallback } from 'react';
import { ObjectiveGroup, GroupBy, Theme, Owner } from '@/types/objective-roadmap';
import { formatShortDate } from '@/utils/objective-roadmap-utils';
import { ChevronDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'on-track': return '#059669';
        case 'at-risk': return '#D97706';
        case 'delayed': return '#DC2626';
        default: return '#6B7280';
      }
    };
    
    return (
      <div 
        className="relative flex flex-col bg-background border-r border-border"
        style={{ width: `${width}px`, minWidth: `${width}px` }}
      >
        <div className="h-10 px-4 flex items-center border-b border-border bg-muted/50">
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
                      "flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-muted/50 border-b border-border bg-muted/30",
                      isCollapsed && "border-b-0"
                    )}
                    onClick={() => onToggleGroup(group.key)}
                  >
                    <ChevronDown 
                      size={16} 
                      className={cn(
                        "text-muted-foreground transition-transform",
                        isCollapsed && "-rotate-90"
                      )} 
                    />
                    <div 
                      className="w-1 h-8 rounded-full" 
                      style={{ background: group.color }} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{group.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {group.items.length} objective{group.items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {statusCounts['on-track'] && (
                        <span className="w-2 h-2 rounded-full" style={{ background: '#059669' }} />
                      )}
                      {statusCounts['at-risk'] && (
                        <span className="w-2 h-2 rounded-full" style={{ background: '#D97706' }} />
                      )}
                      {statusCounts['delayed'] && (
                        <span className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
                      )}
                    </div>
                  </div>
                )}
                
                {!isCollapsed && group.items.map(obj => {
                  const theme = getTheme(obj.themeId);
                  const owner = getOwner(obj.ownerId);
                  const statusColor = getStatusColor(obj.status);
                  
                  return (
                    <div 
                      key={obj.id}
                      className="flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => onObjectiveClick(obj.id)}
                    >
                      <div className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Target size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">{obj.id}</span>
                          {groupBy !== 'theme' && (
                            <span 
                              className="px-2 py-0.5 text-[10px] font-medium text-white rounded"
                              style={{ background: theme.color }}
                            >
                              {theme.name}
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-sm mb-1.5 truncate" title={obj.name}>
                          {obj.name}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {formatShortDate(obj.startDate)} → {formatShortDate(obj.endDate)}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="w-5 h-5 flex items-center justify-center text-[9px] font-semibold bg-muted rounded-full">
                              {owner.initials}
                            </span>
                            <span>{owner.name}</span>
                          </div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full uppercase"
                        style={{ 
                          background: `${statusColor}15`, 
                          color: statusColor,
                          border: `1px solid ${statusColor}30`
                        }}
                      >
                        <span 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ background: statusColor }} 
                        />
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
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-gold/30 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>
    );
  }
);

ObjectivesColumn.displayName = 'ObjectivesColumn';
