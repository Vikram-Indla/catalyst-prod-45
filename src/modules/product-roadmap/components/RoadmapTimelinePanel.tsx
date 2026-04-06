/**
 * Right panel — Gantt Timeline
 * Month headers, vertical gridlines, today marker, 44px rows
 * ALL items get solid bars — no "unscheduled" state
 */

import React, { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RoadmapTimelineHeader } from './RoadmapTimelineHeader';
import { RoadmapTimelineBar } from './RoadmapTimelineBar';
import { RoadmapTodayMarker } from './RoadmapTodayMarker';
import { generateTimelinePeriods, calculateBarPosition } from '../utils/timeline';
import type { RoadmapDemand, TimelineConfig, RoadmapGroup } from '../types/roadmap';
import { addMonths } from 'date-fns';

/**
 * Resolve bar dates — every item MUST have a visible bar.
 * If no start date → use today.
 * If no end date → use start + 3 months.
 * If end < start (data error) → swap them.
 */
function resolveBarDates(item: RoadmapDemand): { start: string; end: string; endEstimated: boolean } {
  let startRaw = item.start_date;
  let endRaw = item.end_date;
  let endEstimated = false;

  // No start date → default to today
  if (!startRaw) {
    startRaw = new Date().toISOString().split('T')[0];
  }

  // No end date → start + 3 months
  if (!endRaw) {
    const s = new Date(startRaw);
    endRaw = addMonths(s, 3).toISOString().split('T')[0];
    endEstimated = true;
  }

  // If end < start (data integrity issue), swap them
  if (new Date(endRaw) < new Date(startRaw)) {
    const tmp = startRaw;
    startRaw = endRaw;
    endRaw = tmp;
  }

  return { start: startRaw, end: endRaw, endEstimated };
}

interface RoadmapTimelinePanelProps {
  items: RoadmapDemand[];
  groups?: RoadmapGroup[];
  config: TimelineConfig;
  selectedItemId: string | null;
  onItemClick: (id: string) => void;
  onDateChange: (id: string, start: string | null, end: string | null) => void;
}

export function RoadmapTimelinePanel({ items, groups, config, selectedItemId, onItemClick, onDateChange }: RoadmapTimelinePanelProps) {
  const periods = useMemo(() => generateTimelinePeriods(config), [config]);

  const todayPosition = useMemo(() => {
    const today = new Date();
    const totalDays = (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceStart = (today.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const pos = (daysSinceStart / totalDays) * 100;
    return pos >= 0 && pos <= 100 ? pos : null;
  }, [config.startDate, config.endDate]);

  const periodMinWidth = config.zoom === 'month' ? 120 : config.zoom === 'quarter' ? 200 : 280;
  const totalMinWidth = periods.length * periodMinWidth;

  const renderRow = (item: RoadmapDemand) => {
    const { start, end, endEstimated } = resolveBarDates(item);
    const position = calculateBarPosition(start, end, config.startDate, config.endDate);
    const isSelected = selectedItemId === item.id;

    return (
      <div
        key={item.id}
        className="relative flex items-center cursor-pointer transition-colors"
        style={{
          height: 44,
          backgroundColor: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
          borderBottom: '1px solid #F1F5F9',
        }}
        onClick={() => onItemClick(item.id)}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#FAFBFC'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {position ? (
          <RoadmapTimelineBar
            item={item}
            left={position.left}
            width={position.width}
            isSelected={isSelected}
            onClick={() => onItemClick(item.id)}
            endDateIsEstimated={endEstimated}
          />
        ) : (
          // Fallback: bar is entirely outside visible timeline range — show indicator
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#2563EB' }} />
            <span style={{ fontSize: 12, color: '#64748B' }}>Outside timeline range</span>
          </div>
        )}
      </div>
    );
  };

  const renderGridlines = () => (
    <div className="absolute inset-0 pointer-events-none flex">
      {periods.map((period) => {
        const isQuarterBoundary = period.label.startsWith('Q') || (config.zoom === 'month' && [0, 3, 6, 9].includes(new Date(period.startDate).getMonth()));
        return (
          <div
            key={period.key}
            className="flex-shrink-0"
            style={{
              minWidth: periodMinWidth,
              width: `${100 / periods.length}%`,
              borderRight: `1px solid ${isQuarterBoundary ? 'var(--bd-default, #E2E8F0)' : var(--bg-2, '#F1F5F9')}`,
              background: period.isCurrent ? 'rgba(37,99,235,0.03)' : 'transparent',
            }}
          />
        );
      })}
    </div>
  );

  // Grouped view
  if (groups && groups.length > 0) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg-app, #FFFFFF)' }}>
        <ScrollArea className="flex-1 w-full">
          <div style={{ minWidth: totalMinWidth }}>
            <RoadmapTimelineHeader periods={periods} zoom={config.zoom} />
            <div className="relative">
              {renderGridlines()}
              {todayPosition !== null && config.showToday && <RoadmapTodayMarker position={todayPosition} />}
              {groups.map(group => (
                <div key={group.key}>
                  <div style={{ height: 50, background: '#FAFBFC', borderBottom: '1px solid var(--bd-default, #E2E8F0)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', paddingLeft: 16, lineHeight: '36px' }}>
                      {group.label}
                    </span>
                  </div>
                  {group.isExpanded && group.items.map(renderRow)}
                </div>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  // Flat view
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg-app, #FFFFFF)' }}>
      <ScrollArea className="flex-1 w-full">
        <div style={{ minWidth: totalMinWidth }}>
          <RoadmapTimelineHeader periods={periods} zoom={config.zoom} />
          <div className="relative">
            {renderGridlines()}
            {todayPosition !== null && config.showToday && <RoadmapTodayMarker position={todayPosition} />}
            {items.map(renderRow)}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
