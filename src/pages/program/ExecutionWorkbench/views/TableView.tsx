/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant A: Table View - Hierarchical expandable table (Epic → Feature → Story)
 */

import React, { useState } from 'react';
import { WorkItem, HealthStatus, ItemStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Square, Gem, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TableViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green/20 text-secondary-green';
    case 'At Risk': return 'bg-brand-gold/20 text-brand-gold';
    case 'Blocked': return 'bg-destructive/20 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green/20 text-secondary-green';
    case 'In Progress': return 'bg-brand-gold/20 text-brand-gold';
    case 'To Do': return 'bg-muted text-muted-foreground';
    case 'Blocked': return 'bg-destructive/20 text-destructive';
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

  return (
    <>
      <tr 
        className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
        onClick={() => onItemClick(item)}
      >
        {/* Title */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
            {hasChildren ? (
              <button 
                onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}
            <typeIcon.icon className={cn("h-4 w-4", typeIcon.colorClass)} />
            <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
            <span className="text-sm truncate max-w-[300px]">{item.title}</span>
          </div>
        </td>

        {/* Owner */}
        <td className="py-3 px-4">
          {item.owner ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-[10px] font-semibold">
                {item.ownerInitials || item.owner.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <span className="text-sm truncate">{item.owner}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>

        {/* Health */}
        <td className="py-3 px-4">
          <Badge variant="outline" className={cn("text-xs", getHealthColor(item.health))}>
            {item.health}
          </Badge>
        </td>

        {/* Status */}
        <td className="py-3 px-4">
          <Badge variant="outline" className={cn("text-xs", getStatusColor(item.status))}>
            {item.status}
          </Badge>
        </td>

        {/* Progress */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-primary transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">{item.progress}%</span>
          </div>
        </td>

        {/* Dates */}
        <td className="py-3 px-4">
          <span className="text-xs text-muted-foreground">
            {item.startDate && item.endDate ? (
              `${format(new Date(item.startDate), 'MMM d')} – ${format(new Date(item.endDate), 'MMM d')}`
            ) : (
              'No dates'
            )}
          </span>
        </td>

        {/* Dependencies */}
        <td className="py-3 px-4 text-center">
          <span className="text-xs text-muted-foreground">
            {item.dependencyCount || 0}
          </span>
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
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No items match your filters
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full table-fixed">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="border-b border-border">
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[40%]">
              Title
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[15%]">
              Owner
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
              Health
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
              Status
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[12%]">
              Progress
            </th>
            <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
              Dates
            </th>
            <th className="py-3 px-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[5%]">
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
  );
}
