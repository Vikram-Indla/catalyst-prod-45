/**
 * WorkBench views: Roadmap View
 * 
 * Executive-grade quarterly roadmap with:
 * - Epic rows with type badge + status + title + owner
 * - Feature status dots summary row
 * - Progress bars with date range
 * - Today marker
 * No checkboxes - clean executive presentation
 * Uses semantic tokens from index.css for dark/light mode support
 */

import React, { useMemo } from 'react';
import { WorkItem, ItemStatus } from '../types';
import { cn } from '@/lib/utils';
import { format, startOfQuarter, endOfQuarter, differenceInDays, addQuarters, subQuarters, getQuarter, getYear } from 'date-fns';
import { Tooltip } from '@/components/ads';

interface RoadmapViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
  selectedYear?: number;
}

interface Quarter {
  label: string;
  start: Date;
  end: Date;
}

// Type badge for epics
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
      "inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0",
      bgClass, textClass
    )}>
      {label}
    </span>
  );
}

// Status dot (small indicator)
function StatusDot({ status, size = 'sm' }: { status: ItemStatus; size?: 'sm' | 'md' }) {
  const colorClass: Record<ItemStatus, string> = {
    'Done': 'bg-secondary-green',
    'In Progress': 'bg-brand-gold',
    'Blocked': 'bg-destructive',
    'Backlog': 'bg-muted-foreground',
  };
  
  return (
    <span className={cn(
      "rounded-full flex-shrink-0",
      colorClass[status] || 'bg-muted',
      size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
    )} />
  );
}

// Feature status dots row - shows status of all child features
function FeatureStatusDots({ features }: { features: WorkItem[] }) {
  if (!features || features.length === 0) return null;
  
  // Take first 6 features for display
  const displayFeatures = features.slice(0, 6);
  const remaining = features.length - 6;
  
  return (
    <div className="flex items-center gap-1 mt-1">
      {displayFeatures.map((feature, i) => (
        <Tooltip
          key={i}
          position="bottom"
          content={`${feature.key}: ${feature.title} (${feature.status})`}
        >
          <span>
            <StatusDot status={feature.status} />
          </span>
        </Tooltip>
      ))}
      {remaining > 0 && (
        <span className="text-[9px] text-muted-foreground ml-0.5">+{remaining}</span>
      )}
    </div>
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
    case 'Done': return 'bg-secondary-green/25';
    case 'In Progress': return 'bg-brand-gold/25';
    case 'Blocked': return 'bg-destructive/25';
    default: return 'bg-muted/25';
  }
}

function getStatusBorderColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'border-secondary-green/50';
    case 'In Progress': return 'border-brand-gold/50';
    case 'Blocked': return 'border-destructive/50';
    default: return 'border-muted/50';
  }
}

interface RoadmapRowProps {
  item: WorkItem;
  onItemClick: (item: WorkItem) => void;
  timelineStart: Date;
  totalDays: number;
}

function dateToPercent(date: Date, timelineStart: Date, totalDays: number): number {
  const days = differenceInDays(date, timelineStart);
  return Math.max(0, Math.min(100, (days / totalDays) * 100));
}

function RoadmapRow({ item, onItemClick, timelineStart, totalDays }: RoadmapRowProps) {
  const startDate = item.startDate ? new Date(item.startDate) : null;
  const endDate = item.endDate ? new Date(item.endDate) : null;

  const barStart = startDate ? dateToPercent(startDate, timelineStart, totalDays) : 0;
  const barEnd = endDate ? dateToPercent(endDate, timelineStart, totalDays) : 0;
  const barWidth = Math.max(2, barEnd - barStart);

  const hasValidDates = startDate && endDate;

  // Get child features for status dots
  const childFeatures = useMemo(() => {
    if (!item.children || item.type !== 'epic') return [];
    return item.children.filter(child => child.type === 'feature');
  }, [item.children, item.type]);

  const ownerName = item.owner?.full_name;

  return (
    <div className="flex items-stretch border-b border-border/40 hover:bg-muted/30 transition-colors min-h-[64px]">
      {/* Left panel - Epic info (no checkbox) */}
      <div 
        className="w-[240px] flex-shrink-0 py-3 px-4 flex items-start gap-3 cursor-pointer border-r border-border/40"
        onClick={() => onItemClick(item)}
      >
        <TypeBadge type={item.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <StatusDot status={item.status} size="md" />
            <span className="font-mono text-[10px] text-brand-gold">{item.key}</span>
          </div>
          <p className="text-sm font-semibold truncate leading-tight">{item.title}</p>
          {ownerName && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ownerName}</p>
          )}
          {/* Feature status dots */}
          <FeatureStatusDots features={childFeatures} />
        </div>
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative py-3 px-2">
        {hasValidDates ? (
          <Tooltip
            content={
              <div className="space-y-2">
                <div>
                  <p className="font-medium text-xs">{item.key}: {item.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(startDate!, 'MMM d, yyyy')} → {format(endDate!, 'MMM d, yyyy')}
                  </p>
                </div>
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
                {childFeatures.length > 0 && (
                  <div className="pt-1 border-t border-border">
                    <p className="text-[10px] font-medium mb-1">{childFeatures.length} Features:</p>
                    <div className="flex gap-1">
                      {childFeatures.slice(0, 8).map((f, i) => (
                        <StatusDot key={i} status={f.status} />
                      ))}
                      {childFeatures.length > 8 && (
                        <span className="text-[9px] text-muted-foreground">+{childFeatures.length - 8}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            }
          >
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-9 rounded-md cursor-pointer transition-all border",
                getStatusBarBg(item.status),
                getStatusBorderColor(item.status)
              )}
              style={{
                left: `${barStart}%`,
                width: `${barWidth}%`,
                minWidth: '60px'
              }}
              onClick={() => onItemClick(item)}
            >
              {/* Progress fill */}
              <div
                className={cn(
                  "absolute left-0 top-0 bottom-0 rounded-l-md",
                  getStatusBarColor(item.status)
                )}
                style={{ width: `${item.progress}%` }}
              />

              {/* Bar content: progress % on left, date range on right */}
              <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-semibold text-foreground">
                <span>{item.progress}%</span>
                <span className="text-[9px] text-muted-foreground">
                  {format(startDate!, 'MMM d')} - {format(endDate!, 'MMM d')}
                </span>
              </div>
            </div>
          </Tooltip>
        ) : (
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-3 text-[10px] text-muted-foreground/60 cursor-pointer"
            onClick={() => onItemClick(item)}
          >
            No dates set
          </div>
        )}
      </div>
    </div>
  );
}

export function RoadmapView({ items, onItemClick, selectedYear }: RoadmapViewProps) {
  // Derive quarters and timeline from data or selected year
  const { quarters, timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const allDates: Date[] = [];
    items.forEach(item => {
      if (item.startDate) allDates.push(new Date(item.startDate));
      if (item.endDate) allDates.push(new Date(item.endDate));
    });

    let start: Date;
    let end: Date;

    if (selectedYear) {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31);
    } else if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
      start = startOfQuarter(subQuarters(minDate, 1));
      end = endOfQuarter(addQuarters(maxDate, 1));
    } else {
      const now = new Date();
      start = new Date(getYear(now), 0, 1);
      end = new Date(getYear(now), 11, 31);
    }

    // Generate quarters
    const quartersList: Quarter[] = [];
    let current = startOfQuarter(start);
    const finalEnd = endOfQuarter(end);
    
    while (current <= finalEnd) {
      const qEnd = endOfQuarter(current);
      quartersList.push({
        label: `Q${getQuarter(current)} ${getYear(current)}`,
        start: current,
        end: qEnd,
      });
      current = addQuarters(current, 1);
    }

    return {
      quarters: quartersList,
      timelineStart: quartersList[0]?.start || start,
      timelineEnd: quartersList[quartersList.length - 1]?.end || end,
      totalDays: differenceInDays(quartersList[quartersList.length - 1]?.end || end, quartersList[0]?.start || start),
    };
  }, [items, selectedYear]);

  // Today line position
  const today = new Date();
  const todayPercent = dateToPercent(today, timelineStart, totalDays);
  const showTodayLine = today >= timelineStart && today <= timelineEnd;

  // Filter to show only epics in roadmap view
  const epics = useMemo(() => items.filter(item => item.type === 'epic'), [items]);

  if (epics.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-stretch border-b border-border bg-muted/50 sticky top-0 z-10">
        <div className="w-[240px] flex-shrink-0 py-3 px-4 border-r border-border/40">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Epics
          </span>
        </div>
        <div className="flex-1 flex">
          {quarters.map((quarter, i) => {
            const isCurrentQuarter = today >= quarter.start && today <= quarter.end;
            return (
              <div 
                key={i}
                className={cn(
                  "flex-1 py-3 px-2 text-center border-r border-border/30 last:border-r-0",
                  isCurrentQuarter && "bg-brand-gold/10"
                )}
              >
                <span className={cn(
                  "text-xs font-semibold",
                  isCurrentQuarter ? "text-brand-gold" : "text-foreground"
                )}>
                  {quarter.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto relative">
        {/* Quarter grid lines */}
        <div className="absolute inset-0 flex pointer-events-none" style={{ left: '240px', right: 0 }}>
          {quarters.map((_, i) => (
            <div key={i} className="flex-1 border-r border-border/20 last:border-r-0" />
          ))}
        </div>

        {/* Today line */}
        {showTodayLine && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-brand-gold z-20 pointer-events-none"
            style={{ left: `calc(240px + (100% - 240px) * ${todayPercent / 100})` }}
          />
        )}

        {/* Rows */}
        {epics.map(item => (
          <RoadmapRow 
            key={item.id} 
            item={item} 
            onItemClick={onItemClick} 
            timelineStart={timelineStart}
            totalDays={totalDays}
          />
        ))}
      </div>
    </div>
  );
}
