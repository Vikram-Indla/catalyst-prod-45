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
          'cursor-pointer transition-shadow duration-150',
          isHovered && 'z-10'
        )}
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          left,
          top: topOffset,
          width,
          height: barHeight,
          borderRadius: 6,
          backgroundColor: bgColor,
          borderLeft: `${isHovered ? 4 : 3}px solid ${borderColor}`,
          boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
          overflow: 'hidden',
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
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, initiative.progress)}%`,
              background: fillColor,
              borderRadius: '6px 0 0 6px',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        {/* Text label — only when bar wide enough */}
        {width >= 120 && (
          <span
            style={{
              position: 'relative',
              zIndex: 2,
              fontSize: '12px',
              fontWeight: 500,
              color: '#3f3f46',
              padding: '0 8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {initiative.title}
          </span>
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
