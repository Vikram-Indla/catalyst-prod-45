/**
 * Timeline bar representing a demand on the timeline
 * Status-colored bars with inline labels and portal tooltip
 */

import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import type { RoadmapDemand } from '../types/roadmap';
import { STATUS_CONFIG } from '../types/roadmap';
import { catalystTokens } from '../lib/design-tokens';
import { useRoadmapTheme } from '../lib/useRoadmapTheme';
import { format, parseISO } from 'date-fns';

// Status-to-bar color mapping
const BAR_STATUS_COLORS: Record<string, { border: string; bg: string; fill: string }> = {
  new_request: { border: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  fill: 'rgba(59,130,246,0.40)' },
  draft:       { border: '#737373', bg: 'rgba(115,115,115,0.15)', fill: 'rgba(115,115,115,0.40)' },
  submitted:   { border: '#3B82F6', bg: 'rgba(59,130,246,0.15)',  fill: 'rgba(59,130,246,0.40)' },
  in_review:   { border: '#8B5CF6', bg: 'rgba(139,92,246,0.15)', fill: 'rgba(139,92,246,0.40)' },
  approved:    { border: '#06B6D4', bg: 'rgba(6,182,212,0.15)',   fill: 'rgba(6,182,212,0.40)' },
  in_progress: { border: '#F59E0B', bg: 'rgba(245,158,11,0.15)', fill: 'rgba(245,158,11,0.40)' },
  completed:   { border: '#10B981', bg: 'rgba(16,185,129,0.15)', fill: 'rgba(16,185,129,0.40)' },
  rejected:    { border: '#EF4444', bg: 'rgba(239,68,68,0.15)',  fill: 'rgba(239,68,68,0.40)' },
  cancelled:   { border: '#EF4444', bg: 'rgba(239,68,68,0.15)',  fill: 'rgba(239,68,68,0.40)' },
};

const DEFAULT_BAR_COLOR = { border: '#6B7280', bg: 'rgba(107,114,128,0.15)', fill: 'rgba(107,114,128,0.40)' };

function getBarColors(status: string | null) {
  if (!status) return DEFAULT_BAR_COLOR;
  const key = status.toLowerCase().replace(/ /g, '_');
  return BAR_STATUS_COLORS[key] || DEFAULT_BAR_COLOR;
}

interface RoadmapTimelineBarProps {
  item: RoadmapDemand;
  left: number; // percentage
  width: number; // percentage
  isSelected: boolean;
  onClick: () => void;
}

export function RoadmapTimelineBar({
  item,
  left,
  width,
  isSelected,
  onClick,
}: RoadmapTimelineBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const barColors = getBarColors(item.process_step);

  // Check overdue: end_date < today, progress < 100, not completed/cancelled
  const isOverdue = (() => {
    if (!item.end_date) return false;
    if (['completed', 'cancelled'].includes(item.process_step || '')) return false;
    if (item.progress >= 100) return false;
    return new Date(item.end_date) < new Date();
  })();

  const borderColor = isOverdue ? '#EF4444' : barColors.border;
  const bgColor = isOverdue ? 'rgba(239,68,68,0.08)' : barColors.bg;
  const fillColor = isOverdue ? 'rgba(239,68,68,0.25)' : barColors.fill;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    try { return format(parseISO(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
  };

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const tw = 310, th = 180;
    let x = rect.left + rect.width / 2 - tw / 2;
    let y = rect.top - th - 8;
    if (y < 60) y = rect.bottom + 8;
    if (x < 10) x = 10;
    if (x + tw > window.innerWidth - 10) x = window.innerWidth - tw - 10;
    setTooltipPos({ x, y });
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 200);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, []);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 h-7 rounded-md cursor-pointer',
          'transition-all duration-150 ease-out',
          'hover:brightness-95 hover:-translate-y-[calc(50%+2px)] hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          isSelected && 'ring-2 shadow-lg z-10'
        )}
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 3)}%`,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          isolation: 'isolate',
          borderLeft: `3px solid ${borderColor}`,
          background: bgColor,
          '--tw-ring-color': borderColor,
        } as React.CSSProperties}
      >
        {/* Progress fill — absolute background layer */}
        {item.progress > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(100, item.progress)}%`,
              background: fillColor,
              borderRadius: '6px 0 0 6px',
              zIndex: 0,
            }}
          />
        )}

        {/* Label — normal flex child above fill */}
        {width > 6 && (
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
              lineHeight: '28px',
              pointerEvents: 'none',
            }}
          >
            {width > 12 ? item.title : item.request_key}
          </span>
        )}

        {/* Completed indicator */}
        {item.progress === 100 && (
          <div
            className="absolute -right-1 -top-1 w-4 h-4 rounded-full flex items-center justify-center border-2"
            style={{
              backgroundColor: catalystTokens.status.success.base,
              borderColor: 'var(--background)',
              zIndex: 2,
            }}
          >
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Tooltip — portal to body */}
      {showTooltip && createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            zIndex: 9999,
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '10px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            pointerEvents: 'none',
            maxWidth: '340px',
            minWidth: '280px',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#18181b' }}>
              {item.request_key}: {item.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#71717a' }}>
              <Calendar className="w-3 h-3" />
              {formatDate(item.start_date)} → {formatDate(item.end_date)}
            </div>
            {item.process_step && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    borderRadius: '12px',
                    backgroundColor: barColors.bg,
                    color: barColors.border,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: barColors.border }} />
                  {STATUS_CONFIG[item.process_step]?.label || item.process_step}
                </span>
              </div>
            )}
            {item.progress > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '80px', height: '6px', backgroundColor: '#f4f4f5', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.progress}%`, backgroundColor: barColors.border, borderRadius: '9999px' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#18181b' }}>{item.progress}%</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Unscheduled indicator for items without dates
 */
interface RoadmapUnscheduledIndicatorProps {
  item: RoadmapDemand;
  onSetDates?: () => void;
}

export function RoadmapUnscheduledIndicator({ item, onSetDates }: RoadmapUnscheduledIndicatorProps) {
  const { tokens } = useRoadmapTheme();
  const barColors = getBarColors(item.process_step);

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: barColors.border }} />
      <span className="text-sm italic" style={{ color: tokens.text.muted }}>No dates set</span>
      <button
        onClick={(e) => { e.stopPropagation(); onSetDates?.(); }}
        className="text-xs font-medium transition-colors hover:underline"
        style={{ color: catalystTokens.brand.primary }}
      >
        + Set dates
      </button>
    </div>
  );
}
