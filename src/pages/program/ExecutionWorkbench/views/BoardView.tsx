/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant D: Board View - Kanban columns based on Status
 * Enhanced with Claude Variant A styling
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus, ItemStatus, STATUS_OPTIONS } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, ChevronDown, ChevronRight, Square, Gem, FileText } from 'lucide-react';

interface BoardViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

function getHealthBorderColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'border-l-secondary-green';
    case 'At Risk': return 'border-l-brand-gold';
    case 'Blocked': return 'border-l-destructive';
    default: return 'border-l-muted';
  }
}

function getStatusDotColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green';
    case 'In Progress': return 'bg-brand-gold';
    case 'To Do': return 'bg-muted-foreground';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-muted-foreground';
  }
}

function getTypeIcon(type: string): { icon: React.ElementType; colorClass: string } {
  switch (type) {
    case 'epic': return { icon: Square, colorClass: 'text-workitem-epic' };
    case 'feature': return { icon: Gem, colorClass: 'text-workitem-feature' };
    case 'story': return { icon: FileText, colorClass: 'text-workitem-story' };
    default: return { icon: FileText, colorClass: 'text-muted-foreground' };
  }
}

interface BoardCardProps {
  item: WorkItem;
  onItemClick: (item: WorkItem) => void;
  showChildren?: boolean;
}

function BoardCard({ item, onItemClick, showChildren }: BoardCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const typeIcon = getTypeIcon(item.type);
  const TypeIcon = typeIcon.icon;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border/60 hover:border-border hover:shadow-md transition-all cursor-pointer border-l-[3px]",
        getHealthBorderColor(item.health)
      )}
      onClick={() => onItemClick(item)}
    >
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <TypeIcon className={cn("h-3.5 w-3.5", typeIcon.colorClass)} />
            <span className="font-mono text-[10px] text-muted-foreground">{item.key}</span>
          </div>
          {hasChildren && showChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-tight line-clamp-2">{item.title}</p>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-gold rounded-full transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums">{item.progress}%</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
          <div>
            {item.owner && (
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-secondary-bronze to-brand-primary text-white flex items-center justify-center text-[8px] font-semibold">
                {item.ownerInitials || item.owner.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
          </div>
          {item.endDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(item.endDate), 'MMM d')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded children */}
      {expanded && hasChildren && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1 bg-muted/30">
          {item.children!.slice(0, 5).map(child => {
            const childTypeIcon = getTypeIcon(child.type);
            const ChildIcon = childTypeIcon.icon;
            return (
              <div 
                key={child.id}
                className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-background/60 hover:bg-background"
                onClick={(e) => { e.stopPropagation(); onItemClick(child); }}
              >
                <ChildIcon className={cn("h-3 w-3", childTypeIcon.colorClass)} />
                <span className="truncate flex-1">{child.title}</span>
              </div>
            );
          })}
          {item.children!.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              +{item.children!.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function BoardView({ items, onItemClick }: BoardViewProps) {
  const [viewLevel, setViewLevel] = useState<'epic' | 'feature'>('epic');

  // Group items by status
  const columns = useMemo(() => {
    const displayItems = viewLevel === 'epic' 
      ? items.filter(item => item.type === 'epic')
      : items.filter(item => item.type === 'feature' || item.type === 'epic');

    return STATUS_OPTIONS.map(status => ({
      status,
      items: displayItems.filter(item => item.status === status)
    }));
  }, [items, viewLevel]);

  const totalItems = columns.reduce((sum, col) => sum + col.items.length, 0);

  if (totalItems === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* View level toggle */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-[11px] text-muted-foreground font-medium">Show:</span>
        <div className="flex items-center p-0.5 bg-muted rounded-md">
          <button
            onClick={() => setViewLevel('epic')}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded transition-colors",
              viewLevel === 'epic' 
                ? "bg-gradient-to-r from-brand-gold to-secondary-bronze text-background shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Epics
          </button>
          <button
            onClick={() => setViewLevel('feature')}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded transition-colors",
              viewLevel === 'feature' 
                ? "bg-gradient-to-r from-brand-gold to-secondary-bronze text-background shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Features
          </button>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 min-h-full">
          {columns.map(column => (
            <div key={column.status} className="w-[280px] flex-shrink-0 flex flex-col">
              {/* Column header */}
              <div className="px-3 py-2.5 rounded-t-lg bg-muted/60 border border-b-0 border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", getStatusDotColor(column.status))} />
                  <span className="text-xs font-semibold">{column.status}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-background px-1.5 py-0.5 rounded-full">
                  {column.items.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex-1 bg-muted/20 rounded-b-lg border border-t-0 border-border p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                {column.items.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/60 text-center py-6">
                    No items
                  </div>
                ) : (
                  column.items.map(item => (
                    <BoardCard 
                      key={item.id} 
                      item={item} 
                      onItemClick={onItemClick}
                      showChildren={viewLevel === 'epic'}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
