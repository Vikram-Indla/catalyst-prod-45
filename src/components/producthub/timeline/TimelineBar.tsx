// =====================================================
// TIMELINE BAR — Individual Gantt bar with type-colored gradients
// =====================================================

import React, { useState, useCallback, useRef } from 'react';
import type { TimelineRequest } from '@/types/producthub/request';
import { STATUS_CONFIG, DENSITY_MAP } from '@/types/producthub/request';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { getBarPosition, isOverdue } from './timelineUtils';
import { TimelineBarTooltip } from './TimelineBarTooltip';
import { TimelineContextMenu } from './TimelineContextMenu';
// Type concept removed — Business Request uses single brand color.
const getTypeColor = () => ({ hex: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', bg: 'var(--ds-background-selected, var(--ds-background-selected, #EFF6FF))', text: '#1E40AF', border: 'var(--ds-background-brand-bold-hovered, var(--ds-background-brand-bold-hovered, #1D4ED8))', gradient: 'linear-gradient(90deg, var(--ds-text-brand, #2563EB), var(--ds-text-brand, #3B82F6))' });

interface TimelineBarProps {
  request: TimelineRequest;
  rowIndex: number;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({ request, rowIndex }) => {
  const { granularity, density, openDetail } = useTimelineState();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const { row: rowHeight, bar: barHeight } = DENSITY_MAP[density];
  const { left, width } = getBarPosition(request, granularity);
  const overdue = isOverdue(request);
  const statusCfg = STATUS_CONFIG[request.status];
  const typeColor = getTypeColor();

  const topOffset = (rowHeight - barHeight) / 2;

  // Use type color for bar, override with red for overdue
  const bgGradient = overdue ? 'linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))' : typeColor.gradient;
  const fillColor = overdue ? 'rgba(239,68,68,0.25)' : `${typeColor.hex}33`;
  const borderColor = overdue ? 'var(--ds-text-danger, var(--ds-text-danger, #EF4444))' : typeColor.border;

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
    openDetail(request.id);
  }, [request.id, openDetail]);

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
        data-bar-id={request.id}
        style={barStyle}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') handleClick(); }}
        aria-label={`${request.initiative_key}: ${request.title}`}
      >
        {/* Progress fill */}
        {request.progress > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0, top: 0, bottom: 0,
              width: `${Math.min(100, request.progress)}%`,
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
              color: 'var(--ds-surface, var(--ds-surface, var(--ds-surface, #fff)))',
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
            {request.title}
          </span>
        )}
      </div>

      {showTooltip && (
        <TimelineBarTooltip request={request} position={tooltipPos} isVisible={showTooltip} />
      )}

      {contextMenu && (
        <TimelineContextMenu request={request} x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />
      )}
    </>
  );
};

export default TimelineBar;
