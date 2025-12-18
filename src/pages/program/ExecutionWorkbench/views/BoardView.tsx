/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant D: Board View - Kanban columns based on Status
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus, ItemStatus, STATUS_OPTIONS } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, User, ChevronDown, ChevronRight } from 'lucide-react';

interface BoardViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'border-l-secondary-green';
    case 'At Risk': return 'border-l-brand-gold';
    case 'Blocked': return 'border-l-destructive';
    default: return 'border-l-muted';
  }
}

function getStatusHeaderColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green/20 text-secondary-green';
    case 'In Progress': return 'bg-brand-gold/20 text-brand-gold';
    case 'To Do': return 'bg-muted text-muted-foreground';
    case 'Blocked': return 'bg-destructive/20 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'epic': return 'bg-brand-primary/20 text-brand-primary';
    case 'feature': return 'bg-secondary-bronze/20 text-secondary-bronze';
    case 'story': return 'bg-brand-gold/20 text-brand-gold';
    default: return 'bg-muted text-muted-foreground';
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

  return (
    <div
      className={cn(
        "bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4",
        getHealthColor(item.health)
      )}
      onClick={() => onItemClick(item)}
    >
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] capitalize", getTypeColor(item.type))}>
              {item.type}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
          </div>
          {hasChildren && showChildren && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium line-clamp-2">{item.title}</p>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-primary transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{item.progress}%</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {item.owner && (
              <>
                <div className="h-5 w-5 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[9px] font-semibold">
                  {item.ownerInitials || item.owner.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </>
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
        <div className="border-t border-border px-3 py-2 space-y-1.5 bg-muted/30">
          {item.children!.slice(0, 5).map(child => (
            <div 
              key={child.id}
              className="flex items-center gap-2 text-xs p-1.5 rounded bg-background/50"
              onClick={(e) => { e.stopPropagation(); onItemClick(child); }}
            >
              <Badge variant="outline" className={cn("text-[9px] capitalize", getTypeColor(child.type))}>
                {child.type.charAt(0).toUpperCase()}
              </Badge>
              <span className="truncate flex-1">{child.title}</span>
            </div>
          ))}
          {item.children!.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center">
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
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No items match your filters
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* View level toggle */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">Show:</span>
        <button
          onClick={() => setViewLevel('epic')}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            viewLevel === 'epic' ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Epics
        </button>
        <button
          onClick={() => setViewLevel('feature')}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            viewLevel === 'feature' ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Features
        </button>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-h-full">
          {columns.map(column => (
            <div key={column.status} className="w-[300px] flex-shrink-0 flex flex-col">
              {/* Column header */}
              <div className={cn(
                "px-3 py-2 rounded-t-lg flex items-center justify-between",
                getStatusHeaderColor(column.status)
              )}>
                <span className="text-sm font-semibold">{column.status}</span>
                <Badge variant="outline" className="text-xs bg-background/50">
                  {column.items.length}
                </Badge>
              </div>

              {/* Column body */}
              <div className="flex-1 bg-muted/20 rounded-b-lg p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
                {column.items.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
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
