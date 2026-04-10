/**
 * Epic Roadmap – Gantt-style timeline for program epics.
 * Reuses enterprise-roadmap utilities (bar metrics, timeline periods, today marker).
 */
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  generateTimelinePeriods,
  calculateBarMetrics,
  calculateTodayPosition,
  formatRoadmapDate,
} from '@/components/enterprise-roadmap/utils';
import type { TimeScale } from '@/components/enterprise-roadmap/types';
import { startOfYear, endOfYear, addYears, addMonths, format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  Calendar,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { EpicDetailModal } from '@/components/items/epics/EpicDetailModal';

/* ---------- types ---------- */
interface EpicRow {
  id: string;
  name: string;
  epic_key: string | null;
  state: string | null;
  status: string | null;
  health: string | null;
  owner_id: string | null;
  theme_id: string | null;
  primary_program_id: string | null;
  start_date: string | null;
  end_date: string | null;
  target_completion_date: string | null;
  points_estimate: number | null;
}

/* ---------- helpers ---------- */
const ROW_HEIGHT = 48;
const BAR_HEIGHT = 28;
const LABEL_WIDTH = 280;

const stateColor = (state: string | null) => {
  switch (state) {
    case 'in_progress':
      return {
        bg: 'bg-[hsl(var(--status-info-bg))]',
        fill: 'bg-[hsl(var(--status-info))]',
        border: 'border-l-[hsl(var(--status-info))]',
        text: 'text-[hsl(var(--status-info))]',
      };
    case 'done':
      return {
        bg: 'bg-[hsl(var(--status-success-bg))]',
        fill: 'bg-[hsl(var(--status-success))]',
        border: 'border-l-[hsl(var(--status-success))]',
        text: 'text-[hsl(var(--status-success))]',
      };
    case 'blocked':
      return {
        bg: 'bg-[hsl(var(--status-danger-bg))]',
        fill: 'bg-[hsl(var(--status-danger))]',
        border: 'border-l-[hsl(var(--status-danger))]',
        text: 'text-[hsl(var(--status-danger))]',
      };
    default:
      return {
        bg: 'bg-muted',
        fill: 'bg-muted-foreground/40',
        border: 'border-l-muted-foreground',
        text: 'text-muted-foreground',
      };
  }
};

const stateLabel: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
};

/* ---------- component ---------- */
interface EpicRoadmapProps {
  programId?: string;
}

export function EpicRoadmap({ programId }: EpicRoadmapProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('quarterly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  /* --- data --- */
  const { data: epics = [], isLoading } = useQuery({
    queryKey: ['epic-roadmap', programId],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select('*')
        .is('deleted_at', null)
        .is('parked_at', null)
        .order('global_rank');

      if (programId) {
        // check if it's a valid program
        const { data: prog, error: progError } = await supabase
          .from('programs')
          .select('id')
          .eq('id', programId)
          .maybeSingle();
        if (progError) throw progError;
        if (prog) {
          query = query.eq('primary_program_id', programId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as EpicRow[];
    },
  });

  /* --- derived --- */
  const filtered = useMemo(() => {
    if (!search) return epics;
    const q = search.toLowerCase();
    return epics.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.epic_key || '').toLowerCase().includes(q),
    );
  }, [epics, search]);

  const timelineStart = useMemo(
    () => startOfYear(new Date(selectedYear, 0, 1)),
    [selectedYear],
  );
  const timelineEnd = useMemo(() => {
    if (timeScale === 'yearly') return endOfYear(addYears(timelineStart, 2));
    return endOfYear(timelineStart);
  }, [timelineStart, timeScale]);

  const periods = useMemo(() => {
    const count =
      timeScale === 'monthly' ? 12 : timeScale === 'quarterly' ? 4 : 3;
    return generateTimelinePeriods(timeScale, timelineStart, count);
  }, [timeScale, timelineStart]);

  /* --- resize --- */
  useEffect(() => {
    const update = () => {
      if (timelineRef.current) {
        setContainerWidth(Math.max(timelineRef.current.clientWidth, 900));
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* --- sync scroll --- */
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (labelsRef.current) {
      labelsRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
    }
  };

  const todayPos = useMemo(
    () =>
      calculateTodayPosition(
        new Date(),
        timelineStart,
        timelineEnd,
        containerWidth,
      ),
    [timelineStart, timelineEnd, containerWidth],
  );

  /* --- selected epic for drawer --- */
  const selectedEpic = useMemo(
    () => (selectedEpicId ? epics.find((e) => e.id === selectedEpicId) ?? null : null),
    [selectedEpicId, epics],
  );

  /* --- render --- */
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-surface-subtle">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-brand-primary" />
          <span className="text-sm font-semibold text-foreground">
            Epic Roadmap
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            {filtered.length} epic{filtered.length !== 1 && 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-7 w-40 text-xs bg-muted/50 border-transparent rounded"
            />
          </div>

          {/* Scale */}
          <Select
            value={timeScale}
            onValueChange={(v) => setTimeScale(v as TimeScale)}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          {/* Year nav */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedYear((y) => y - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium text-foreground w-10 text-center">
              {selectedYear}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedYear((y) => y + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Body – labels + chart */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left label panel */}
        <div
          ref={labelsRef}
          className="flex-shrink-0 overflow-hidden border-r border-border"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header */}
          <div className="h-10 flex items-center px-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
            Epic
          </div>

          {/* Rows */}
          <div className="overflow-hidden">
            {filtered.map((epic) => {
              const colors = stateColor(epic.state);
              return (
                <div
                  key={epic.id}
                  className={cn(
                    'flex items-center gap-2 px-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors',
                    selectedEpicId === epic.id && 'bg-muted',
                  )}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => setSelectedEpicId(epic.id)}
                >
                  <span className={cn('text-[10px] font-mono', colors.text)}>
                    {epic.epic_key || '—'}
                  </span>
                  <span className="text-sm text-foreground truncate flex-1">
                    {epic.name}
                  </span>
                  <span
                    className={cn(
                      'inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase whitespace-nowrap',
                      colors.bg,
                      colors.text,
                    )}
                  >
                    {stateLabel[epic.state || 'not_started'] || epic.state}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right timeline panel */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
          onScroll={handleTimelineScroll}
        >
          <div
            className="min-w-[900px] relative"
            style={{ width: containerWidth }}
          >
            {/* Period header */}
            <div className="sticky top-0 z-20 flex h-10 bg-muted/50 border-b border-border">
              {periods.map((p) => (
                <div
                  key={p.key}
                  className={cn(
                    'flex-1 flex items-center justify-center border-r border-border/50 last:border-r-0 text-xs font-medium text-foreground',
                    p.isCurrent && 'bg-brand-primary/5',
                  )}
                >
                  {p.label}
                  {p.year && (
                    <span className="ml-1 text-muted-foreground">
                      {p.year}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div
              className="relative"
              style={{ height: filtered.length * ROW_HEIGHT }}
            >
              {/* Vertical grid */}
              {periods.map((p, i) => (
                <div
                  key={`g-${p.key}`}
                  className="absolute top-0 bottom-0 border-r border-border/30"
                  style={{ left: `${((i + 1) / periods.length) * 100}%` }}
                />
              ))}

              {/* Horizontal row lines */}
              {filtered.map((_, i) => (
                <div
                  key={`r-${i}`}
                  className="absolute left-0 right-0 border-b border-border/30"
                  style={{ top: (i + 1) * ROW_HEIGHT }}
                />
              ))}

              {/* Today line */}
              {todayPos !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[hsl(var(--status-danger))] z-30 pointer-events-none"
                  style={{ left: todayPos }}
                >
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[hsl(var(--status-danger))] text-white">
                    Today
                  </div>
                </div>
              )}

              {/* Bars */}
              {filtered.map((epic, idx) => {
                const start = epic.start_date
                  ? new Date(epic.start_date)
                  : addMonths(timelineStart, 1);
                const end = epic.end_date
                  ? new Date(epic.end_date)
                  : epic.target_completion_date
                  ? new Date(epic.target_completion_date)
                  : addMonths(start, 3);

                const metrics = calculateBarMetrics(
                  start,
                  end,
                  timelineStart,
                  timelineEnd,
                  containerWidth,
                );
                if (!metrics.visible) return null;

                const colors = stateColor(epic.state);
                const isSelected = selectedEpicId === epic.id;

                return (
                  <div
                    key={epic.id}
                    className="absolute left-0 right-0"
                    style={{ top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    <div
                      className={cn(
                        'absolute group cursor-pointer rounded-md overflow-hidden border-l-4 transition-all duration-150',
                        colors.border,
                        isSelected && 'ring-2 ring-brand-primary ring-offset-1',
                      )}
                      style={{
                        left: metrics.left,
                        width: metrics.width,
                        top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                        height: BAR_HEIGHT,
                      }}
                      onClick={() => setSelectedEpicId(epic.id)}
                    >
                      {/* Background */}
                      <div
                        className={cn(
                          'absolute inset-0',
                          colors.bg,
                          'group-hover:brightness-95 transition-all',
                        )}
                      />
                      {/* Label */}
                      <div className="relative h-full flex items-center px-2 gap-1.5">
                        {metrics.width > 100 && (
                          <span className="text-xs font-medium text-foreground truncate">
                            {epic.name}
                          </span>
                        )}
                        {metrics.width > 60 && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-auto">
                            {format(start, 'MMM d')} – {format(end, 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Epic Detail Modal */}
      {selectedEpic && (
        <EpicDetailModal
          epicId={selectedEpic.id}
          isOpen={!!selectedEpic}
          onClose={() => setSelectedEpicId(null)}
        />
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No epics with date ranges found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
