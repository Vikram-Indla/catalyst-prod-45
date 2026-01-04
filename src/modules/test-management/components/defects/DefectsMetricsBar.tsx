/**
 * Defects Metrics Bar Component
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface DefectsMetricsBarProps {
  total: number;
  open: number;
  inProgress: number;
  fixed: number;
  closed: number;
  severityCounts: {
    critical: number;
    major: number;
    minor: number;
    trivial: number;
  };
}

export function DefectsMetricsBar({
  total,
  open,
  inProgress,
  fixed,
  closed,
  severityCounts,
}: DefectsMetricsBarProps) {
  const openPercent = total > 0 ? Math.round((open / total) * 100) : 0;
  const inProgressPercent = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const fixedPercent = total > 0 ? Math.round((fixed / total) * 100) : 0;
  const closedPercent = total > 0 ? Math.round((closed / total) * 100) : 0;

  const severityTotal = severityCounts.critical + severityCounts.major + severityCounts.minor + severityCounts.trivial;

  return (
    <div className="space-y-4">
      {/* Status counts */}
      <div className="flex items-center gap-0.5 rounded-lg border bg-card overflow-hidden">
        <div className="flex-1 text-center py-3 px-4 border-r">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="flex-1 text-center py-3 px-4 border-r">
          <div className="text-2xl font-bold text-danger">{open}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-danger" />
            Open {openPercent}%
          </div>
        </div>
        <div className="flex-1 text-center py-3 px-4 border-r">
          <div className="text-2xl font-bold text-info">{inProgress}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-info" />
            In Progress {inProgressPercent}%
          </div>
        </div>
        <div className="flex-1 text-center py-3 px-4 border-r">
          <div className="text-2xl font-bold text-teal-600">{fixed}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-600" />
            Fixed {fixedPercent}%
          </div>
        </div>
        <div className="flex-1 text-center py-3 px-4">
          <div className="text-2xl font-bold text-muted-foreground">{closed}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground" />
            Closed {closedPercent}%
          </div>
        </div>
      </div>

      {/* Severity breakdown bar */}
      {severityTotal > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden flex">
            {severityCounts.critical > 0 && (
              <div 
                className="bg-danger h-full" 
                style={{ width: `${(severityCounts.critical / severityTotal) * 100}%` }} 
              />
            )}
            {severityCounts.major > 0 && (
              <div 
                className="bg-warning h-full" 
                style={{ width: `${(severityCounts.major / severityTotal) * 100}%` }} 
              />
            )}
            {severityCounts.minor > 0 && (
              <div 
                className="bg-yellow-400 h-full" 
                style={{ width: `${(severityCounts.minor / severityTotal) * 100}%` }} 
              />
            )}
            {severityCounts.trivial > 0 && (
              <div 
                className="bg-muted-foreground/50 h-full" 
                style={{ width: `${(severityCounts.trivial / severityTotal) * 100}%` }} 
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-danger" />
              Critical: {severityCounts.critical}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Major: {severityCounts.major}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Minor: {severityCounts.minor}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              Trivial: {severityCounts.trivial}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
