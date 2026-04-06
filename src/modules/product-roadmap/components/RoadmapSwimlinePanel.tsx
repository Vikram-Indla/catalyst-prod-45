/**
 * Swimlane View — Groups items by assignee into horizontal swim lanes
 * Each lane shows a header with avatar + name, then Gantt bars for that assignee's items
 */

import React, { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RoadmapTimelineHeader } from './RoadmapTimelineHeader';
import { RoadmapTimelineBar } from './RoadmapTimelineBar';
import { RoadmapTodayMarker } from './RoadmapTodayMarker';
import { generateTimelinePeriods, calculateBarPosition } from '../utils/timeline';
import type { RoadmapDemand, TimelineConfig } from '../types/roadmap';
import { addMonths } from 'date-fns';
import { User } from 'lucide-react';

const AVATAR_COLORS = ['#2563EB', '#6366F1', '#0D9488', '#D97706', '#16A34A', '#0891B2', '#DC2626', 'rgba(237,237,237,0.53)'];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

function resolveBarDates(item: RoadmapDemand): { start: string; end: string; endEstimated: boolean } {
  let startRaw = item.start_date;
  let endRaw = item.end_date;
  let endEstimated = false;
  if (!startRaw) startRaw = new Date().toISOString().split('T')[0];
  if (!endRaw) { endRaw = addMonths(new Date(startRaw), 3).toISOString().split('T')[0]; endEstimated = true; }
  if (new Date(endRaw) < new Date(startRaw)) { const t = startRaw; startRaw = endRaw; endRaw = t; }
  return { start: startRaw, end: endRaw, endEstimated };
}

interface RoadmapSwimlanePanelProps {
  items: RoadmapDemand[];
  config: TimelineConfig;
  selectedItemId: string | null;
  onItemClick: (id: string) => void;
  highContrast?: boolean;
}

export function RoadmapSwimlanePanel({ items, config, selectedItemId, onItemClick, highContrast }: RoadmapSwimlanePanelProps) {
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

  // Group by assignee/owner_name
  const lanes = useMemo(() => {
    const map: Record<string, { name: string; items: RoadmapDemand[] }> = {};
    items.forEach(item => {
      const ownerName = (item as any).owner_name || 'Unassigned';
      const key = ownerName;
      if (!map[key]) map[key] = { name: ownerName, items: [] };
      map[key].items.push(item);
    });
    return Object.entries(map).sort(([a], [b]) => {
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
  }, [items]);

  const hc = highContrast;
  const borderColor = hc ? '#09090B' : 'var(--bd-default, rgba(255,255,255,0.10))';

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
              borderRight: `1px solid ${isQuarterBoundary ? borderColor : '#1A1A1A'}`,
              background: period.isCurrent ? 'rgba(37,99,235,0.03)' : 'transparent',
            }}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg-app, #FFFFFF)' }}>
      <ScrollArea className="flex-1 w-full">
        <div style={{ minWidth: totalMinWidth }}>
          <RoadmapTimelineHeader periods={periods} zoom={config.zoom} />
          <div className="relative">
            {renderGridlines()}
            {todayPosition !== null && config.showToday && <RoadmapTodayMarker position={todayPosition} />}
            
            {lanes.map(([key, lane]) => {
              const isUnassigned = lane.name === 'Unassigned';
              const initials = isUnassigned ? '?' : getInitials(lane.name);
              const avatarColor = isUnassigned ? 'rgba(237,237,237,0.40)' : hashColor(lane.name);
              
              return (
                <div key={key}>
                  {/* Lane Header */}
                  <div
                    className="flex items-center gap-3 px-4"
                    style={{
                      height: 40,
                      background: hc ? '#F0F0F0' : '#FAFBFC',
                      borderBottom: `1px solid ${borderColor}`,
                      borderTop: `1px solid ${borderColor}`,
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        width: 24,
                        height: 24,
                        background: avatarColor,
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {isUnassigned ? <User className="w-3 h-3" /> : initials}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(237,237,237,0.53)' }}>
                      {lane.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'rgba(237,237,237,0.40)',
                        background: '#1A1A1A',
                        borderRadius: 12,
                        padding: '2px 7px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {lane.items.length}
                    </span>
                  </div>

                  {/* Lane Items */}
                  {lane.items.map(item => {
                    const { start, end, endEstimated } = resolveBarDates(item);
                    const position = calculateBarPosition(start, end, config.startDate, config.endDate);
                    const isSelected = selectedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="relative flex items-center cursor-pointer transition-colors"
                        style={{
                          height: 40,
                          backgroundColor: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                          borderBottom: '1px solid #1A1A1A',
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
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: '#2563EB' }} />
                            <span style={{ fontSize: 12, color: 'rgba(237,237,237,0.40)' }}>Outside range</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
