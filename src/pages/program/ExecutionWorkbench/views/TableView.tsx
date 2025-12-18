/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant A: Table View - Hierarchical expandable table (Epic → Feature → Story)
 * Enhanced with Claude Variant A styling - denser rows, better hierarchy cues
 */

import React, { useState } from 'react';
import { WorkItem, HealthStatus, ItemStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Square, Gem, FileText, Calendar, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TableViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

function getHealthBadgeStyle(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green/15 text-secondary-green border-secondary-green/30';
    case 'At Risk': return 'bg-brand-gold/15 text-brand-gold border-brand-gold/30';
    case 'Blocked': return 'bg-destructive/15 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStatusBadgeStyle(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green/15 text-secondary-green';
    case 'In Progress': return 'bg-brand-gold/15 text-brand-gold';
    case 'To Do': return 'bg-muted text-muted-foreground';
    case 'Blocked': return 'bg-destructive/15 text-destructive';
    default: return 'bg-muted text-muted-foreground';
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

function getProgressBarColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green';
    case 'At Risk': return 'bg-brand-gold';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-brand-primary';
  }
}

interface TableRowProps {
  item: WorkItem;
  depth: number;
  onItemClick: (item: WorkItem) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

function TableRow({ item, depth, onItemClick, expandedIds, toggleExpand }: TableRowProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const typeIcon = getTypeIcon(item.type);
  const TypeIcon = typeIcon.icon;

  // Row styling based on depth/type
  const rowBgClass = depth === 0 
    ? 'bg-brand-gold/[0.03]' 
    : depth === 1 
      ? 'bg-transparent' 
      : 'bg-muted/20';

  return (
    <>
      <tr 
        className={cn(
          "border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors",
          rowBgClass
        )}
        onClick={() => onItemClick(item)}
      >
        {/* Title/Hierarchy */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
            {/* Expand/Collapse */}
            {hasChildren ? (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                className="p-0.5 hover:bg-muted rounded flex-shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" />
            )}
            
            {/* Depth indicator line for children */}
            {depth > 0 && (
              <div className="w-px h-4 bg-border/60 -ml-1 mr-1 flex-shrink-0" />
            )}
            
            {/* Type Icon */}
            <TypeIcon className={cn("h-4 w-4 flex-shrink-0", typeIcon.colorClass)} />
            
            {/* Key */}
            <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0">{item.key}</span>
            
            {/* Title */}
            <span className={cn(
              "text-sm truncate",
              depth === 0 ? "font-medium" : depth === 1 ? "font-normal" : "text-muted-foreground"
            )}>
              {item.title}
            </span>
          </div>
        </td>

        {/* Owner */}
        <td className="py-2.5 px-3">
          {item.owner ? (
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-secondary-bronze to-brand-primary text-white flex items-center justify-center text-[9px] font-semibold flex-shrink-0">
                {item.ownerInitials || item.owner.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">{item.owner}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </td>

        {/* Health */}
        <td className="py-2.5 px-3">
          <div className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
            getHealthBadgeStyle(item.health)
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {item.health}
          </div>
        </td>

        {/* Status */}
        <td className="py-2.5 px-3">
          <span className={cn(
            "inline-block px-2 py-0.5 rounded text-[10px] font-medium",
            getStatusBadgeStyle(item.status)
          )}>
            {item.status}
          </span>
        </td>

        {/* Progress */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2 min-w-[90px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", getProgressBarColor(item.health))}
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums">{item.progress}%</span>
          </div>
        </td>

        {/* Dates */}
        <td className="py-2.5 px-3">
          <span className="text-[11px] text-muted-foreground">
            {item.startDate && item.endDate ? (
              `${format(new Date(item.startDate), 'MMM d')} – ${format(new Date(item.endDate), 'MMM d')}`
            ) : (
              <span className="text-muted-foreground/50">No dates</span>
            )}
          </span>
        </td>

        {/* Dependencies */}
        <td className="py-2.5 px-3 text-center">
          {item.dependencyCount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
              <Link2 className="h-3 w-3" />
              {item.dependencyCount}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/50">—</span>
          )}
        </td>
      </tr>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && item.children!.map(child => (
        <TableRow
          key={child.id}
          item={child}
          depth={depth + 1}
          onItemClick={onItemClick}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
}

export function TableView({ items, onItemClick }: TableViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="overflow-auto flex-1 p-3">
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[40%]">
                Work Item
              </th>
              <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[14%]">
                Owner
              </th>
              <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
                Health
              </th>
              <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
                Status
              </th>
              <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[12%]">
                Progress
              </th>
              <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
                Dates
              </th>
              <th className="py-2.5 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[6%]">
                Deps
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <TableRow
                key={item.id}
                item={item}
                depth={0}
                onItemClick={onItemClick}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
