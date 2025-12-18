/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant E: Swimlane View - Swimlanes grouped by Owner
 * Enhanced with Claude Variant A styling
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ChevronRight, ChevronDown, Square, Gem, FileText, User } from 'lucide-react';

interface SwimlaneViewProps {
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
  const typeIcon = getTypeIcon(item.type);
  const TypeIcon = typeIcon.icon;

  return (
    <>
      <div 
        className={cn(
          "flex items-center gap-2.5 py-2 px-3 border-b border-border/30 hover:bg-muted/40 cursor-pointer transition-colors",
          depth > 0 && "bg-muted/10"
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onItemClick(item)}
      >
        {hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
            className="p-0.5 hover:bg-muted rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <TypeIcon className={cn("h-3.5 w-3.5 flex-shrink-0", typeIcon.colorClass)} />

        <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">{item.key}</span>

        <span className={cn(
          "text-xs flex-1 truncate",
          depth === 0 ? "font-medium" : ""
        )}>
          {item.title}
        </span>

        <div className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium border",
          getHealthBadgeStyle(item.health)
        )}>
          <span className="w-1 h-1 rounded-full bg-current" />
          {item.health}
        </div>

        <div className="flex items-center gap-1.5 min-w-[70px]">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full", getProgressBarColor(item.health))}
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground w-6 text-right tabular-nums">{item.progress}%</span>
        </div>

        {item.endDate && (
          <span className="text-[10px] text-muted-foreground flex-shrink-0">
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
        initials: owner === 'Unassigned' ? '?' : owner.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        items: ownerItems
      }))
      .sort((a, b) => {
        if (a.owner === 'Unassigned') return 1;
        if (b.owner === 'Unassigned') return -1;
        return a.owner.localeCompare(b.owner);
      });
  }, [items]);

  if (lanes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto p-3 gap-3">
      {lanes.map(lane => {
        const isCollapsed = collapsedLanes.has(lane.owner);
        const onTrackCount = lane.items.filter(i => i.health === 'On Track').length;
        const atRiskCount = lane.items.filter(i => i.health === 'At Risk').length;
        const blockedCount = lane.items.filter(i => i.health === 'Blocked').length;
        
        return (
          <div key={lane.owner} className="rounded-lg border border-border overflow-hidden bg-card">
            {/* Lane header */}
            <div 
              className="flex items-center gap-3 px-4 py-3 bg-brand-gold/[0.06] cursor-pointer hover:bg-brand-gold/[0.1] transition-colors border-b border-border/50"
              onClick={() => toggleLane(lane.owner)}
            >
              <button className="p-0.5 flex-shrink-0">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-secondary-bronze to-brand-primary text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                {lane.initials}
              </div>

              <span className="font-semibold text-sm">{lane.owner}</span>

              <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                {lane.items.length} epic{lane.items.length !== 1 ? 's' : ''}
              </span>

              {/* Summary stats */}
              <div className="ml-auto flex items-center gap-4 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-green" />
                  <span className="text-secondary-green font-medium">{onTrackCount}</span>
                  <span className="text-muted-foreground">on track</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" />
                  <span className="text-brand-gold font-medium">{atRiskCount}</span>
                  <span className="text-muted-foreground">at risk</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  <span className="text-destructive font-medium">{blockedCount}</span>
                  <span className="text-muted-foreground">blocked</span>
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
