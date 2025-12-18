/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant E: Swimlane View - Swimlanes grouped by Owner
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ChevronRight, ChevronDown, User } from 'lucide-react';

interface SwimlaneViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green/20 text-secondary-green border-secondary-green/30';
    case 'At Risk': return 'bg-brand-gold/20 text-brand-gold border-brand-gold/30';
    case 'Blocked': return 'bg-destructive/20 text-destructive border-destructive/30';
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

interface SwimlaneRowProps {
  item: WorkItem;
  depth: number;
  onItemClick: (item: WorkItem) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

function SwimlaneRow({ item, depth, onItemClick, expandedIds, toggleExpand }: SwimlaneRowProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);

  return (
    <>
      <div 
        className={cn(
          "flex items-center gap-3 py-2 px-3 border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors",
          depth > 0 && "bg-muted/10"
        )}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
        onClick={() => onItemClick(item)}
      >
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

        <Badge variant="outline" className={cn("text-[10px] capitalize", getTypeColor(item.type))}>
          {item.type}
        </Badge>

        <span className="font-mono text-xs text-muted-foreground">{item.key}</span>

        <span className="text-sm flex-1 truncate">{item.title}</span>

        <Badge variant="outline" className={cn("text-[10px]", getHealthColor(item.health))}>
          {item.health}
        </Badge>

        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-primary"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-8 text-right">{item.progress}%</span>
        </div>

        {item.endDate && (
          <span className="text-xs text-muted-foreground">
            {format(new Date(item.endDate), 'MMM d')}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && item.children!.map(child => (
        <SwimlaneRow
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

interface OwnerLane {
  owner: string;
  initials: string;
  items: WorkItem[];
}

export function SwimlaneView({ items, onItemClick }: SwimlaneViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLane = (owner: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(owner)) next.delete(owner);
      else next.add(owner);
      return next;
    });
  };

  // Group items by owner
  const lanes: OwnerLane[] = useMemo(() => {
    const ownerMap = new Map<string, WorkItem[]>();
    
    // Only show epics (with their children) in swimlanes
    const epics = items.filter(item => item.type === 'epic');
    
    epics.forEach(item => {
      const owner = item.owner || 'Unassigned';
      if (!ownerMap.has(owner)) {
        ownerMap.set(owner, []);
      }
      ownerMap.get(owner)!.push(item);
    });

    return Array.from(ownerMap.entries())
      .map(([owner, ownerItems]) => ({
        owner,
        initials: owner === 'Unassigned' ? '?' : owner.split(' ').map(n => n[0]).join('').toUpperCase(),
        items: ownerItems
      }))
      .sort((a, b) => {
        if (a.owner === 'Unassigned') return 1;
        if (b.owner === 'Unassigned') return -1;
        return a.owner.localeCompare(b.owner);
      });
  }, [items]);

  if (lanes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No items match your filters
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {lanes.map(lane => {
        const isCollapsed = collapsedLanes.has(lane.owner);
        
        return (
          <div key={lane.owner} className="border-b border-border">
            {/* Lane header */}
            <div 
              className="flex items-center gap-3 px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors sticky top-0 z-10"
              onClick={() => toggleLane(lane.owner)}
            >
              <button className="p-0.5">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              <div className="h-8 w-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-xs font-semibold">
                {lane.initials}
              </div>

              <span className="font-semibold text-sm">{lane.owner}</span>

              <Badge variant="outline" className="text-xs">
                {lane.items.length} {lane.items.length === 1 ? 'epic' : 'epics'}
              </Badge>

              {/* Summary stats */}
              <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {lane.items.filter(i => i.health === 'On Track').length} on track
                </span>
                <span>
                  {lane.items.filter(i => i.health === 'At Risk').length} at risk
                </span>
                <span>
                  {lane.items.filter(i => i.health === 'Blocked').length} blocked
                </span>
              </div>
            </div>

            {/* Lane content */}
            {!isCollapsed && (
              <div>
                {lane.items.map(item => (
                  <SwimlaneRow
                    key={item.id}
                    item={item}
                    depth={0}
                    onItemClick={onItemClick}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
