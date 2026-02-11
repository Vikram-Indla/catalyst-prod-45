/**
 * Timeline View — Enterprise Gantt-style timeline
 * Health-colored bars, today marker, milestones, zoom controls, legend
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, addMonths, addWeeks, eachWeekOfInterval, startOfWeek, startOfQuarter, eachQuarterOfInterval, addQuarters, endOfQuarter } from 'date-fns';
import type { Release } from '../types';
import { getHealthLevel, HEALTH_THRESHOLDS } from '../utils/healthScore';
import type { HealthLevel } from '../utils/healthScore';

type ZoomLevel = 'week' | 'month' | 'quarter';

interface TimelineViewProps {
  releases: Release[];
  onReleaseClick?: (release: Release) => void;
}

const HEALTH_BAR_COLORS: Record<HealthLevel, string> = {
  critical: '#ef4444',
  at_risk: '#f97316',
  attention: '#eab308',
  healthy: '#22c55e',
};

const HEALTH_BAR_BG: Record<HealthLevel, string> = {
  critical: 'rgba(239,68,68,0.35)',
  at_risk: 'rgba(249,115,22,0.35)',
  attention: 'rgba(234,179,8,0.35)',
  healthy: 'rgba(34,197,94,0.35)',
};

const VERSION_BADGE_COLORS: Record<HealthLevel, { bg: string; text: string }> = {
  critical: { bg: '#fef2f2', text: '#ef4444' },
  at_risk: { bg: '#fff7ed', text: '#f97316' },
  attention: { bg: '#fefce8', text: '#a16207' },
  healthy: { bg: '#f0fdf4', text: '#16a34a' },
};

export function TimelineView({ releases, onReleaseClick }: TimelineViewProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('month');

  const { columns, rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    let columns: { date: Date; label: string }[] = [];

    switch (zoom) {
      case 'week': {
        start = startOfWeek(addWeeks(now, -1), { weekStartsOn: 1 });
        end = addWeeks(start, 4);
        const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        columns = weeks.map(w => ({ date: w, label: format(w, 'MMM d') }));
        break;
      }
      case 'quarter': {
        start = startOfQuarter(addQuarters(now, -1));
        end = endOfQuarter(addQuarters(now, 3));
        const quarters = eachQuarterOfInterval({ start, end });
        columns = quarters.map(q => ({ date: q, label: `Q${Math.ceil((q.getMonth() + 1) / 3)} ${format(q, 'yyyy')}` }));
        break;
      }
      default: { // month
        start = startOfMonth(addMonths(now, -1));
        end = endOfMonth(addMonths(now, 8));
        const months = eachMonthOfInterval({ start, end });
        columns = months.map(m => ({ date: m, label: format(m, 'MMM yyyy') }));
        break;
      }
    }

    return { columns, rangeStart: start, rangeEnd: end, totalDays: differenceInDays(end, start) };
  }, [zoom]);

  const todayPct = useMemo(() => {
    const now = new Date();
    const offset = differenceInDays(now, rangeStart);
    if (offset < 0 || offset > totalDays) return null;
    return (offset / totalDays) * 100;
  }, [rangeStart, totalDays]);

  const getBarStyle = (release: Release) => {
    const startDate = release.plannedDate
      ? new Date(new Date(release.plannedDate).getTime() - 30 * 24 * 60 * 60 * 1000)
      : new Date();
    const endDate = release.plannedDate ? new Date(release.plannedDate) : addMonths(startDate, 1);

    const startOffset = Math.max(0, differenceInDays(startDate, rangeStart));
    const duration = Math.max(14, differenceInDays(endDate, startDate));
    const left = (startOffset / totalDays) * 100;
    const width = Math.min((duration / totalDays) * 100, 100 - left);

    return { left: `${Math.max(0, left)}%`, width: `${Math.max(2, width)}%` };
  };

  const getMilestones = (release: Release) => {
    if (!release.plannedDate) return [];
    const targetDate = new Date(release.plannedDate);
    const codeFreezeDate = new Date(targetDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const milestones: { date: Date; type: 'code_freeze' | 'go_live'; label: string }[] = [];

    const cfOffset = differenceInDays(codeFreezeDate, rangeStart);
    if (cfOffset >= 0 && cfOffset <= totalDays) {
      milestones.push({ date: codeFreezeDate, type: 'code_freeze', label: `Code Freeze: ${format(codeFreezeDate, 'MMM d, yyyy')}` });
    }

    const glOffset = differenceInDays(targetDate, rangeStart);
    if (glOffset >= 0 && glOffset <= totalDays) {
      milestones.push({ date: targetDate, type: 'go_live', label: `Go Live: ${format(targetDate, 'MMM d, yyyy')}` });
    }

    return milestones;
  };

  const getMilestoneLeft = (date: Date) => {
    return `${(differenceInDays(date, rangeStart) / totalDays) * 100}%`;
  };

  const progressPct = (r: Release) => {
    if (r.metrics.totalTests === 0) return 0;
    return Math.round((r.metrics.passedTests / r.metrics.totalTests) * 100);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
          <div className="flex border border-slate-200 rounded-md overflow-hidden">
            {(['week', 'month', 'quarter'] as ZoomLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setZoom(level)}
                className={cn(
                  "px-3 py-1 text-xs font-medium capitalize transition-colors border-r border-slate-200 last:border-r-0",
                  zoom === level
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[11px]">
            {[
              { label: 'Critical', color: '#ef4444' },
              { label: 'At Risk', color: '#f97316' },
              { label: 'Attention', color: '#eab308' },
              { label: 'Healthy', color: '#22c55e' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                <span className="text-slate-600">{item.label}</span>
              </div>
            ))}
            {[
              { label: 'Code Freeze', color: '#f97316' },
              { label: 'Go Live', color: '#22c55e' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rotate-45" style={{ background: item.color }} />
                <span className="text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Header Row */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="w-[240px] shrink-0 px-4 py-2.5 border-r border-slate-200 flex items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Release ↕</span>
          </div>
          <div className="flex-1 flex">
            {columns.map((col, i) => (
              <div key={i} className="flex-1 px-1 py-2.5 text-center border-r border-slate-100 last:border-r-0">
                <span className="text-[11px] font-semibold text-slate-500">{col.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {releases.map((release) => {
          const barStyle = getBarStyle(release);
          const milestones = getMilestones(release);
          const health = release.healthLevel;
          const fillColor = HEALTH_BAR_COLORS[health];
          const bgColor = HEALTH_BAR_BG[health];
          const vBadge = VERSION_BADGE_COLORS[health];
          const progress = progressPct(release);
          const barWidthNum = parseFloat(barStyle.width);
          const showName = barWidthNum > 10;

          const statusLabel = release.status === 'in_progress' ? 'Development'
            : release.status === 'testing' ? 'Testing'
            : release.status === 'released' ? 'Released'
            : release.status === 'staging' ? 'Staging'
            : release.status === 'cancelled' ? 'Cancelled'
            : 'Planning';

          return (
            <div
              key={release.id}
              className="flex border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 cursor-pointer transition-colors"
              style={{ height: '42px' }}
              onClick={() => onReleaseClick?.(release)}
              role="img"
              aria-label={`Release ${release.version}, ${release.plannedDate ? format(new Date(release.plannedDate), 'MMM d') : 'no date'}, ${progress}% progress, ${health} health`}
            >
              {/* Release Label */}
              <div className="w-[240px] shrink-0 px-3 flex items-center gap-2.5 border-r border-slate-200">
                <div
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 leading-tight"
                  style={{ background: vBadge.bg, color: vBadge.text }}
                >
                  {release.version}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-slate-800 truncate leading-tight">{release.name}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{statusLabel}</div>
                </div>
              </div>

              {/* Bar Area */}
              <div className="flex-1 relative">
                {/* Gridlines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {columns.map((_, i) => (
                    <div key={i} className="flex-1 border-r border-dashed border-slate-100 last:border-r-0" />
                  ))}
                </div>

                {/* Today Marker */}
                {todayPct !== null && (
                  <div
                    className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                    style={{ left: `${todayPct}%` }}
                    aria-label={`Today, ${format(new Date(), 'MMMM d, yyyy')}`}
                  >
                    <div className="w-[2px] h-full bg-red-500 opacity-60" style={{ borderLeft: '1px dashed #ef4444' }} />
                    {releases.indexOf(release) === 0 && (
                      <span className="absolute -top-0 left-1 text-[9px] font-semibold text-red-500">Today</span>
                    )}
                  </div>
                )}

                {/* Gantt Bar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded flex items-center overflow-hidden transition-all hover:brightness-110"
                      style={{
                        left: barStyle.left,
                        width: barStyle.width,
                        height: '24px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      {/* Progress fill */}
                      <div
                        className="h-full absolute inset-y-0 left-0"
                        style={{ width: `${progress}%`, background: fillColor, borderRadius: '4px 0 0 4px' }}
                      />
                      {/* Remaining */}
                      <div
                        className="h-full absolute inset-y-0 right-0"
                        style={{ width: `${100 - progress}%`, background: bgColor, borderRadius: '0 4px 4px 0' }}
                      />
                      {/* Text overlay */}
                      <div className="relative z-[2] flex items-center justify-between w-full px-2">
                        {showName && (
                          <span className="text-[10px] font-medium text-white truncate" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                            {release.name}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-white ml-auto shrink-0" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {progress}%
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    <p className="font-semibold">{release.name} {release.version}</p>
                    <p className="text-muted-foreground">
                      {release.plannedDate ? format(new Date(release.plannedDate), 'MMM d, yyyy') : 'No date'}
                    </p>
                    <p>Progress: {progress}% | Health: {release.healthScore}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Milestones */}
                {milestones.map((m, i) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 z-[4] pointer-events-auto cursor-help"
                        style={{ left: getMilestoneLeft(m.date) }}
                        aria-label={m.label}
                      >
                        <div
                          className="w-[10px] h-[10px] rotate-45"
                          style={{ background: m.type === 'code_freeze' ? '#f97316' : '#22c55e' }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{m.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}

        {releases.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-sm">No releases to display in timeline</div>
        )}
      </div>
    </TooltipProvider>
  );
}
