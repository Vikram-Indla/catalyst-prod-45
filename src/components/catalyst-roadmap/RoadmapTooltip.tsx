/**
 * Roadmap Tooltip - Hover tooltip
 */

import React from 'react';
import { format } from 'date-fns';
import type { RoadmapObjective } from '@/types/roadmap';
import { STATUS_COLORS } from '@/types/roadmap';
import { getStatusLabel } from '@/lib/roadmap-utils';

interface RoadmapTooltipProps {
  objective: RoadmapObjective | null;
  position: { x: number; y: number } | null;
}

export function RoadmapTooltip({ objective, position }: RoadmapTooltipProps) {
  if (!objective || !position) return null;

  const statusColor = STATUS_COLORS[objective.status];

  return (
    <div 
      className="fixed bg-text-primary text-white p-3 rounded-xl text-[11px] max-w-[260px] shadow-xl z-[1000] pointer-events-none animate-in fade-in duration-150"
      style={{
        left: position.x + 12,
        top: position.y + 12,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <span className="font-semibold flex-1 leading-tight">{objective.name}</span>
        <span 
          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
          style={{ backgroundColor: statusColor }}
        >
          {getStatusLabel(objective.status)}
        </span>
      </div>

      {/* Meta */}
      <div className="flex gap-4 mb-2.5">
        <div className="flex flex-col">
          <span className="text-[9px] text-text-muted uppercase tracking-wide">Owner</span>
          <span className="text-[11px] font-medium">{objective.owner}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] text-text-muted uppercase tracking-wide">Duration</span>
          <span className="text-[11px] font-medium">
            {format(new Date(objective.start), 'MMM d')} - {format(new Date(objective.end), 'MMM d')}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full"
            style={{ 
              width: `${objective.prog}%`,
              backgroundColor: statusColor,
            }}
          />
        </div>
        <span className="text-xs font-bold min-w-[32px] text-right">{objective.prog}%</span>
      </div>
    </div>
  );
}
