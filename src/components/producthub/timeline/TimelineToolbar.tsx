// =====================================================
// TIMELINE TOOLBAR — Granularity, Group By, Zoom, Density, View Switcher
// =====================================================

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import type { Granularity, GroupByOption } from '@/types/producthub/initiative';
import { Calendar, Minus, Plus, AlignJustify, Table, Kanban, GanttChart, LayoutGrid, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const GRANULARITY_ORDER: Granularity[] = ['quarter', 'month', 'week', 'day'];

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'department', label: 'Department' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
];

const VIEW_MODES = [
  { key: 'table', label: 'Table', icon: Table, path: '/producthub/backlog' },
  { key: 'board', label: 'Board', icon: Kanban, path: '/producthub/kanban' },
  { key: 'timeline', label: 'Timeline', icon: GanttChart, path: '/producthub/roadmap' },
  { key: 'cards', label: 'Cards', icon: LayoutGrid, path: '/producthub/backlog?view=cards' },
];

export const TimelineToolbar: React.FC = () => {
  const navigate = useNavigate();
  const { granularity, setGranularity, groupBy, setGroupBy, cycleDensity } = useTimelineState();

  const activeGroupLabel = GROUP_OPTIONS.find(g => g.value === groupBy)?.label ?? 'None';

  const granIdx = GRANULARITY_ORDER.indexOf(granularity);
  const canZoomIn = granIdx < GRANULARITY_ORDER.length - 1;
  const canZoomOut = granIdx > 0;

  const handleZoomIn = useCallback(() => {
    if (canZoomIn) setGranularity(GRANULARITY_ORDER[granIdx + 1]);
  }, [canZoomIn, granIdx, setGranularity]);

  const handleZoomOut = useCallback(() => {
    if (canZoomOut) setGranularity(GRANULARITY_ORDER[granIdx - 1]);
  }, [canZoomOut, granIdx, setGranularity]);

  const handleToday = useCallback(() => {
    // Dispatch a custom event that TimelineGrid listens for
    window.dispatchEvent(new CustomEvent('timeline-scroll-today'));
  }, []);

  return (
    <div className="h-[52px] bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* LEFT */}
      <div className="flex items-center gap-2">
        {/* Granularity segmented control */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          {GRANULARITIES.map(g => (
            <button
              key={g.value}
              onClick={() => setGranularity(g.value)}
              className={cn(
                'px-3 py-1.5 text-[13px] rounded-md transition-all duration-150 font-medium',
                granularity === g.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Group By dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
              <span>Group: {activeGroupLabel}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {GROUP_OPTIONS.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setGroupBy(opt.value)}
                className={cn(
                  'text-[13px]',
                  groupBy === opt.value && 'bg-accent font-medium'
                )}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Today button */}
        <button
          onClick={handleToday}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Today</span>
        </button>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        {/* Zoom */}
        <button
          onClick={handleZoomOut}
          disabled={!canZoomOut}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
            canZoomOut
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
              : 'text-muted-foreground/30 cursor-not-allowed'
          )}
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomIn}
          disabled={!canZoomIn}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
            canZoomIn
              ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
              : 'text-muted-foreground/30 cursor-not-allowed'
          )}
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Density */}
        <button
          onClick={cycleDensity}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Toggle density"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        {/* View switcher */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          {VIEW_MODES.map(v => (
            <button
              key={v.key}
              onClick={() => navigate(v.path)}
              className={cn(
                'px-2.5 py-1.5 text-[13px] rounded-md transition-all duration-150 flex items-center gap-1.5 font-medium',
                v.key === 'timeline'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <v.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineToolbar;
