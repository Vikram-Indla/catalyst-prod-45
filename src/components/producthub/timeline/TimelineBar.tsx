// =====================================================
// TIMELINE BAR — Individual Gantt bar with type-colored gradients
// =====================================================

import React, { useState, useCallback, useRef } from 'react';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { STATUS_CONFIG, DENSITY_MAP } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { getBarPosition, isOverdue } from './timelineUtils';
import { TimelineBarTooltip } from './TimelineBarTooltip';
import { TimelineContextMenu } from './TimelineContextMenu';
// Type concept removed — Business Request uses single brand color.
const getTypeColor = (_key?: string | null) => ({ hex: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', border: '#1D4ED8', gradient: 'linear-gradient(90deg, #2563EB, #3B82F6)' });

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
  const typeColor = getTypeColor(initiative.initiative_type_key);

  const topOffset = (rowHeight - barHeight) / 2;

  // Use type color for bar, override with red for overdue
  const bgGradient = overdue ? 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))' : typeColor.gradient;
  const fillColor = overdue ? 'rgba(239,68,68,0.25)' : `${typeColor.hex}33`;
  const borderColor = overdue ? '#EF4444' : typeColor.border;

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 310;
    const tooltipHeight = 180;
    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - 8;
    if (y < 60) y = rect.bottom + 8;
    if (x < 10) x = 10;
    if (x + tooltipWidth > window.innerWidth - 10) x = window.innerWidth - tooltipWidth - 10;
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
    background: bgGradient,
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
        {/* Progress fill */}
        {initiative.progress > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0, top: 0, bottom: 0,
              width: `${Math.min(100, initiative.progress)}%`,
              background: fillColor,
              borderRadius: '6px 0 0 6px',
              zIndex: 0,
            }}
          />
        )}

        {/* Label */}
        {width >= 120 && (
          <span
            style={{
              zIndex: 1,
              fontSize: '12px',
              fontWeight: 600,
              color: '#fff',
              paddingLeft: '8px',
              paddingRight: '8px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: `${barHeight}px`,
              pointerEvents: 'none',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {initiative.title}
          </span>
        )}
      </div>

      {showTooltip && (
        <TimelineBarTooltip initiative={initiative} position={tooltipPos} isVisible={showTooltip} />
      )}

      {contextMenu && (
        <TimelineContextMenu initiative={initiative} x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </>
  );
};

export default TimelineBar;
