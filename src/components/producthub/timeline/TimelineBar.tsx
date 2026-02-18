// =====================================================
// TIMELINE BAR — Individual Gantt bar with progress
// =====================================================

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { STATUS_CONFIG, DENSITY_MAP } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { getBarPosition, isOverdue } from './timelineUtils';
import { TimelineBarTooltip } from './TimelineBarTooltip';
import { TimelineContextMenu } from './TimelineContextMenu';

interface TimelineBarProps {
  initiative: TimelineInitiative;
  rowIndex: number;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({ initiative, rowIndex }) => {
  const { granularity, density, openDetail } = useTimelineState();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();
  const barRef = useRef<HTMLDivElement>(null);

  const { row: rowHeight, bar: barHeight } = DENSITY_MAP[density];
  const { left, width } = getBarPosition(initiative, granularity);
  const overdue = isOverdue(initiative);
  const statusCfg = STATUS_CONFIG[initiative.status];

  const topOffset = (rowHeight - barHeight) / 2;

  const bgColor = overdue ? 'rgba(239,68,68,0.08)' : statusCfg.bg;
  const fillColor = overdue ? 'rgba(239,68,68,0.25)' : statusCfg.fill;
  const borderColor = overdue ? '#EF4444' : statusCfg.color;

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, []);

  const handleClick = useCallback(() => {
    openDetail(initiative.id);
  }, [initiative.id, openDetail]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTooltip(false);
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <div
        ref={barRef}
        data-bar-id={initiative.id}
        className={cn(
          'absolute cursor-pointer transition-shadow duration-150',
          isHovered && 'z-10'
        )}
        style={{
          left,
          top: topOffset,
          width,
          height: barHeight,
          borderRadius: 6,
          backgroundColor: bgColor,
          borderLeft: `${isHovered ? 4 : 3}px solid ${borderColor}`,
          boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') handleClick(); }}
        aria-label={`${initiative.initiative_key}: ${initiative.title}`}
      >
        {/* Progress fill */}
        {initiative.progress > 0 && (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.min(100, initiative.progress)}%`,
              backgroundColor: fillColor,
              borderRadius: '4px 0 0 4px',
            }}
          />
        )}

        {/* Text label — only when bar wide enough */}
        {width >= 120 && (
          <div
            className="absolute inset-0 flex items-center px-2 pointer-events-none"
            style={{ paddingLeft: 8 }}
          >
            <span className="text-[12px] font-medium text-foreground/80 truncate">
              {initiative.title}
            </span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && barRef.current && (
        <TimelineBarTooltip
          initiative={initiative}
          style={{
            left: left + width / 2 - 170,
            top: topOffset - 8,
            transform: 'translateY(-100%)',
          }}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <TimelineContextMenu
          initiative={initiative}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};

export default TimelineBar;
