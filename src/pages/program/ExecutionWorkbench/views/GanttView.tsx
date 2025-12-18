/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Variant B: Gantt View - Timeline layout with rows = Epics (expandable to Features)
 * Enhanced with Claude Variant A styling
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, HealthStatus } from '../types';
import { ChevronRight, ChevronDown, Square, Gem, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, startOfYear, endOfYear, eachMonthOfInterval, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GanttViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
  selectedYear?: number;
}

function getHealthBarColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green';
    case 'At Risk': return 'bg-brand-gold';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-muted';
  }
}

function getHealthBorderColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'border-secondary-green';
    case 'At Risk': return 'border-brand-gold';
    case 'Blocked': return 'border-destructive';
    default: return 'border-muted';
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

interface GanttRowProps {
  item: WorkItem;
  depth: number;
  onItemClick: (item: WorkItem) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  timelineStart: Date;
  totalDays: number;
}

function dateToPercent(date: Date, timelineStart: Date, totalDays: number): number {
  const days = differenceInDays(date, timelineStart);
  return Math.max(0, Math.min(100, (days / totalDays) * 100));
}

function GanttRow({ item, depth, onItemClick, expandedIds, toggleExpand, timelineStart, totalDays }: GanttRowProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const typeIcon = getTypeIcon(item.type);
  const TypeIcon = typeIcon.icon;

  const startDate = item.startDate ? new Date(item.startDate) : null;
  const endDate = item.endDate ? new Date(item.endDate) : null;

  const barStart = startDate ? dateToPercent(startDate, timelineStart, totalDays) : 0;
  const barEnd = endDate ? dateToPercent(endDate, timelineStart, totalDays) : 0;
  const barWidth = Math.max(2, barEnd - barStart);

  const hasValidDates = startDate && endDate;

  // Row styling based on depth
  const rowBgClass = depth === 0 ? 'bg-brand-gold/[0.03]' : 'bg-transparent';

  return (
    <>
      <div className={cn(
        "flex items-stretch border-b border-border/40 hover:bg-muted/40 transition-colors min-h-[44px]",
        rowBgClass
      )}>
        {/* Left panel - Item info */}
        <div 
          className="w-[280px] flex-shrink-0 py-2 px-3 flex items-center gap-1.5 cursor-pointer border-r border-border/40"
          style={{ paddingLeft: `${12 + depth * 16}px` }}
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
          
          {depth > 0 && <div className="w-px h-3 bg-border/60 -ml-1 mr-1" />}
          
          <TypeIcon className={cn("h-3.5 w-3.5 flex-shrink-0", typeIcon.colorClass)} />
          <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">{item.key}</span>
          <span className={cn(
            "text-xs truncate flex-1",
            depth === 0 ? "font-medium" : "text-muted-foreground"
          )}>
            {item.title}
          </span>
        </div>

        {/* Right panel - Timeline */}
        <div className="flex-1 relative py-2">
          {hasValidDates ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer transition-all border-2",
                      depth === 0 
                        ? "bg-gradient-to-r from-brand-gold/30 to-secondary-bronze/30 border-brand-gold" 
                        : depth === 1
                          ? "bg-secondary-green/30 border-secondary-green"
                          : "bg-muted border-border"
                    )}
                    style={{
                      left: `${barStart}%`,
                      width: `${barWidth}%`,
                      minWidth: '12px'
                    }}
                    onClick={() => onItemClick(item)}
                  >
                    {/* Progress indicator */}
                    <div 
                      className={cn(
                        "absolute left-0 top-0 bottom-0 rounded-l",
                        depth === 0 ? "bg-gradient-to-r from-brand-gold to-secondary-bronze" : getHealthBarColor(item.health)
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                    {/* Label */}
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-foreground/80 truncate px-1">
                      {item.progress}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <div className="space-y-1">
                    <p className="font-medium text-xs">{item.key}: {item.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(startDate!, 'MMM d, yyyy')} → {format(endDate!, 'MMM d, yyyy')}
                    </p>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span>{item.health}</span>
                      <span>•</span>
                      <span>{item.progress}% complete</span>
                    </div>
                    {item.owner && <p className="text-[10px]">Owner: {item.owner}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div 
              className="absolute top-1/2 -translate-y-1/2 left-3 text-[10px] text-muted-foreground/60 cursor-pointer"
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
          timelineStart={timelineStart}
          totalDays={totalDays}
        />
      ))}
    </>
  );
}

export function GanttView({ items, onItemClick, selectedYear }: GanttViewProps) {
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

  // Derive timeline from data or use selected year / current year
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const allDates: Date[] = [];
    const collectDates = (workItems: WorkItem[]) => {
      workItems.forEach(item => {
        if (item.startDate) allDates.push(new Date(item.startDate));
        if (item.endDate) allDates.push(new Date(item.endDate));
        if (item.children) collectDates(item.children);
      });
    };
    collectDates(items);

    let start: Date;
    let end: Date;

    if (selectedYear) {
      start = startOfYear(new Date(selectedYear, 0, 1));
      end = endOfYear(new Date(selectedYear, 0, 1));
    } else if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      start = startOfMonth(subMonths(minDate, 1));
      end = endOfMonth(addMonths(maxDate, 1));
    } else {
      const now = new Date();
      start = startOfYear(now);
      end = endOfYear(now);
    }

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInDays(end, start),
    };
  }, [items, selectedYear]);

  const months = useMemo(() => {
    return eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
  }, [timelineStart, timelineEnd]);

  // Today line position
  const today = new Date();
  const todayPercent = dateToPercent(today, timelineStart, totalDays);
  const showTodayLine = today >= timelineStart && today <= timelineEnd;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-stretch border-b border-border bg-muted/50 sticky top-0 z-10">
        <div className="w-[280px] flex-shrink-0 py-2.5 px-3 border-r border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Work Items
          </span>
        </div>
        <div className="flex-1 flex relative">
          {months.map((month, i) => {
            const isCurrentMonth = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear();
            return (
              <div 
                key={i}
                className={cn(
                  "flex-1 py-2 px-2 text-center border-r border-border/30 last:border-r-0",
                  isCurrentMonth && "bg-brand-gold/10"
                )}
              >
                <span className={cn(
                  "text-[10px] font-medium",
                  isCurrentMonth ? "text-brand-gold font-semibold" : "text-muted-foreground"
                )}>
                  {format(month, 'MMM yyyy')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto relative">
        {/* Today line */}
        {showTodayLine && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-brand-gold z-20"
            style={{ left: `calc(280px + ${todayPercent}% * (100% - 280px) / 100)` }}
          />
        )}

        {/* Rows */}
        {items.map(item => (
          <GanttRow
            key={item.id}
            item={item}
            depth={0}
            onItemClick={onItemClick}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
            timelineStart={timelineStart}
            totalDays={totalDays}
          />
        ))}
      </div>
    </div>
  );
}
