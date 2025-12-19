/**
 * WorkBench views: Table View
 * 
 * Executive-grade hierarchical table (Epic → Feature → Story)
 * Columns: Work Item, Health, Progress, Owner, Target Date, Dependencies
 * Uses semantic tokens from index.css for dark/light mode support
 */

import React, { useState } from 'react';
import { WorkItem, HealthStatus, ItemStatus } from '../types';
import { ChevronRight, ChevronDown, MoreHorizontal, Link2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TableViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

// Type badge component - E/F/S colored circles
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
  if (!name) return <span className="text-muted-foreground/50 text-xs">—</span>;
  
  const displayInitials = initials || name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-secondary-bronze to-brand-primary flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
        {displayInitials}
      </div>
      <span className="text-xs truncate max-w-[80px]">{name.split(' ')[0]}</span>
    </div>
  );
}

// Health status pill
function HealthPill({ health }: { health: HealthStatus }) {
  const styles: Record<HealthStatus, string> = {
    'On Track': 'bg-secondary-green/15 text-secondary-green border-secondary-green/30',
    'At Risk': 'bg-brand-gold/15 text-brand-gold border-brand-gold/30',
    'Blocked': 'bg-destructive/15 text-destructive border-destructive/30',
  };
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
      styles[health] || 'bg-muted text-muted-foreground'
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {health}
    </div>
  );
}

// Progress bar colored by health
function ProgressBar({ progress, health }: { progress: number; health: HealthStatus }) {
  const colorClass: Record<HealthStatus, string> = {
    'On Track': 'bg-secondary-green',
    'At Risk': 'bg-brand-gold',
    'Blocked': 'bg-destructive',
  };
  
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", colorClass[health] || 'bg-brand-primary')}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground w-8 text-right tabular-nums font-medium">
        {progress}%
      </span>
    </div>
  );
}

// Dependency chip/badge
function DependencyBadge({ count, type }: { count: number; type: 'blocking' | 'blocked-by' }) {
  if (count === 0) return <span className="text-muted-foreground/50 text-xs">—</span>;
  
  const isBlocking = type === 'blocking';
  
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
      isBlocking 
        ? "bg-destructive/15 text-destructive" 
        : "bg-brand-gold/15 text-brand-gold"
    )}>
      {isBlocking ? <AlertTriangle className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      {isBlocking ? `${count} blocking` : `blocked by ${count}`}
    </div>
  );
}

// Row actions menu
function RowActions({ item, onItemClick }: { item: WorkItem; onItemClick: (item: WorkItem) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => onItemClick(item)}>View Details</DropdownMenuItem>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>View Dependencies</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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

  // Subtle row differentiation by depth
  const rowBgClass = depth === 0 
    ? 'bg-surface-tinted' 
    : depth === 1 
      ? 'bg-transparent' 
      : 'bg-muted/10';

  // Determine dependency display
  const blockingCount = item.dependencyCount || 0;
  const blockedByCount = (item as any).blockedByCount || 0;

  return (
    <>
      <tr 
        className={cn(
          "border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors group",
          rowBgClass
        )}
        onClick={() => onItemClick(item)}
      >
        {/* Work Item - Type + Key + Title */}
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
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
            
            {/* Hierarchy connector for children */}
            {depth > 0 && (
              <div className="w-px h-4 bg-border/60 -ml-2 mr-0 flex-shrink-0" />
            )}
            
            {/* Type Badge */}
            <TypeBadge type={item.type} />
            
            {/* Key */}
            <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0">{item.key}</span>
            
            {/* Title */}
            <span className={cn(
              "text-sm truncate",
              depth === 0 ? "font-semibold" : depth === 1 ? "font-medium" : "text-muted-foreground"
            )}>
              {item.title}
            </span>
          </div>
        </td>

        {/* Health */}
        <td className="py-2.5 px-3">
          <HealthPill health={item.health} />
        </td>

        {/* Progress */}
        <td className="py-2.5 px-3">
          <ProgressBar progress={item.progress} health={item.health} />
        </td>

        {/* Owner */}
        <td className="py-2.5 px-3">
          <OwnerAvatar name={item.owner} initials={item.ownerInitials} />
        </td>

        {/* Target Date */}
        <td className="py-2.5 px-3">
          {item.endDate ? (
            <span className={cn(
              "text-xs font-medium",
              item.health === 'At Risk' && "text-brand-gold",
              item.health === 'Blocked' && "text-destructive"
            )}>
              {format(new Date(item.endDate), 'MMM d')}
            </span>
          ) : (
            <span className="text-muted-foreground/50 text-xs">No date</span>
          )}
        </td>

        {/* Dependencies */}
        <td className="py-2.5 px-3">
          {blockingCount > 0 ? (
            <DependencyBadge count={blockingCount} type="blocking" />
          ) : blockedByCount > 0 ? (
            <DependencyBadge count={blockedByCount} type="blocked-by" />
          ) : (
            <span className="text-muted-foreground/50 text-xs">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="py-2.5 px-2 w-10">
          <RowActions item={item} onItemClick={onItemClick} />
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
    return null;
  }

  return (
    <div className="overflow-auto flex-1 p-3">
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[38%]">
                Work Item
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
                Health
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[14%]">
                Progress
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[14%]">
                Owner
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[10%]">
                Target Date
              </th>
              <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[12%]">
                Dependencies
              </th>
              <th className="py-3 px-2 w-10"></th>
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
