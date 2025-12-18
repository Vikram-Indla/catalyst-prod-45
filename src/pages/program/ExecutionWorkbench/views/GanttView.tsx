/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant B: Gantt View - Timeline layout with rows = Epics (expandable to Features)
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, startOfYear, endOfYear, eachMonthOfInterval, addDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GanttViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

const YEAR = 2025;
const TIMELINE_START = startOfYear(new Date(YEAR, 0, 1));
const TIMELINE_END = endOfYear(new Date(YEAR, 0, 1));
const TOTAL_DAYS = differenceInDays(TIMELINE_END, TIMELINE_START);

function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green';
    case 'At Risk': return 'bg-brand-gold';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-muted';
  }
}

function dateToPercent(date: Date): number {
  const days = differenceInDays(date, TIMELINE_START);
  return Math.max(0, Math.min(100, (days / TOTAL_DAYS) * 100));
}

interface GanttRowProps {
  item: WorkItem;
  depth: number;
  onItemClick: (item: WorkItem) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

function GanttRow({ item, depth, onItemClick, expandedIds, toggleExpand }: GanttRowProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);

  const startDate = item.startDate ? new Date(item.startDate) : null;
  const endDate = item.endDate ? new Date(item.endDate) : null;

  const barStart = startDate ? dateToPercent(startDate) : 0;
  const barEnd = endDate ? dateToPercent(endDate) : 0;
  const barWidth = Math.max(2, barEnd - barStart);

  const hasValidDates = startDate && endDate;

  return (
    <>
      <div className="flex items-stretch border-b border-border/50 hover:bg-muted/30 transition-colors min-h-[44px]">
        {/* Left panel - Item info */}
        <div 
          className="w-[300px] flex-shrink-0 py-2 px-4 flex items-center gap-2 cursor-pointer border-r border-border/50"
          style={{ paddingLeft: `${16 + depth * 20}px` }}
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
          <span className="font-mono text-xs text-muted-foreground">{item.key}</span>
          <span className="text-sm truncate flex-1">{item.title}</span>
        </div>

        {/* Right panel - Timeline */}
        <div className="flex-1 relative py-2">
          {hasValidDates ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer transition-opacity hover:opacity-80",
                      getHealthColor(item.health)
                    )}
                    style={{
                      left: `${barStart}%`,
                      width: `${barWidth}%`,
                      minWidth: '8px'
                    }}
                    onClick={() => onItemClick(item)}
                  >
                    {/* Progress indicator */}
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-black/20 rounded-l"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[300px]">
                  <div className="space-y-1">
                    <p className="font-semibold">{item.key}: {item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(startDate!, 'MMM d, yyyy')} → {format(endDate!, 'MMM d, yyyy')}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Health: {item.health}</span>
                      <span>•</span>
                      <span>Progress: {item.progress}%</span>
                    </div>
                    {item.owner && <p className="text-xs">Owner: {item.owner}</p>}
                    {item.children && item.children.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {item.children.length} {item.type === 'epic' ? 'features' : 'stories'}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div 
              className="absolute top-1/2 -translate-y-1/2 left-4 text-xs text-muted-foreground cursor-pointer"
              onClick={() => onItemClick(item)}
            >
              No dates
            </div>
          )}
        </div>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && item.children!.map(child => (
        <GanttRow
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

export function GanttView({ items, onItemClick }: GanttViewProps) {
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

  const months = useMemo(() => {
    return eachMonthOfInterval({ start: TIMELINE_START, end: TIMELINE_END });
  }, []);

  const todayPercent = dateToPercent(new Date());

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No items match your filters
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-stretch border-b border-border bg-muted/50 sticky top-0 z-10">
        <div className="w-[300px] flex-shrink-0 py-2 px-4 border-r border-border/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Work Items
          </span>
        </div>
        <div className="flex-1 flex relative">
          {months.map((month, i) => (
            <div 
              key={i}
              className="flex-1 py-2 px-2 text-center border-r border-border/30 last:border-r-0"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {format(month, 'MMM')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto relative">
        {/* Today line */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-destructive/60 z-20"
          style={{ left: `calc(300px + ${todayPercent}% * (100% - 300px) / 100)` }}
        />

        {/* Rows */}
        {items.map(item => (
          <GanttRow
            key={item.id}
            item={item}
            depth={0}
            onItemClick={onItemClick}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  );
}
