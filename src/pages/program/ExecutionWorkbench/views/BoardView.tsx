/**
 * WorkBench views: Board View
 * 
 * Executive-grade Kanban board with:
 * - Columns: Not Started, In Progress, Blocked, Done (reordered per target)
 * - Rich cards with type badge, owner avatar, due date, dependency cues
 * - Health-colored progress bars
 * Uses semantic tokens from index.css for dark/light mode support
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus, ItemStatus } from '../types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar, ChevronDown, ChevronRight, Link2, AlertTriangle } from 'lucide-react';

interface BoardViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

// Column order matching target design: Not Started, In Progress, Blocked, Done
const COLUMN_ORDER: ItemStatus[] = ['To Do', 'In Progress', 'Blocked', 'Done'];
const COLUMN_LABELS: Record<ItemStatus, string> = {
  'To Do': 'Not Started',
  'In Progress': 'In Progress',
  'Blocked': 'Blocked',
  'Done': 'Done',
};

// Type badge component
function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; bgClass: string; textClass: string }> = {
    epic: { label: 'E', bgClass: 'bg-workitem-epic/20', textClass: 'text-workitem-epic' },
    feature: { label: 'F', bgClass: 'bg-workitem-feature/20', textClass: 'text-workitem-feature' },
    story: { label: 'S', bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
  };
  const { label, bgClass, textClass } = config[type] || config.story;
  
  return (
    <span className={cn(
      "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0",
      bgClass, textClass
    )}>
      {label}
    </span>
  );
}

// Owner avatar with initials
function OwnerAvatar({ name, initials }: { name?: string; initials?: string }) {
  if (!name) return null;
  
  const displayInitials = initials || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-secondary-bronze to-brand-primary flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0">
      {displayInitials}
    </div>
  );
}

function getHealthBorderColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'border-l-secondary-green';
    case 'At Risk': return 'border-l-brand-gold';
    case 'Blocked': return 'border-l-destructive';
    default: return 'border-l-muted';
  }
}

function getHealthProgressColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green';
    case 'At Risk': return 'bg-brand-gold';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-muted-foreground';
  }
}

function getStatusDotColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green';
    case 'In Progress': return 'bg-brand-gold';
    case 'To Do': return 'bg-muted-foreground/50';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-muted-foreground';
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
  
  // Dependency indicators
  const blockingCount = item.dependencyCount || 0;
  const blockedByCount = (item as any).blockedByCount || 0;
  const hasDependencyIssue = blockingCount > 0 || blockedByCount > 0;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border border-border/60 hover:border-border hover:shadow-md transition-all cursor-pointer border-l-[3px]",
        getHealthBorderColor(item.health)
      )}
      onClick={() => onItemClick(item)}
    >
      <div className="p-3 space-y-2.5">
        {/* Header: Type + Key + Expand */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TypeBadge type={item.type} />
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

        {/* Progress bar - colored by health */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", getHealthProgressColor(item.health))}
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums font-medium w-7 text-right">
            {item.progress}%
          </span>
        </div>

        {/* Footer: Avatar + Date + Dependencies */}
        <div className="flex items-center justify-between pt-1">
          <OwnerAvatar name={item.owner} initials={item.ownerInitials} />
          
          <div className="flex items-center gap-2">
            {/* Dependency indicator */}
            {hasDependencyIssue && (
              <div className={cn(
                "flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded",
                blockingCount > 0 
                  ? "bg-destructive/15 text-destructive"
                  : "bg-brand-gold/15 text-brand-gold"
              )}>
                {blockingCount > 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    {blockingCount}
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3" />
                    {blockedByCount}
                  </>
                )}
              </div>
            )}
            
            {/* Due date */}
            {item.endDate && (
              <div className={cn(
                "flex items-center gap-1 text-[10px]",
                item.health === 'At Risk' && "text-brand-gold",
                item.health === 'Blocked' && "text-destructive",
                item.health === 'On Track' && "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(item.endDate), 'MMM d')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded children */}
      {expanded && hasChildren && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1.5 bg-muted/30">
          {item.children!.slice(0, 5).map(child => (
            <div 
              key={child.id}
              className="flex items-center gap-2 p-1.5 rounded bg-background/60 hover:bg-background text-[11px]"
              onClick={(e) => { e.stopPropagation(); onItemClick(child); }}
            >
              <TypeBadge type={child.type} />
              <span className="truncate flex-1">{child.title}</span>
              <span className="text-[9px] text-muted-foreground tabular-nums">{child.progress}%</span>
            </div>
          ))}
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

  // Group items by status with correct column order
  const columns = useMemo(() => {
    const displayItems = viewLevel === 'epic' 
      ? items.filter(item => item.type === 'epic')
      : items.filter(item => item.type === 'feature' || item.type === 'epic');

    return COLUMN_ORDER.map(status => ({
      status,
      label: COLUMN_LABELS[status],
      items: displayItems.filter(item => item.status === status)
    }));
  }, [items, viewLevel]);

  const totalItems = columns.reduce((sum, col) => sum + col.items.length, 0);

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* View level toggle */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
        <span className="text-[11px] text-muted-foreground font-medium">Show:</span>
        <div className="flex items-center p-0.5 bg-muted rounded-md">
          <button
            onClick={() => setViewLevel('epic')}
            className={cn(
              "px-3 py-1 text-[11px] font-medium rounded transition-colors",
              viewLevel === 'epic' 
                ? "bg-gradient-to-r from-brand-gold to-secondary-bronze text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Epics
          </button>
          <button
            onClick={() => setViewLevel('feature')}
            className={cn(
              "px-3 py-1 text-[11px] font-medium rounded transition-colors",
              viewLevel === 'feature' 
                ? "bg-gradient-to-r from-brand-gold to-secondary-bronze text-white shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Features
          </button>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 min-h-full">
          {columns.map(column => (
            <div key={column.status} className="w-[280px] flex-shrink-0 flex flex-col">
              {/* Column header */}
              <div className="px-3 py-2.5 rounded-t-lg bg-muted/60 border border-b-0 border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full", getStatusDotColor(column.status))} />
                  <span className="text-xs font-semibold">{column.label}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {column.items.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex-1 bg-muted/20 rounded-b-lg border border-t-0 border-border p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
                {column.items.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/60 text-center py-8">
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
