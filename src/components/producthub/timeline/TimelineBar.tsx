// =====================================================
// TIMELINE BAR — Individual Gantt bar with progress
// =====================================================

import React, { useState, useCallback, useRef } from 'react';
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
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const { row: rowHeight, bar: barHeight } = DENSITY_MAP[density];
  const { left, width } = getBarPosition(initiative, granularity);
  const overdue = isOverdue(initiative);
  const statusCfg = STATUS_CONFIG[initiative.status];

  const topOffset = (rowHeight - barHeight) / 2;

  const bgColor = overdue ? 'rgba(239,68,68,0.08)' : statusCfg.bg;
  const fillColor = overdue ? 'rgba(239,68,68,0.25)' : statusCfg.fill;
  const borderColor = overdue ? '#EF4444' : statusCfg.color;

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    // Calculate tooltip position from viewport coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 310;
    const tooltipHeight = 180;

    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - 8;

    // Flip below if too close to top
    if (y < 60) y = rect.bottom + 8;

    // Clamp horizontal
    if (x < 10) x = 10;
    if (x + tooltipWidth > window.innerWidth - 10) {
      x = window.innerWidth - tooltipWidth - 10;
    }

    setTooltipPos({ x, y });
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

  const barStyle: React.CSSProperties = {
    position: 'absolute',
    left,
    top: topOffset,
    width,
    height: barHeight,
    borderRadius: 6,
    borderLeft: `${isHovered ? 4 : 3}px solid ${borderColor}`,
    background: bgColor,
    cursor: 'pointer',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    isolation: 'isolate',
    boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
    transition: 'box-shadow 0.15s',
  };

  return (
    <>
      <div
        data-bar-id={initiative.id}
        style={barStyle}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') handleClick(); }}
        aria-label={`${initiative.initiative_key}: ${initiative.title}`}
      >
        {/* Progress fill — absolute background layer, z-index 0 */}
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
              zIndex: 0,
            }}
          />
        )}

        {/* Label — normal flex child, z-index 1 (above fill) */}
        {width >= 120 && (
          <span
            style={{
              zIndex: 1,
              fontSize: '12px',
              fontWeight: 500,
              color: '#3f3f46',
              paddingLeft: '8px',
              paddingRight: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: `${barHeight}px`,
              pointerEvents: 'none',
            }}
          >
            {initiative.title}
          </span>
        )}
      </div>

      {/* Tooltip — portal to body */}
      {showTooltip && (
        <TimelineBarTooltip
          initiative={initiative}
          position={tooltipPos}
          isVisible={showTooltip}
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
