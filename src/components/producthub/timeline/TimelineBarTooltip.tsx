// =====================================================
// TIMELINE BAR TOOLTIP — Rich hover tooltip
// =====================================================

import React from 'react';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { STATUS_CONFIG, getPriorityFromScore, hashColor, getInitialsFromName } from '@/types/producthub/initiative';
import { format } from 'date-fns';

interface TimelineBarTooltipProps {
  initiative: TimelineInitiative;
  style: React.CSSProperties;
}

export const TimelineBarTooltip: React.FC<TimelineBarTooltipProps> = ({ initiative, style }) => {
  const statusCfg = STATUS_CONFIG[initiative.status];
  const priority = getPriorityFromScore(initiative.computed_score);
  const startStr = initiative.kickoff_date || initiative.business_ask_date;
  const endStr = initiative.target_complete;

  return (
    <div
      className="absolute z-50 bg-card border border-border rounded-xl shadow-lg pointer-events-none max-w-[340px]"
      style={{ ...style, boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}
    >
      <div className="p-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-start gap-2">
          <span
            className="shrink-0 px-1.5 py-0.5 rounded-sm text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {initiative.initiative_key}
          </span>
          <span className="text-[14px] font-semibold text-foreground leading-tight line-clamp-2">
            {initiative.title}
          </span>
        </div>

        {/* Status + Priority badges */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-xl"
            style={{
              backgroundColor: statusCfg.bg,
              color: statusCfg.color,
              borderRadius: 12,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusCfg.color }} />
            {statusCfg.label}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground capitalize">
            {priority} Priority
          </span>
        </div>

        {/* Date range */}
        {(startStr || endStr) && (
          <div
            className="text-[11px] text-muted-foreground"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}
          >
            {startStr ? format(new Date(startStr), 'MMM d, yyyy') : '—'}
            {' → '}
            {endStr ? format(new Date(endStr), 'MMM d, yyyy') : '—'}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Progress</span>
            <span
              className="text-[11px] font-medium text-foreground"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {initiative.progress}%
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${initiative.progress}%`,
                backgroundColor: statusCfg.color,
              }}
            />
          </div>
        </div>

        {/* Footer: assignee + department */}
        {(initiative.assignee_name || initiative.department_name) && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            {initiative.assignee_name && (
              <>
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white shrink-0"
                  style={{ backgroundColor: hashColor(initiative.initiative_key) }}
                >
                  {getInitialsFromName(initiative.assignee_name)}
                </span>
                <span className="text-[12px] text-foreground">{initiative.assignee_name}</span>
              </>
            )}
            {initiative.assignee_name && initiative.department_name && (
              <span className="text-muted-foreground">·</span>
            )}
            {initiative.department_name && (
              <span className="text-[12px] text-muted-foreground">{initiative.department_name}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineBarTooltip;
