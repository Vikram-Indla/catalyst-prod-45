/**
 * Calendar Grid Component
 * Main calendar with time columns and release bars
 * Catalyst V5 Color Compliant
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CalendarRelease, TimeScale, CATALYST_COLORS } from '../types';
import { ReleaseBar } from './ReleaseBar';
import { 
  getColumnHeaders, 
  calculateBarPosition, 
  getTodayPosition,
  detectOverlappingReleases,
} from '../utils/calendarUtils';

interface CalendarGridProps {
  releases: CalendarRelease[];
  viewStart: Date;
  viewEnd: Date;
  scale: TimeScale;
  showDependencies?: boolean;
  onReleaseClick?: (release: CalendarRelease) => void;
}

const ROW_HEIGHT = 72; // Height per release row

export function CalendarGrid({
  releases,
  viewStart,
  viewEnd,
  scale,
  showDependencies = false,
  onReleaseClick,
}: CalendarGridProps) {
  const columns = useMemo(() => getColumnHeaders(viewStart, viewEnd, scale), [viewStart, viewEnd, scale]);
  const todayPosition = useMemo(() => getTodayPosition(viewStart, viewEnd), [viewStart, viewEnd]);
  
  // Calculate row assignments to prevent overlap
  const rowAssignments = useMemo(() => detectOverlappingReleases(releases), [releases]);
  const maxRow = Math.max(0, ...rowAssignments.map(r => r.row));
  
  // Calculate bar positions
  const releasesWithPositions = useMemo(() => {
    return releases.map(release => {
      const row = rowAssignments.find(r => r.releaseId === release.id)?.row ?? 0;
      const position = calculateBarPosition(
        new Date(release.startDate),
        new Date(release.targetDate),
        viewStart,
        viewEnd
      );
      return { release, position, row };
    });
  }, [releases, rowAssignments, viewStart, viewEnd]);

  return (
    <div className="bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] rounded-xl border border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] overflow-hidden">
      {/* Column Headers */}
      <div 
        className="grid border-b border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]"
        style={{ gridTemplateColumns: `120px repeat(${columns.length}, 1fr)` }}
      >
        <div className="p-3 bg-slate-50 dark:bg-[#111111] border-r border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]">
          <span className="text-xs font-medium text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #A1A1A1))] uppercase">Release</span>
        </div>
        {columns.map((col, i) => (
          <div
            key={i}
            className={cn(
              "p-3 text-center border-r border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] last:border-r-0",
              col.isWeekend ? "bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #f8fafc))] dark:bg-[#111111]" : "bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))]"
            )}
          >
            <span className="text-xs font-medium text-slate-600 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #A1A1A1))]">{col.label}</span>
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="relative">
        {/* Today Line */}
        {todayPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
            style={{
              left: `calc(120px + ${todayPosition}% * (100% - 120px) / 100)`,
              backgroundColor: CATALYST_COLORS.danger,
            }}
          >
            <div 
              className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: CATALYST_COLORS.danger }}
            >
              Today
            </div>
          </div>
        )}

        {/* Grid Lines */}
        <div 
          className="grid absolute inset-0 pointer-events-none"
          style={{ gridTemplateColumns: `120px repeat(${columns.length}, 1fr)` }}
        >
          <div className="border-r border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]" />
          {columns.map((col, i) => (
            <div
              key={i}
              className={cn(
                "border-r border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] last:border-r-0",
                col.isWeekend && "bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #f8fafc))] dark:bg-[#111111]"
              )}
            />
          ))}
        </div>

        {/* Release Rows */}
        <div style={{ minHeight: `${(maxRow + 1) * ROW_HEIGHT + 40}px` }}>
          {releasesWithPositions.map(({ release, position, row }) => (
            <div
              key={release.id}
              className="absolute"
              style={{
                left: '120px',
                right: 0,
                top: `${row * ROW_HEIGHT + 12}px`,
                height: `${ROW_HEIGHT - 8}px`,
              }}
            >
              <ReleaseBar
                release={release}
                position={position}
                onClick={() => onReleaseClick?.(release)}
              />
            </div>
          ))}
        </div>

        {/* Release Labels (Left Column) */}
        <div 
          className="absolute left-0 top-0 w-[120px] bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] border-r border-slate-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))]"
          style={{ height: `${(maxRow + 1) * ROW_HEIGHT + 40}px` }}
        >
          {releasesWithPositions.map(({ release, row }) => (
            <div
              key={release.id}
              className="absolute left-0 right-0 px-3 py-2 flex flex-col justify-center"
              style={{
                top: `${row * ROW_HEIGHT + 12}px`,
                height: `${ROW_HEIGHT - 8}px`,
              }}
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] truncate">
                {release.version}
              </span>
              <span className="text-xs text-slate-500 truncate">
                {release.healthScore}%
              </span>
              <span 
                className="text-xs capitalize"
                style={{ color: CATALYST_COLORS[release.healthLevel === 'healthy' ? 'teal' : release.healthLevel === 'critical' ? 'danger' : 'warning'] }}
              >
                {release.healthLevel.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {releases.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-slate-500 dark:text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #A1A1A1))]">No releases in this time period</p>
        </div>
      )}
    </div>
  );
}
