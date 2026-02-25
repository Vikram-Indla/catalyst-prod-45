/**
 * Timeline bar representing an initiative
 * Color = initiative type (Project=blue, Enhancement=teal, Improvement=amber)
 * Overdue items override to red
 */

import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import type { RoadmapDemand } from '../types/roadmap';
import { format, parseISO } from 'date-fns';

const TYPE_COLORS: Record<string, string> = {
  project: '#2563EB',
  enhancement: '#0D9488',
  improvement: '#D97706',
};

interface RoadmapTimelineBarProps {
  item: RoadmapDemand;
  left: number;
  width: number;
  isSelected: boolean;
  onClick: () => void;
}

export function RoadmapTimelineBar({ item, left, width, isSelected, onClick }: RoadmapTimelineBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const typeKey = (item as any).initiative_type_key || 'project';
  const barColor = TYPE_COLORS[typeKey] || '#94A3B8';

  // Check overdue
  const isOverdue = (() => {
    if (!item.end_date) return false;
    if (['completed', 'cancelled', 'delivered', 'closed'].includes(item.process_step || '')) return false;
    if (item.progress >= 100) return false;
    return new Date(item.end_date) < new Date();
  })();

  const finalColor = isOverdue ? '#EF4444' : barColor;
  const isPlanned = item.process_step === 'approved' || item.process_step === 'under_review';

  const formatDate = (d: string | null) => {
    if (!d) return 'Not set';
    try { return format(parseISO(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const tw = 300;
    let x = rect.left + rect.width / 2 - tw / 2;
    let y = rect.top - 140;
    if (y < 60) y = rect.bottom + 8;
    if (x < 10) x = 10;
    if (x + tw > window.innerWidth - 10) x = window.innerWidth - tw - 10;
    setTooltipPos({ x, y });
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 250);
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
        onKeyDown={e => e.key === 'Enter' && onClick()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded cursor-pointer',
          'transition-all duration-150 ease-out',
          'hover:-translate-y-[calc(50%+2px)] hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          isSelected && 'ring-2 shadow-lg z-10'
        )}
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 3)}%`,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: finalColor,
          opacity: isPlanned ? 0.55 : 1,
          border: isPlanned ? `2px dashed ${finalColor}` : 'none',
          '--tw-ring-color': finalColor,
          transform: isHovered ? 'translateY(calc(-50% - 2px)) scaleY(1.08)' : undefined,
          boxShadow: isHovered ? `0 4px 12px ${finalColor}40` : undefined,
        } as React.CSSProperties}
      >
        {/* Progress fill */}
        {item.progress > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 rounded-l"
            style={{ width: `${Math.min(100, item.progress)}%`, background: 'rgba(255,255,255,0.3)', zIndex: 0 }}
          />
        )}

        {/* Label */}
        {width > 6 && (
          <span
            className="relative truncate"
            style={{ zIndex: 1, fontSize: 12, fontWeight: 600, color: '#FFFFFF', paddingLeft: 8, paddingRight: 8, lineHeight: '28px' }}
          >
            {width > 12 ? item.title.substring(item.title.indexOf(' - ') > 0 ? item.title.indexOf(' - ') + 3 : 0) : item.request_key}
          </span>
        )}

        {/* Progress pill */}
        {item.progress > 0 && width > 15 && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '1px 6px', zIndex: 2 }}
          >
            {item.progress}%
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && createPortal(
        <div style={{
          position: 'fixed', left: tooltipPos.x, top: tooltipPos.y, zIndex: 9999,
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)', pointerEvents: 'none',
          maxWidth: 320, minWidth: 260, padding: 12,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 6 }}>
            {item.request_key}: {item.title.substring(item.title.indexOf(' - ') > 0 ? item.title.indexOf(' - ') + 3 : 0)}
          </div>
          <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
            <Calendar className="w-3 h-3" />
            {formatDate(item.start_date)} → {formatDate(item.end_date)}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: finalColor }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#334155' }}>
              {(item as any).initiative_type_label || typeKey}
            </span>
            {item.progress > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <div style={{ width: 60, height: 4, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${item.progress}%`, height: '100%', background: finalColor, borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{item.progress}%</span>
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
 * Unscheduled indicator
 */
interface RoadmapUnscheduledIndicatorProps {
  item: RoadmapDemand;
  onSetDates?: () => void;
}

export function RoadmapUnscheduledIndicator({ item, onSetDates }: RoadmapUnscheduledIndicatorProps) {
  const typeKey = (item as any).initiative_type_key || 'project';
  const color = TYPE_COLORS[typeKey] || '#94A3B8';

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span style={{ fontSize: 12, fontStyle: 'italic', color: '#94A3B8' }}>No dates set</span>
      <button onClick={e => { e.stopPropagation(); onSetDates?.(); }} style={{ fontSize: 12, fontWeight: 500, color: '#2563EB' }} className="hover:underline">
        + Set dates
      </button>
    </div>
  );
}
