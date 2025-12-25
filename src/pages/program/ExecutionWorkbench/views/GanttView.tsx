/**
 * WorkBench views: Gantt View
 * 
 * Executive-grade timeline visualization with:
 * - Today marker (vertical line)
 * - Week markers in header
 * - Bar labels with key/title
 * - Milestone diamonds
 * - Status-colored bars
 * Uses semantic tokens from index.css for dark/light mode support
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, ItemStatus } from '../types';
import { ChevronRight, ChevronDown, Diamond } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  format, 
  differenceInDays, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths,
  eachWeekOfInterval,
  getWeek,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GanttViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
  selectedYear?: number;
}

// Type badge for left panel
function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; bgClass: string; textClass: string }> = {
    epic: { label: 'E', bgClass: 'bg-workitem-epic/20', textClass: 'text-workitem-epic' },
    feature: { label: 'F', bgClass: 'bg-workitem-feature/20', textClass: 'text-workitem-feature' },
    story: { label: 'S', bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
    subtask: { label: 'T', bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
  };
  const { label, bgClass, textClass } = config[type] || config.story;
  
  return (
    <span className={cn(
      "inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold flex-shrink-0",
      bgClass, textClass
    )}>
      {label}
    </span>
  );
}

function getStatusBarColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green';
    case 'In Progress': return 'bg-brand-gold';
    case 'Blocked': return 'bg-destructive';
    default: return 'bg-muted';
  }
}

function getStatusBarBg(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green/30';
    case 'In Progress': return 'bg-brand-gold/30';
    case 'Blocked': return 'bg-destructive/30';
    default: return 'bg-muted/30';
  }
}

function getStatusBorderColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'border-secondary-green';
    case 'In Progress': return 'border-brand-gold';
    case 'Blocked': return 'border-destructive';
    default: return 'border-muted';
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

  const startDate = item.startDate ? new Date(item.startDate) : null;
  const endDate = item.endDate ? new Date(item.endDate) : null;

  const barStart = startDate ? dateToPercent(startDate, timelineStart, totalDays) : 0;
  const barEnd = endDate ? dateToPercent(endDate, timelineStart, totalDays) : 0;
  const barWidth = Math.max(2, barEnd - barStart);

  const hasValidDates = startDate && endDate;
  const milestoneDate = (item as any).milestoneDate;
  const hasMilestone = milestoneDate != null;
  const milestonePosition = hasMilestone
    ? dateToPercent(new Date(milestoneDate), timelineStart, totalDays)
    : null;

  // Row styling based on depth
  const rowBgClass = depth === 0 ? 'bg-surface-tinted' : 'bg-transparent';

  // Abbreviate title for bar label
  const barLabel = item.title.length > 15 ? item.title.slice(0, 15) + '…' : item.title;

  const ownerName = item.owner?.full_name;

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
          
          <TypeBadge type={item.type} />
          <span className={cn(
            "text-xs truncate flex-1",
            depth === 0 ? "font-semibold" : "text-muted-foreground"
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
                      "absolute top-1/2 -translate-y-1/2 h-6 rounded cursor-pointer transition-all border",
                      getStatusBarBg(item.status),
                      getStatusBorderColor(item.status)
                    )}
                    style={{
                      left: `${barStart}%`,
                      width: `${barWidth}%`,
                      minWidth: '40px'
                    }}
                    onClick={() => onItemClick(item)}
                  >
                    {/* Progress fill */}
                    <div 
                      className={cn(
                        "absolute left-0 top-0 bottom-0 rounded-l",
                        getStatusBarColor(item.status)
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                    {/* Bar label */}
                    <span className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold text-foreground truncate">
                      {item.key} {barLabel}
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
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px]",
                        item.status === 'Done' && "bg-secondary-green/20 text-secondary-green",
                        item.status === 'In Progress' && "bg-brand-gold/20 text-brand-gold",
                        item.status === 'Blocked' && "bg-destructive/20 text-destructive",
                        item.status === 'Backlog' && "bg-muted text-muted-foreground"
                      )}>{item.status}</span>
                      <span>•</span>
                      <span>{item.progress}% complete</span>
                    </div>
                    {ownerName && <p className="text-[10px]">Owner: {ownerName}</p>}
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

          {/* Milestone diamond */}
          {hasMilestone && milestonePosition !== null && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 z-10"
              style={{ left: `${milestonePosition}%`, transform: 'translateX(-50%) translateY(-50%)' }}
            >
              <Diamond className="h-4 w-4 fill-brand-gold text-brand-gold" />
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

  // Derive timeline from data
  const { timelineStart, timelineEnd, totalDays, months, weeks } = useMemo(() => {
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
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    } else if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      start = startOfMonth(subMonths(minDate, 1));
      end = endOfMonth(addMonths(maxDate, 1));
    } else {
      const now = new Date();
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(addMonths(now, 6));
    }

    // Generate months
    const monthsList: { date: Date; label: string }[] = [];
    let current = startOfMonth(start);
    while (current <= end) {
      monthsList.push({ date: current, label: format(current, 'MMM yyyy') });
      current = addMonths(current, 1);
    }

    // Generate weeks for week markers
    const weeksList = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: differenceInDays(end, start),
      months: monthsList,
      weeks: weeksList,
    };
  }, [items, selectedYear]);

  // Today line position
  const today = new Date();
  const todayPercent = dateToPercent(today, timelineStart, totalDays);
  const showTodayLine = today >= timelineStart && today <= timelineEnd;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with months and weeks */}
      <div className="flex items-stretch border-b border-border bg-muted/50 sticky top-0 z-10">
        <div className="w-[280px] flex-shrink-0 py-2.5 px-3 border-r border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Work Items
          </span>
        </div>
        <div className="flex-1 flex flex-col relative">
          {/* Month row */}
          <div className="flex border-b border-border/30">
            {months.map((month, i) => {
              const isCurrentMonth = month.date.getMonth() === today.getMonth() && month.date.getFullYear() === today.getFullYear();
              return (
                <div 
                  key={i}
                  className={cn(
                    "flex-1 py-1.5 px-2 text-center border-r border-border/30 last:border-r-0",
                    isCurrentMonth && "bg-brand-gold/10"
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-semibold",
                    isCurrentMonth ? "text-brand-gold" : "text-muted-foreground"
                  )}>
                    {month.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Week row */}
          <div className="flex h-5">
            {weeks.map((week, i) => {
              const weekNum = getWeek(week);
              const weekStart = startOfWeek(week, { weekStartsOn: 1 });
              const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
              const weekStartPercent = dateToPercent(weekStart, timelineStart, totalDays);
              const weekEndPercent = dateToPercent(weekEnd, timelineStart, totalDays);
              const weekWidth = weekEndPercent - weekStartPercent;
              const isCurrentWeek = today >= weekStart && today <= weekEnd;
              
              return (
                <div 
                  key={i}
                  className={cn(
                    "border-r border-border/20 flex items-center justify-center text-[9px]",
                    isCurrentWeek ? "text-brand-gold font-semibold bg-brand-gold/5" : "text-muted-foreground/60"
                  )}
                  style={{ 
                    position: 'absolute',
                    left: `${weekStartPercent}%`,
                    width: `${weekWidth}%`
                  }}
                >
                  W{weekNum}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto relative">
        {/* Today line */}
        {showTodayLine && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-brand-gold z-20 pointer-events-none"
            style={{ left: `calc(280px + (100% - 280px) * ${todayPercent / 100})` }}
          >
            <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-brand-gold text-[8px] font-bold text-white rounded-b">
              Today
            </div>
          </div>
        )}

        {/* Week grid lines (subtle) */}
        <div className="absolute inset-0 flex pointer-events-none" style={{ left: '280px' }}>
          {weeks.map((week, i) => {
            const weekStart = startOfWeek(week, { weekStartsOn: 1 });
            const pos = dateToPercent(weekStart, timelineStart, totalDays);
            return (
              <div 
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border/20"
                style={{ left: `${pos}%` }}
              />
            );
          })}
        </div>

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
